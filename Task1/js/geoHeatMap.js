import HistogramChart from './histogramChart.js';
import { Legend } from './colorLegend.js';

export default class MapVisualization {
    constructor(svgContainerId, geojsonPath, csvData) {
        this.svgContainerId = svgContainerId;
        this.geojsonPath = geojsonPath;
        this.csvData = csvData;
        this.projection = d3.geoMercator()
            .scale(57000)
            .translate([295, 250])
            .center([103.851959, 1.290270]);
        this.geoGenerator = d3.geoPath().projection(this.projection);

        this.initVis();
    }

    initVis() {
        // Load and render the GeoJSON, CSV, and lookup JSON data
        Promise.all([
            d3.json(this.geojsonPath)
        ]).then(([geojson]) => {
            this.geojson = geojson;
            this.wrangleData();
        }).catch(error => {
            console.error('Error loading the data files:', error);
        });
    }

    wrangleData() {
        const selectedProperty = $("#propertyName").val();
        const selectedDistrict = $("#districtName").val();

        const tenureRange = $("#tenureSlider").slider("values");
        const [minTenure, maxTenure] = tenureRange;
        const sliderMax = $("#tenureSlider").slider("option", "max");

        let filteredData = this.csvData;

        if (selectedProperty && selectedProperty !== "all") {
            filteredData = filteredData.filter(row => row["Project Name"] === selectedProperty);
        }

        if (selectedDistrict && selectedDistrict !== "all") {
            filteredData = filteredData.filter(row => row["Postal District"] === selectedDistrict);
        }

        if (!isNaN(minTenure) && !isNaN(maxTenure)) {
            filteredData = filteredData.filter(row => {
                const leaseEndYear = row["Lease End Year"];
                return leaseEndYear >= minTenure &&
                    leaseEndYear <= maxTenure;
            });
        }

        this.districtAverages = this.calculateAveragePricesByDistrict(filteredData);

        this.geojson.features.forEach(feature => {
            const postalDistrict = feature.properties.postal_district.toString();

            feature.properties.avgTransactedPrice = postalDistrict
                ? parseFloat(this.districtAverages[postalDistrict] || 0)
                : null;

            const matchingRow = filteredData.find(row => row["Postal District"] === postalDistrict);
            feature.properties.districtName = matchingRow ? matchingRow["District Name"] : "Unknown";
        });

        this.updateVis();
    }

    calculateAveragePricesByDistrict(csvData) {
        const districtPrices = {};

        csvData.forEach(d => {
            const district = d['Postal District'];
            const price = parseFloat(d['Transacted Price ($)']);

            if (!districtPrices[district]) {
                districtPrices[district] = { total: 0, count: 0 };
            }

            districtPrices[district].total += price;
            districtPrices[district].count += 1;
        });

        const districtAverages = {};
        for (const district in districtPrices) {
            districtAverages[district] = (
                districtPrices[district].total / districtPrices[district].count
            ).toFixed(2);
        }

        return districtAverages;
    }

    handleMouseover(event, d) {
        const district = d.properties.postal_district;
        const districtName = d.properties.districtName || 'Unknown';
        const avgTransactedPrice = d.properties.avgTransactedPrice || 'N/A';
        const bounds = this.geoGenerator.bounds(d);
        const centroid = this.geoGenerator.centroid(d);

        const tooltip = d3.select(`${this.svgContainerId} .info`)
            .html(`
            <span class="badge badge-pill badge-info">Postal District: ${district}</span>
            <span class="badge badge-pill badge-info">District Name: ${districtName}</span>
            <span class="badge badge-pill badge-info">Avg Transacted Price: $${avgTransactedPrice}</span>
            <h4 class="mt-5 text-base text-gray-200 text-center font-semibold">Avg Unit Price by Area (sqm)</h4>
            <svg id="histogram-chart" width="500" height="300"></svg>
        `)
            .style('display', 'inline-block')
            .style('position', 'absolute')
            .style('left', `${event.clientX}px`)
            .style('top', `${event.clientY}px`);

        this.adjustTooltipPosition(event, tooltip);

        if (districtName !== 'Unknown') {
            const filteredData = this.csvData.filter(row =>
                row['Postal District'] === district.toString()
            );

            const histogramChart = new HistogramChart(
                '#histogram-chart',
                filteredData,
                'Area (SQM)',
                'Unit Price ($ PSM)'
            );
        }

        d3.select(`${this.svgContainerId} .bounding-box rect`)
            .attr('x', bounds[0][0])
            .attr('y', bounds[0][1])
            .attr('width', bounds[1][0] - bounds[0][0])
            .attr('height', bounds[1][1] - bounds[0][1])
            .style('stroke', 'red')
            .style('stroke-width', '2px')
            .style('stroke-dasharray', '5,5')
            .style('fill', 'none');

        d3.select(`${this.svgContainerId} .centroid`)
            .attr('transform', `translate(${centroid})`)
            .style('display', 'inline')
            .style('fill', 'red')
            .style('r', '5');
    }

