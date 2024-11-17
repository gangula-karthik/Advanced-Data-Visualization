export default class MapVisualization {
    constructor(svgContainerId, geojsonPath, csvPath, lookupJsonPath) {
        this.svgContainerId = svgContainerId;
        this.geojsonPath = geojsonPath;
        this.csvPath = csvPath;
        this.lookupJsonPath = lookupJsonPath;
        this.projection = d3.geoMercator()
            .scale(57000)
            .translate([295, 250])
            .center([103.851959, 1.290270]);
        this.geoGenerator = d3.geoPath().projection(this.projection);

        this.initVis();
    }

    initVis() {
        // load and render the GeoJSON, CSV, and lookup JSON data
        Promise.all([
            d3.json(this.geojsonPath),
            d3.csv(this.csvPath),
            d3.json(this.lookupJsonPath)
        ]).then(([geojson, csvData, lookupJson]) => {
            this.geojson = geojson;
            this.csvData = csvData;
            this.lookupJson = lookupJson;
            this.wrangleData();
        }).catch(error => {
            console.error('Error loading the data files:', error);
        });
    }

    wrangleData() {
        // calculate average transacted prices by district
        this.districtAverages = this.calculateAveragePricesByDistrict(this.csvData);
        this.updateVis();
    }

    calculateAveragePricesByDistrict(csvData) {
        const districtPrices = {};

        csvData.forEach(d => {
            const district = d['Postal District'];
            const price = parseFloat(d['Transacted Price ($)'].replace(',', ''));
            if (!districtPrices[district]) {
                districtPrices[district] = { total: 0, count: 0 };
            }
            districtPrices[district].total += price;
            districtPrices[district].count += 1;
        });

        // calculate the average price
        const districtAverages = {};
        for (const district in districtPrices) {
            districtAverages[district] = (districtPrices[district].total / districtPrices[district].count).toFixed(2);
        }

        return districtAverages;
    }

    mapPlanningAreaToPostalDistrict(planningArea) {
        const districtKeys = Object.keys(this.lookupJson);
        for (const districtKey of districtKeys) {
            const locations = this.lookupJson[districtKey]['General Location'];
            if (locations.includes(planningArea)) {
                return districtKey;
            }
        }
        return null;
    }

    handleMouseover(event, d) {
        const { planning_area, district, postalDistrict } = d.properties;
        const avgTransactedPrice = d.properties.avgTransactedPrice || 'N/A';
        const pixelArea = this.geoGenerator.area(d).toFixed(1);
        const measure = this.geoGenerator.measure(d).toFixed(1);
        const bounds = this.geoGenerator.bounds(d);
        const centroid = this.geoGenerator.centroid(d);

        const tooltip = d3.select(`${this.svgContainerId} .info`)
            .text(`${planning_area} (${district}) - District: ${postalDistrict} - Avg Transacted Price: $${avgTransactedPrice} [area = ${pixelArea} measure = ${measure}]`)
            .style('display', 'inline')
            .style('left', `${event.clientX}px`)
            .style('top', `${event.clientY}px`);

        this.adjustTooltipPosition(event, tooltip);

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
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;

        const tooltipWidth = 300;
        const tooltipHeight = 150;
        const padding = 10;
        const verticalOffset = 30;

        const mouseX = event.clientX;
        const mouseY = event.clientY;

        let left = mouseX + padding;
        let top = mouseY - tooltipHeight - verticalOffset;

        if (left + tooltipWidth > viewportWidth - padding) {
            left = mouseX - tooltipWidth - padding;
        }

        if (left < padding) {
            left = padding;
        }

        if (top < padding) {
            top = mouseY + verticalOffset;
        }

        if (top + tooltipHeight > viewportHeight - padding) {
            top = Math.max(padding, mouseY - tooltipHeight - verticalOffset);
        }

        left += scrollX;
        top += scrollY;

        tooltip
            .style('position', 'absolute')
            .style('left', `${left}px`)
            .style('top', `${top}px`)
            .style('width', `${tooltipWidth}px`)
            .style('max-height', `${tooltipHeight}px`)
            .style('overflow', 'auto')
            .style('pointer-events', 'none')
    }

    updateVis() {
        // create a scale for the heatmap
        const avgPrices = Object.values(this.districtAverages).map(Number);
        const colorScale = d3.scaleSequential(d3.interpolateViridis)
            .domain([d3.min(avgPrices), d3.max(avgPrices)]);

        // bind the CSV data to GeoJSON features and map postal district
        this.geojson.features.forEach(feature => {
            const planningArea = feature.properties.planning_area;
            feature.properties.postalDistrict = this.mapPlanningAreaToPostalDistrict(planningArea);

            const postalDistrict = feature.properties.postalDistrict;
            feature.properties.avgTransactedPrice = postalDistrict ? this.districtAverages[postalDistrict] : null;
        });

        // render the map paths
        d3.select(`${this.svgContainerId} g.map`)
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
    }
}
