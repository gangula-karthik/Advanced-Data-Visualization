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
        this.margin = { top: 20, right: 20, bottom: 100, left: 70 };
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
            .style("color", "#888");
        this.yAxis = this.svg.append("g")
            .style("color", "#888");

        this.wrangleData();
    }

    wrangleData() {
        const binGenerator = d3.bin()
            .value(d => d[this.xColumn])
            .thresholds(10); // Number of bins can be adjusted

        const bins = binGenerator(this.data);

        this.binnedData = bins.map(bin => ({
            x0: bin.x0,
            x1: bin.x1,
            avg: d3.mean(bin, d => d[this.yColumn]) // Raw values
        }));

        console.log(this.data)

        this.overallAverage = d3.mean(this.data, d => d[this.yColumn]);
        this.updateVis();
    }

    updateVis() {
        // Update the domains of the scales (raw values)
        const xMin = d3.min(this.binnedData, d => d.x0);
        const xMax = d3.max(this.binnedData, d => d.x1);
        const yMax = d3.max(this.binnedData, d => d.avg);

        this.xScale.domain([xMin, xMax]);
        this.yScale.domain([0, yMax * 1.1]); // Add 10% padding to y-axis

        // Custom formatting function for y-axis values
        const formatY = (value) => {
            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
            return value.toFixed(0);
        };

        // Update axes with transitions and improved formatting
        this.xAxis.transition()
            .duration(750)
            .call(d3.axisBottom(this.xScale)
                .ticks(5)
                .tickFormat(d3.format(".0f"))
            )
            .selectAll("text")
            .style("font-size", "10px")
            .style("fill", "#aaa");

        this.yAxis.transition()
            .duration(750)
            .call(d3.axisLeft(this.yScale)
                .ticks(5)
                .tickFormat(formatY)
            )
            .selectAll("text")
            .style("font-size", "10px")
            .style("fill", "#aaa");

        // Add grid lines
        this.svg.selectAll(".x-grid").remove();
        this.svg.selectAll(".y-grid").remove();

        this.svg.append("g")
            .attr("class", "x-grid")
            .attr("transform", `translate(0,${this.height})`)
            .call(d3.axisBottom(this.xScale)
                .ticks(5)
                .tickSize(-this.height)
                .tickFormat("")
            )
            .style("stroke-dasharray", "3 3")
            .style("opacity", 0.2)
            .style("stroke", "#555");


        this.svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -this.height / 2)
            .attr("y", -this.margin.left + 20)
            .style("text-anchor", "middle")
            .style("fill", "white")
            .text("Unit Price (per SQM)");

        this.svg.append("text")
            .attr("class", "x-axis-label")
            .attr("x", this.width / 2)
            .attr("y", this.height + this.margin.bottom - 60)
            .style("text-anchor", "middle")
            .style("fill", "#e0e0e0")
            .text("Binned Area per SQM");

        this.svg.append("g")
            .attr("class", "y-grid")
            .call(d3.axisLeft(this.yScale)
                .ticks(5)
                .tickSize(-this.width)
                .tickFormat("")
            )
            .style("stroke-dasharray", "3 3")
            .style("opacity", 0.2)
            .style("stroke", "#555");

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
            .attr("fill", "#4a90e2")
            .attr("opacity", 0.8)
            .merge(bars)
            .transition()
            .duration(550)
            .attr("x", d => this.xScale(d.x0))
            .attr("y", d => this.yScale(d.avg))
            .attr("width", d => Math.max(0, this.xScale(d.x1) - this.xScale(d.x0) - 1))
            .attr("height", d => this.height - this.yScale(d.avg))
            .attr("fill", "#4a90e2")
            .attr("opacity", 0.8);

        // Add the average line for raw transacted price
        this.svg.selectAll(".average-line").remove();
        this.svg.append("line")
            .attr("class", "average-line")
            .attr("x1", 0)
            .attr("x2", this.width)
            .attr("y1", this.yScale(this.overallAverage))
            .attr("y2", this.yScale(this.overallAverage))
            .attr("stroke", "#ff4500")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,5");

        // Add the label for the average line
        this.svg.selectAll(".average-label").remove();
        this.svg.append("text")
            .attr("class", "average-label")
            .attr("x", this.width - 10)
            .attr("y", this.yScale(this.overallAverage) - 5)
            .attr("text-anchor", "end")
            .style("fill", "#ff4500")
            .style("font-size", "10px")
            .text(`Avg: ${formatY(this.overallAverage)}`);
    }
}