    handleMouseout() {
        d3.select(`${this.svgContainerId} .info`).style('display', 'none');
        d3.select(`${this.svgContainerId} .bounding-box rect`).attr('width', 0).attr('height', 0);
        d3.select(`${this.svgContainerId} .centroid`).style('display', 'none');
    }

    adjustTooltipPosition(event, tooltip) {
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;

        const tooltipWidth = 500;
        const tooltipHeight = 600;
        const padding = 10;

        const mouseX = event.clientX;
        const mouseY = event.clientY;

        let left = mouseX + padding;
        let top = mouseY - tooltipHeight; // Adjusted to make tooltip appear slightly above
        left += scrollX;
        top += scrollY;

        tooltip
            .style('position', 'absolute')
            .style('left', `${left}px`)
            .style('top', `${top - 150}px`)
            .style('width', `${tooltipWidth}px`)
            .style('max-height', `${tooltipHeight}px`)
            .style('overflow', 'auto')
            .style('pointer-events', 'none')
            .style('background-color', '#1f1f1f')
            .style('color', '#e0e0e0')
            .style('border', '1px solid #333')
            .style('border-radius', '8px')
            .style('padding', '15px')
            .style('box-shadow', '0 4px 15px rgba(0, 0, 0, 0.5)')
            .style('z-index', '9999'); // Increased z-index to ensure it appears above all cards
    }

    updateVis() {
        // creating the a scale for the heatmap
        const avgPrices = Object.values(this.districtAverages).map(Number);
        const colorScale = d3.scaleSequential(d3.interpolateBlues)
            .domain([d3.min(avgPrices), d3.max(avgPrices)]);

        console.log("avg prices", avgPrices)

        const mapGroup = d3.select(`${this.svgContainerId} g.map`);

        // using this to render the paths for the maps
        mapGroup
            .selectAll('path')
            .data(this.geojson.features)
            .join('path')
            .attr('d', this.geoGenerator)
            .style('fill', d => {
                const avgPrice = d.properties.avgTransactedPrice;
                return avgPrice ? colorScale(avgPrice) : '#ccc';
            })
            .on('mouseover', (event, d) => this.handleMouseover(event, d))
            .on('mouseout', () => this.handleMouseout())
            .style('cursor', 'pointer');


        // adding all the text labels on the map for better readability by the user
        mapGroup
            .selectAll('.district-label')
            .data(this.geojson.features.filter(d => d.properties.postal_district !== 'Unknown'))
            .join('text')
            .attr('class', 'district-label')
            .attr('x', d => this.geoGenerator.centroid(d)[0])
            .attr('y', d => this.geoGenerator.centroid(d)[1])
            .attr('text-anchor', 'middle')
            .attr('alignment-baseline', 'middle')
            .text(d => d.properties.postal_district)
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .style('fill', 'black')
            .style('stroke', 'white')
            .style('stroke-width', '0.5px')
            .style('pointer-events', 'none');

        const legendNode = Legend(d3.scaleSequential(d3.interpolateBlues) // Example color scale
            .domain([d3.min(avgPrices), d3.max(avgPrices)]), // Adjust domain as per your data
            {
                title: "Average Transacted Price",
                tickSize: 6,
                width: 320,
                height: 50, // Adjust height to your needs
                marginTop: 18,
                marginRight: 0,
                marginBottom: 16,
                marginLeft: 10,
                ticks: 5, // Adjust ticks to your needs
                tickFormat: d3.format('.2s')
            }
        );


        // this is done to clear the legend everytime it updates so that multiples legends are not added on every update
        d3.select(`${this.svgContainerId} .legend`)
            .html('')
            .append(() => legendNode);
    }

}
