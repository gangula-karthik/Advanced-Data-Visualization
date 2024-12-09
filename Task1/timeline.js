export default class TimelineBrush {
    constructor(svgContainerId, data, onBrush) {
        this.svgContainerId = svgContainerId;
        this.rawData = data;
        this.onBrush = onBrush;

        // Set dimensions based on the parent container
        const container = d3.select(this.svgContainerId).node();
        this.containerWidth = container.getBoundingClientRect().width;
        this.containerHeight = container.getBoundingClientRect().height;

        // Set margins
        this.margin = { top: 10, right: 30, bottom: 130, left: 30 }; // Adjust bottom margin for x-axis labels
        this.width = this.containerWidth - this.margin.left - this.margin.right;
        this.height = 200 - this.margin.top - this.margin.bottom; // Increase height for chart visibility

        // Initialize SVG and scales
        this.initVis();

        // Process and visualize data
        this.wrangleData();
    }

    initVis() {
        // Append SVG container
        this.svg = d3.select(this.svgContainerId)
            .append("svg")
            .attr("width", this.containerWidth)
            .attr("height", this.containerHeight)
            .append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        // Initialize scales
        this.xScale = d3.scaleTime().range([0, this.width]);
        this.yScale = d3.scaleLinear().range([this.height, 0]);

        // Append axes
        this.xAxis = this.svg.append("g")
            .attr("transform", `translate(0,${this.height})`);

        this.yAxis = this.svg.append("g");

        // Append area path (for line chart)
        this.areaPath = this.svg.append("path")
            .attr("fill", "steelblue")
            .attr("opacity", 0.6);

        // Initialize brush
        this.brush = d3.brushX()
            .extent([[0, 0], [this.width, this.height]])
            .on("brush end", this.handleBrush.bind(this));

        this.brushGroup = this.svg.append("g")
            .attr("class", "brush")
            .call(this.brush);

        this.addHandles();
    }

    wrangleData() {
        const parseDate = d3.timeParse("%b-%y");

        const groupedData = d3.rollups(
            this.rawData,
            v => d3.mean(v, d => +d["Transacted Price ($)"]),
            d => d["Sale Date"]
        );

        this.data = groupedData.map(([date, avgPrice]) => ({
            date,
            avgPrice
        }));

        this.xScale.domain(d3.extent(this.data, d => d.date));
        this.yScale.domain([0, d3.max(this.data, d => d.avgPrice)]);

        this.updateVis();
    }

    updateVis() {
        // Define the area generator for the line chart
        const area = d3.area()
            .x(d => this.xScale(d.date))
            .y0(this.height)
            .y1(d => this.yScale(d.avgPrice));

        // Update area path
        this.areaPath
            .datum(this.data)
            .attr("d", area);

        // Update x-axis
        this.xAxis
            .call(d3.axisBottom(this.xScale))
            .attr("transform", `translate(0, ${this.height})`); // Ensure x-axis is at the bottom

        // Remove y-axis labels and ticks
        this.yAxis.selectAll("*").remove();
    }

    addHandles() {
        this.brushGroup.selectAll(".handle")
            .data([{ type: "w" }, { type: "e" }])
            .join("rect")
            .attr("class", "handle")
            .attr("cursor", "ew-resize")
            .attr("width", 10)
            .attr("height", this.height)
            .attr("rx", 5)
            .attr("ry", 5)
            .attr("fill", "url(#gradient)")
            .attr("stroke", "#333")
            .attr("stroke-width", 1.5)
            .attr("x", d => (d.type === "w" ? -5 : this.width - 5))
            .attr("y", 0);

        this.svg.append("defs")
            .append("linearGradient")
            .attr("id", "gradient")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "0%")
            .attr("y2", "100%")
            .selectAll("stop")
            .data([
                { offset: "0%", color: "red" },
                { offset: "100%", color: "orange" }
            ])
            .join("stop")
            .attr("offset", d => d.offset)
            .attr("stop-color", d => d.color);
    }

    handleBrush(event) {
        const selection = event.selection;
        if (selection) {
            const [x0, x1] = selection.map(this.xScale.invert); // Ensure this is converting pixel values to date
            console.log(x0, x1); // Debug: Check the values of x0 and x1

            if (x0 instanceof Date && x1 instanceof Date) {
                if (this.onBrush) {
                    this.onBrush(x0, x1); // Callback with the valid date range
                }
            } else {
                console.log("Brushed range is invalid.");
            }
        }
    }
}
