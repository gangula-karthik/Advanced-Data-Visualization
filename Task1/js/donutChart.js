d3.csv("./data/CommercialTrans_201910 to 202410.csv", (error, data) => {
    if (error) throw error;

    // Convert 'Land Type' to lowercase for consistency
    data.forEach(d => {
        d["Land Type"] = d["Land Type"].toLowerCase();
    });

    // Group data by 'Land Type'
    const landTypeGroups = d3.nest()
        .key(d => d["Land Type"])
        .rollup((values) => values.length)
        .entries(data);

    // Set up the color scale
    const colorScale = d3.scaleOrdinal()
        .domain(landTypeGroups.map(d => d.key))
        .range(d3.schemeCategory10);

    // Set up the pie chart
    const pie = d3.pie()
        .value(d => d.value);

    // Set up the arc
    const arc = d3.arc()
        .outerRadius(100)
        .innerRadius(50);

    // Select the SVG element
    const svg = d3.select("#donutChart1")
        .append("svg")
        .attr("width", 200)
        .attr("height", 200)
        .append("g")
        .attr("transform", "translate(100,100)");

    // Generate the arcs
    svg.selectAll("path")
        .data(pie(landTypeGroups))
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", d => colorScale(d.data.key));

    // Add a legend
    const legend = svg.selectAll(".legend")
        .data(landTypeGroups)
        .enter()
        .append("text")
        .attr("x", 120)
        .attr("y", (d, i) => i * 20 + 20)
        .text(d => d.key + " (" + d.value + ")")
        .style("font-size", "10px");
});