export default class DonutChart {
    constructor(svgContainerId, data, columnToAggregate) {
        this.svgContainerId = svgContainerId;
        this.data = data;
        this.columnToAggregate = columnToAggregate; // The column name you want to aggregate

        this.width = 200;  // Fixed small width
        this.height = 200; // Fixed small height
        this.margin = 20;  // Minimal margin to save space

        // Calculate the radius
        this.radius = Math.min(this.width, this.height) / 2 - this.margin;

        // Create the SVG container
        this.initVis();
    }

    initVis() {
        // Append the SVG object to the container
        this.svg = d3.select(this.svgContainerId)
            .append("svg")
            .attr("width", `${this.width}px`)
            .attr("height", `${this.height}px`)
            .attr("viewBox", `0 0 ${this.width} ${this.height}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("display", "block")
            .style("margin", "auto")
            .append("g")
            .attr("transform", `translate(${this.width / 2}, ${this.height / 2 - 15})`);

        // Set the color scale
        this.colorScale = d3.scaleOrdinal(d3.schemeTableau10);

        // Compute the position of each group on the pie
        this.pieGenerator = d3.pie()
            .value(d => d.value);

        // Define the arc generator
        this.arcGenerator = d3.arc()
            .innerRadius(this.radius * 0.5)
            .outerRadius(this.radius);

        this.wrangleData();
    }

    wrangleData() {
        // Group the data based on the specified column and count the occurrences
        const groupedData = d3.rollups(
            this.data,
            v => v.length,
            d => d[this.columnToAggregate] // Use the column name for aggregation
        ).map(([key, value]) => ({ key, value }));

        // Prepare the data for the pie layout
        this.dataReady = this.pieGenerator(groupedData);

        this.updateVis();
    }

    updateVis() {
        // Build the donut chart
        this.svg
            .selectAll('g.slice')
            .data(this.dataReady)
            .enter()
            .append('g')
            .attr('class', 'slice')
            .append('path')
            .attr('d', this.arcGenerator)
            .attr('fill', d => this.colorScale(d.data.key));
    }
}
