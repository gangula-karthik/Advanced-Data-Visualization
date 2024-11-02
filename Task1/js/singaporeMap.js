export function renderMap(svgContainerId, geojsonPath) {
    // Set up the projection for the map
    const projection = d3.geoMercator()
        .scale(80000)
        .translate([310, 330])
        .center([103.851959, 1.290270]);

    const geoGenerator = d3.geoPath().projection(projection);

    // Define the mouseover event handler
    function handleMouseover(e, d) {
        const { planning_area, district } = d.properties;
        const pixelArea = geoGenerator.area(d).toFixed(1);
        const measure = geoGenerator.measure(d).toFixed(1);
        const bounds = geoGenerator.bounds(d);
        const centroid = geoGenerator.centroid(d);

        const tooltip = d3.select(`${svgContainerId} .info`)
            .text(`${planning_area} (${district}) [area = ${pixelArea} measure = ${measure}]`)
            .style('display', 'inline')
            .style('left', `${e.clientX}px`)
            .style('top', `${e.clientY}px`);

        adjustTooltipPosition(e, tooltip);

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
    function adjustTooltipPosition(e, tooltip) {
        const cardRect = document.querySelector(svgContainerId).getBoundingClientRect();
        const tooltipRect = tooltip.node().getBoundingClientRect();

        let left = e.clientX;
        let top = e.clientY;

        // Adjust position to keep the tooltip inside the card horizontally
        if (tooltipRect.right > cardRect.right) {
            left = e.clientX - (tooltipRect.width + 10);
        }
        if (tooltipRect.left < cardRect.left) {
            left = cardRect.left;
        }

        // Adjust position to keep the tooltip inside the card vertically
        if (tooltipRect.bottom > cardRect.bottom) {
            top = e.clientY - (tooltipRect.height + 10);
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

    // Update function to render the map paths
    function update(geojson) {
        const paths = d3.select(`${svgContainerId} g.map`)
            .selectAll('path')
            .data(geojson.features)
            .join('path')
            .attr('d', geoGenerator)
            .on('mouseover', handleMouseover)
            .on('mouseout', handleMouseout)
            .style('cursor', 'pointer');

        return paths;
    }

    // Load and render the GeoJSON data
    d3.json(geojsonPath)
        .then(geojson => {
            update(geojson);
        })
        .catch(error => {
            console.error('Error loading the geojson file:', error);
        });
}