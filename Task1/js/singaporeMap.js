const projection = d3.geoMercator()
    .scale(75000)  // Increase scale for a smaller area
    .translate([310, 330]) // Adjusted translate to push the map slightly below
    .center([103.851959, 1.290270]); // Singapore's approximate central coordinates

const geoGenerator = d3.geoPath()
    .projection(projection);

function handleMouseover(e, d) {
    const pixelArea = geoGenerator.area(d);
    const bounds = geoGenerator.bounds(d);
    const centroid = geoGenerator.centroid(d);
    const measure = geoGenerator.measure(d);
    const tooltip = d3.select('#content .info')
        .text(`${d.properties.planning_area} (${d.properties.district}) [area = ${pixelArea.toFixed(1)} measure = ${measure.toFixed(1)}]`)
        .style('display', 'inline')
        .style('left', `${e.clientX}px`)
        .style('top', `${e.clientY}px`);

    // Adjust tooltip position to be within the card
    const cardRect = document.getElementById('content').getBoundingClientRect();
    const tooltipRect = tooltip.node().getBoundingClientRect();
    if (tooltipRect.right > cardRect.right) {
        tooltip.style('left', `${e.clientX - (tooltipRect.width + 10)}px`);
    }
    if (tooltipRect.bottom > cardRect.bottom) {
        tooltip.style('top', `${e.clientY - (tooltipRect.height + 10)}px`);
    }

    d3.select('#content .bounding-box rect')
        .attr('x', bounds[0][0])
        .attr('y', bounds[0][1])
        .attr('width', bounds[1][0] - bounds[0][0])
        .attr('height', bounds[1][1] - bounds[0][1]);

    d3.select('#content .centroid')
        .attr('transform', 'translate(' + centroid + ')')
        .style('display', 'inline');
}

function handleMouseout() {
    d3.select('#content .info')
        .style('display', 'none');
}

function update(geojson) {
    const u = d3.select('#content g.map')
        .selectAll('path')
        .data(geojson.features);

    u.enter()
        .append('path')
        .attr('d', geoGenerator)
        .on('mouseover', handleMouseover)
        .on('mouseout', handleMouseout)
        .style('cursor', 'pointer');

    u.exit().remove();
}

d3.json('./data/district_and_planning_area.geojson')
    .then(function (json) {
        update(json);
        console.log(json)
    })
    .catch(function (error) {
        console.error("Error loading the GeoJSON data: ", error);
        d3.select('#content .info')
            .text('Failed to load Singapore map data');
    });