export default class TimelineBrush {
    constructor(svgContainerId, data, onBrush) {
        this.svgContainerId = svgContainerId;
        this.data = data;
        this.onBrush = onBrush; // Callback function to handle brushing events

        // Set dimensions based on the parent container
        const container = d3.select(this.svgContainerId).node();
        this.containerWidth = container.getBoundingClientRect().width;
        this.containerHeight = container.getBoundingClientRect().height;

        // Set margins
        this.margin = { top: 20, right: 30, bottom: 10, left: 30 };
        this.width = this.containerWidth - this.margin.left - this.margin.right;
        this.height = 80 - this.margin.top - this.margin.bottom; // Fixed smaller height for the brush component

        this.initVis();
    }

    initVis() {
        // Append the SVG object to the container
        this.svg = d3.select(this.svgContainerId)
            .append("svg")
            .attr("width", this.containerWidth) // Use container width
            .attr("height", 100) // Set a fixed height for the SVG
            .append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        // Initialize scales
        this.xScale = d3.scaleTime()
            .domain(d3.extent(this.data, d => d.date))
            .range([0, this.width]);

        // Append the X-axis
        this.svg.append("g")
            .attr("transform", `translate(0,${this.height})`)
            .call(d3.axisBottom(this.xScale));

        // Initialize the brush
        this.brush = d3.brushX()
            .extent([[0, 0], [this.width, this.height]])
            .on("brush end", this.handleBrush.bind(this));

        // Append the brush to the SVG
        this.svg.append("g")
            .attr("class", "brush")
            .call(this.brush);
    }

    handleBrush(event) {
        // Get the selected range
        const selection = event.selection;
        if (selection) {
            const [x0, x1] = selection.map(this.xScale.invert);
            if (this.onBrush) {
                this.onBrush(x0, x1); // Call the callback function with the selected range
            }
        }
    }
}
