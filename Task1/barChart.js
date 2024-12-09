export default class BarChart {
    constructor(divId, data, xColumn, yColumn) {
        this.divId = divId;
        this.data = data;
        this.xColumn = xColumn;
        this.yColumn = yColumn;

        this.container = d3.select(this.divId).node();
        this.containerWidth = this.container.getBoundingClientRect().width;
        this.containerHeight = this.container.getBoundingClientRect().height;

        // Adjusted bottom margin for x-axis label spacing
        this.margin = { top: 10, right: 20, bottom: 60, left: 75 };
        this.width = this.containerWidth - this.margin.left - this.margin.right;
        this.height = this.containerHeight - this.margin.top - this.margin.bottom;

        this.initVis();
    }

    initVis() {
        // Append the SVG object to the container
        this.svg = d3.select(this.divId)
            .append("svg")
            .attr("viewBox", `0 0 ${this.containerWidth} ${this.containerHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("width", "100%")
            .style("height", "100%")
            .append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        // Group data by the xColumn and calculate the average of yColumn for each group
        const groupedData = d3.group(this.data, d => d[this.xColumn]);

        // Calculate average of yColumn for each group
        this.aggregatedData = Array.from(groupedData, ([key, values]) => ({
            [this.xColumn]: key,
            [this.yColumn]: d3.mean(values, d => d[this.yColumn])
        }));

        console.log("agg data:", this.aggregatedData);

        // Initialize scales and axes
        this.initScales();
        this.initAxes();

        // Wrangle data (this could be used for data formatting/validation if needed)
        this.wrangleData();
    }

    wrangleData() {
        // Update the chart (renders bars)
        this.updateVis();
    }

    initScales() {
        // X scale (category scale, band scale)
        this.xScale = d3.scaleBand()
            .range([0, this.width])
            .domain(this.aggregatedData.map(d => d[this.xColumn]))
            .padding(0.2);

        // Y scale (linear scale)
        this.yScale = d3.scaleLinear()
            .domain([0, d3.max(this.aggregatedData, d => d[this.yColumn])])
            .range([this.height, 0]);

        // Optional color scale for bar coloring
        this.colorScale = d3.scaleOrdinal(d3.schemeTableau10)
            .domain(this.aggregatedData.map(d => d[this.xColumn]));
    }

    initAxes() {
        // X axis
        this.svg.append("g")
            .attr("transform", `translate(0,${this.height})`)
            .call(d3.axisBottom(this.xScale))
            .selectAll("text")
            .attr("transform", "translate(-10,0)rotate(-45)")
            .style("text-anchor", "end")
            .style("font-size", "10px")
            .style("fill", "white"); // Changed X axis label color to white

        // Y axis
        this.svg.append("g")
            .call(d3.axisLeft(this.yScale).tickFormat(d => `$${d}`)) // Add dollar sign to each tick
            .selectAll("text")
            .style("fill", "white"); // Changed Y axis label color to white

        // X axis label
        this.svg.append("text")
            .attr("transform", `translate(${this.width / 2}, ${this.height + (this.margin.bottom / 2) + 25})`)
            .style("text-anchor", "middle")
            .style("font-size", "14px")
            .style("fill", "white") // Changed X axis label color to white
            .text(this.xColumn);

        // Y axis label
        this.svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -this.height / 2)
            .attr("y", -this.margin.left + 20)
            .style("text-anchor", "middle")
            .style("font-size", "14px")
            .style("fill", "white") // Changed Y axis label color to white
            .text(this.yColumn);
    }

    updateVis() {
        // Bars: Use the x and y columns dynamically
        const bars = this.svg.selectAll("rect")
            .data(this.aggregatedData);

        // Remove old bars (if any)
        bars.exit().remove();

        // Create new bars
        bars.enter()
            .append("rect")
            .attr("x", d => this.xScale(d[this.xColumn]))
            .attr("y", d => this.yScale(d[this.yColumn]))
            .attr("width", this.xScale.bandwidth())
            .attr("height", d => this.height - this.yScale(d[this.yColumn]))
            .attr("fill", d => this.colorScale(d[this.xColumn]));

        // Add average line
        const average = d3.mean(this.aggregatedData, d => d[this.yColumn]);
        this.svg.append("line")
            .attr("x1", 0)
            .attr("x2", this.width)
            .attr("y1", this.yScale(average))
            .attr("y2", this.yScale(average))
            .attr("stroke", "red")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,5")
            .attr("class", "average-line");

        // Add average label
        this.svg.append("text")
            .attr("x", this.width - 10)
            .attr("y", this.yScale(average) - 10)
            .attr("text-anchor", "end")
            .attr("font-size", "12px")
            .attr("fill", "red")
            .text("Average");
    }
}
