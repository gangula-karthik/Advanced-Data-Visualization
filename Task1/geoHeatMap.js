export class MapVisualization {
    constructor(svgContainerId, geojsonPath, csvPath, lookupJsonPath) {
        // Initialize properties
        this.svgContainerId = svgContainerId;
        this.geojsonPath = geojsonPath;
        this.csvPath = csvPath;
        this.lookupJsonPath = lookupJsonPath;
        this.projection = d3.geoMercator()
            .scale(80000)
            .translate([310, 330])
            .center([103.851959, 1.290270]);
        this.geoGenerator = d3.geoPath().projection(this.projection);

        // Initialize the visualization
        this.initVis();
    }

    initVis() {
        // Load and render the GeoJSON, CSV, and lookup JSON data
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
        // Calculate average transacted prices by district
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

        // Calculate averages
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
            .attr('height', bounds[1][1] - bounds[0][1]);

        d3.select(`${this.svgContainerId} .centroid`)
            .attr('transform', `translate(${centroid})`)
            .style('display', 'inline');
    }

    handleMouseout() {
        d3.select(`${this.svgContainerId} .info`).style('display', 'none');
        d3.select(`${this.svgContainerId} .bounding-box rect`).attr('width', 0).attr('height', 0);
        d3.select(`${this.svgContainerId} .centroid`).style('display', 'none');
    }

    adjustTooltipPosition(event, tooltip) {
        const cardRect = document.querySelector(this.svgContainerId).getBoundingClientRect();
        const tooltipRect = tooltip.node().getBoundingClientRect();

        let left = event.clientX;
        let top = event.clientY;

        // Adjust position to keep the tooltip inside the card horizontally
        if (tooltipRect.right > cardRect.right) {
            left = event.clientX - (tooltipRect.width + 10);
        }
        if (tooltipRect.left < cardRect.left) {
            left = cardRect.left;
        }

        // Adjust position to keep the tooltip inside the card vertically
        if (tooltipRect.bottom > cardRect.bottom) {
            top = event.clientY - (tooltipRect.height + 10);
        }
        if (tooltipRect.top < cardRect.top) {
            top = cardRect.top;
        }

        // Apply calculated position
        tooltip.style('left', `${left}px`)
            .style('top', `${top}px`)
            .style('max-width', `${cardRect.width}px`)
            .style('max-height', `${cardRect.height}px`)
            .style('overflow', 'auto');
    }

    updateVis() {
        // Create a scale for the heatmap
        const avgPrices = Object.values(this.districtAverages).map(Number);
        const colorScale = d3.scaleSequential(d3.interpolateOranges)
            .domain([d3.min(avgPrices), d3.max(avgPrices)]);

        // Bind CSV data to GeoJSON features and map postal district
        this.geojson.features.forEach(feature => {
            const planningArea = feature.properties.planning_area;
            feature.properties.postalDistrict = this.mapPlanningAreaToPostalDistrict(planningArea);

            const postalDistrict = feature.properties.postalDistrict;
            feature.properties.avgTransactedPrice = postalDistrict ? this.districtAverages[postalDistrict] : null;
        });

        // Render the map paths
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
