export function renderMap(svgContainerId, geojsonPath, csvPath, lookupJsonPath) {
    // Set up the projection for the map
    const projection = d3.geoMercator()
        .scale(80000)
        .translate([310, 330])
        .center([103.851959, 1.290270]);

    const geoGenerator = d3.geoPath().projection(projection);

    // Define the mouseover event handler
    function handleMouseover(event, d) {
        const { planning_area, district, postalDistrict } = d.properties;
        const avgTransactedPrice = d.properties.avgTransactedPrice || 'N/A';
        const pixelArea = geoGenerator.area(d).toFixed(1);
        const measure = geoGenerator.measure(d).toFixed(1);
        const bounds = geoGenerator.bounds(d);
        const centroid = geoGenerator.centroid(d);

        const tooltip = d3.select(`${svgContainerId} .info`)
            .text(`${planning_area} (${district}) - District: ${postalDistrict} - Avg Transacted Price: $${avgTransactedPrice} [area = ${pixelArea} measure = ${measure}]`)
            .style('display', 'inline')
            .style('left', `${event.clientX}px`)
            .style('top', `${event.clientY}px`);

        adjustTooltipPosition(event, tooltip);

        d3.select(`${svgContainerId} .bounding-box rect`)
            .attr('x', bounds[0][0])
            .attr('y', bounds[0][1])
            .attr('width', bounds[1][0] - bounds[0][0])
            .attr('height', bounds[1][1] - bounds[0][1]);

        d3.select(`${svgContainerId} .centroid`)
            .attr('transform', `translate(${centroid})`)
            .style('display', 'inline');
    }

    // Define the mouseout event handler
    function handleMouseout() {
        d3.select(`${svgContainerId} .info`).style('display', 'none');
        d3.select(`${svgContainerId} .bounding-box rect`).attr('width', 0).attr('height', 0);
        d3.select(`${svgContainerId} .centroid`).style('display', 'none');
    }

    // Adjust tooltip position to stay within the container
    function adjustTooltipPosition(event, tooltip) {
        const cardRect = document.querySelector(svgContainerId).getBoundingClientRect();
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

    // Function to map planning_area to postal district key
    function mapPlanningAreaToPostalDistrict(planningArea, lookupJson) {
        const districtKeys = Object.keys(lookupJson);
        for (const districtKey of districtKeys) {
            const locations = lookupJson[districtKey]['General Location'];
            if (locations.includes(planningArea)) {
                return districtKey;
            }
        }
        return null;
    }

    // Function to calculate average transacted prices by postal district
    function calculateAveragePricesByDistrict(csvData) {
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

    // Update function to render the map paths with heatmap coloring
    function update(geojson, csvData, lookupJson) {
        // Calculate average transacted prices by district
        const districtAverages = calculateAveragePricesByDistrict(csvData);
        console.log(districtAverages)

        // Create a scale for the heatmap
        const avgPrices = Object.values(districtAverages).map(Number);
        const colorScale = d3.scaleSequential(d3.interpolateOranges)
            .domain([d3.min(avgPrices), d3.max(avgPrices)]);

        // Bind CSV data to GeoJSON features and map postal district
        geojson.features.forEach(feature => {
            const planningArea = feature.properties.planning_area;
            feature.properties.postalDistrict = mapPlanningAreaToPostalDistrict(planningArea, lookupJson);

            const postalDistrict = feature.properties.postalDistrict;
            feature.properties.avgTransactedPrice = postalDistrict ? districtAverages[postalDistrict] : null;
        });

        // Render the map paths
        const paths = d3.select(`${svgContainerId} g.map`)
            .selectAll('path')
            .data(geojson.features)
            .join('path')
            .attr('d', geoGenerator)
            .style('fill', d => {
                const avgPrice = d.properties.avgTransactedPrice;
                return avgPrice ? colorScale(avgPrice) : '#ccc';
            })
            .on('mouseover', handleMouseover)
            .on('mouseout', handleMouseout)
            .style('cursor', 'pointer');

        return paths;
    }

    // Load and render the GeoJSON, CSV, and lookup JSON data
    Promise.all([d3.json(geojsonPath), d3.csv(csvPath), d3.json(lookupJsonPath)])
        .then(([geojson, csvData, lookupJson]) => {
            update(geojson, csvData, lookupJson);
        })
        .catch(error => {
            console.error('Error loading the data files:', error);
        });
}
