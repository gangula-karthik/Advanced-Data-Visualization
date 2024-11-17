export function barChart(divId, data) {

    const container = d3.select(divId).node()
    const containerWidth = container.getBoundingClientRect().width;
    const containerHeight = container.getBoundingClientRect().height;

    // Adjusted dimensions to make the bar chart slightly bigger and pushed up
    const margin = { top: 20, right: 20, bottom: 50, left: 40 },
        width = containerWidth - margin.left - margin.right,
        height = containerHeight - margin.top - margin.bottom; // Reduced height to push the chart up

    // Append the SVG object to the specified div
    const svg = d3.select(divId)
        .append("svg")
        .attr("viewBox", `0 0 ${containerWidth} ${containerHeight}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "100%")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top - 20})`) // Adjusted transform to push the chart up

    // Ensure the Value field is converted to a number
    data.forEach(d => {
        d.Value = +d.Value;
    });

    // X axis
    const x = d3.scaleBand()
        .range([0, width])
        .domain(data.map(d => d.key))
        .padding(0.2);

    svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end")
        .style("font-size", "10px"); // Adjusted font size to prevent labels from spilling out

    // Y axis
    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.Value)])
        .range([height, 0]);

    svg.append("g")
        .call(d3.axisLeft(y));

    // Bars
    svg.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", d => x(d.key))
        .attr("y", d => y(d.Value))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.Value))
        .attr("fill", "#69b3a2");

    return svg;
}