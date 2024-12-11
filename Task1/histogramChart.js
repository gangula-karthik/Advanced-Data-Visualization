export default class HistogramChart {
    constructor(divId, data, xColumn, yColumn) {
        this.divId = divId;
        this.data = data;
        this.xColumn = xColumn;
        this.yColumn = yColumn;

        // Select the container and get its dimensions
        this.container = d3.select(this.divId).node();
        this.containerWidth = 480; // Fixed width to match tooltip
        this.containerHeight = 350; // Reduced height for tooltip

        // Adjust margins for axis labels and chart spacing
        this.margin = { top: 40, right: 40, bottom: 100, left: 70 };
        this.width = this.containerWidth - this.margin.left - this.margin.right;
        this.height = this.containerHeight - this.margin.top - this.margin.bottom;

        this.initVis();
    }

    initVis() {
        // Clear any existing SVG to prevent multiple renderings
        d3.select(this.divId).selectAll("*").remove();

        // Create the SVG canvas
        this.svg = d3.select(this.divId)
            .append("svg")
            .attr("width", this.containerWidth)
            .attr("height", this.containerHeight)
            .append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        // Initialize scales
        this.xScale = d3.scaleLinear().range([0, this.width]);
        this.yScale = d3.scaleLinear().range([this.height, 0]);

        // Initialize axes
        this.xAxis = this.svg.append("g")
            .attr("transform", `translate(0,${this.height})`)
            .style("color", "#e0e0e0"); // Light gray axis color
        this.yAxis = this.svg.append("g")
            .style("color", "#e0e0e0"); // Light gray axis color

        // Add axes labels
        this.svg.append("text")
            .attr("class", "x-axis-label")
            .attr("x", this.width / 2)
            .attr("y", this.height + this.margin.bottom - 60)
            .style("text-anchor", "middle")
            .style("fill", "#e0e0e0")
            .text("Area per SQM");

        this.svg.append("text")
            .attr("class", "y-axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -this.height / 2)
            .attr("y", -this.margin.left + 15)
            .style("text-anchor", "middle")
            .style("fill", "#e0e0e0")
            .text(`Average Transacted Price`);

        this.wrangleData();
    }

    wrangleData() {
        // Convert data to millions (assuming the y-values are in billions)
        const binGenerator = d3.bin()
            .value(d => parseFloat(d[this.xColumn].replace(/[,$]/g, '')))
            .thresholds(10); // Number of bins can be adjusted

        const bins = binGenerator(this.data);

        this.binnedData = bins.map(bin => ({
            x0: bin.x0,
            x1: bin.x1,
            avg: d3.mean(bin, d => parseFloat(d[this.yColumn].replace(/[,$]/g, ''))) / 1000000 || 0 // Convert to millions
        }));

        // Calculate the overall average transacted price in millions
        this.overallAverage = d3.mean(this.data, d => parseFloat(d[this.yColumn].replace(/[,$]/g, ''))) / 1000000 || 0;

        this.updateVis();
    }

    updateVis() {
        // Update the domains of the scales (for millions)
        this.xScale.domain([d3.min(this.binnedData, d => d.x0), d3.max(this.binnedData, d => d.x1)]);
        this.yScale.domain([0, d3.max(this.binnedData, d => d.avg)]);

        // Update axes with transitions
        this.xAxis.transition()
            .duration(750)
            .call(
                d3.axisBottom(this.xScale)
                    .tickFormat(d3.format(",.0f"))
                    .ticks(4)
            );
        this.yAxis.transition()
            .duration(750)
            .call(d3.axisLeft(this.yScale).tickFormat(d => d3.format(".2s")(d) + "M")); // Format the y-axis to display in millions

        // Bind data to bars
        const bars = this.svg.selectAll(".bar")
            .data(this.binnedData);

        // Remove exiting bars
        bars.exit()
            .transition()
            .duration(550)
            .attr("y", this.height)
            .attr("height", 0)
            .remove();

        bars.enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", d => this.xScale(d.x0))
            .attr("y", this.height)
            .attr("width", d => Math.max(0, this.xScale(d.x1) - this.xScale(d.x0) - 1))
            .attr("height", 0)
            .attr("fill", "#0072be")
            .merge(bars)
            .transition()
            .duration(550)
            .attr("x", d => this.xScale(d.x0))
            .attr("y", d => this.yScale(d.avg))
            .attr("width", d => Math.max(0, this.xScale(d.x1) - this.xScale(d.x0) - 1))
            .attr("height", d => this.height - this.yScale(d.avg))
            .attr("fill", "#0072be");

        // Add the average line for transacted price in millions
        this.svg.selectAll(".average-line").remove();
        this.svg.append("line")
            .attr("class", "average-line")
            .attr("x1", 0)
            .attr("x2", this.width)
            .attr("y1", this.yScale(this.overallAverage))
            .attr("y2", this.yScale(this.overallAverage))
            .attr("stroke", "red")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,5");

        // Add the label for the average line
        this.svg.selectAll(".average-label").remove();
        this.svg.append("text")
            .attr("class", "average-label")
            .attr("x", this.width - 10)
            .attr("y", this.yScale(this.overallAverage) - 5)
            .attr("text-anchor", "end")
            .style("fill", "red")
            .style("font-size", "12px")
            .text(`Average: ${this.overallAverage.toFixed(2)} M`); // Display in millions (M)
    }
}