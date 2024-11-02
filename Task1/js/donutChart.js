function DonutChart(divId, data) {
    // Set smaller dimensions for the donut chart
    var width = 200,  // Set a fixed small width for the donut
        height = 200, // Set a fixed small height for the donut
        margin = 20;  // Minimal margin to save space

    // Calculate the radius based on the smaller of width or height, minus the margin
    var radius = Math.min(width, height) / 2 - margin;

    // Append the SVG object to the div with the specified id
    var svg = d3.select(divId)
        .append("svg")
        .attr("width", `${width}px`) // Fixed small width
        .attr("height", `${height}px`) // Fixed small height
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("display", "block") // Block display to avoid extra space around SVG
        .style("margin", "auto") // Center the SVG horizontally in the container
        .append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

    // Set the color scale
    var color = d3.scaleOrdinal()
        .domain(data.map(d => d.key))
        .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56"]);

    // Compute the position of each group on the pie
    var pie = d3.pie()
        .value(d => d.value);

    // Convert the data into a format suitable for pie layout
    var data_ready = pie(data);

    // Define the arc generator with smaller inner and outer radius for compactness
    var arc = d3.arc()
        .innerRadius(radius * 0.5) // Smaller inner radius
        .outerRadius(radius);

    // Build the pie chart by creating a group (<g>) for each slice
    svg
        .selectAll('g.slice')
        .data(data_ready)
        .enter()
        .append('g')
        .attr('class', 'slice')
        .append('path')
        .attr('d', arc)
        .attr('fill', d => color(d.data.key));

    return svg;
}
