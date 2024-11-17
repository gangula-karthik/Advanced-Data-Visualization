export default class BarChart {
    constructor(divId, data) {
        this.divId = divId;
        this.data = data;

        // Get container dimensions
        this.container = d3.select(this.divId).node();
        this.containerWidth = this.container.getBoundingClientRect().width;
        this.containerHeight = this.container.getBoundingClientRect().height;

        // Set adjusted dimensions for the bar chart
        this.margin = { top: 10, right: 20, bottom: 40, left: 40 };
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
            .attr("transform", `translate(${this.margin.left},${this.margin.top - 35})`);

        // Ensure the Value field is converted to a number
        this.data.forEach(d => {
            d.Value = +d.Value;
        });

        // Initialize scales and axes
        this.initScales();
        this.initAxes();
        this.updateVis();
    }

    initScales() {
        // X scale
        this.xScale = d3.scaleBand()
            .range([0, this.width])
            .domain(this.data.map(d => d.key))
            .padding(0.2);

        // Y scale
        this.yScale = d3.scaleLinear()
            .domain([0, d3.max(this.data, d => d.Value)])
            .range([this.height, 0]);

        // Color scale
        this.colorScale = d3.scaleOrdinal(d3.schemeTableau10)
            .domain(this.data.map(d => d.key));
    }

    initAxes() {
        // X axis
        this.svg.append("g")
            .attr("transform", `translate(0,${this.height})`)
            .call(d3.axisBottom(this.xScale))
            .selectAll("text")
            .attr("transform", "translate(-10,0)rotate(-45)")
            .style("text-anchor", "end")
            .style("font-size", "10px");

        // Y axis
        this.svg.append("g")
            .call(d3.axisLeft(this.yScale));
    }

    updateVis() {
        // Bars
        this.svg.selectAll("rect")
            .data(this.data)
            .enter()
            .append("rect")
            .attr("x", d => this.xScale(d.key))
            .attr("y", d => this.yScale(d.Value))
            .attr("width", this.xScale.bandwidth())
            .attr("height", d => this.height - this.yScale(d.Value))
            .attr("fill", d => this.colorScale(d.key));
    }
}
