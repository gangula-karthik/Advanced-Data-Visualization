export default class BarChart {
    constructor(divId, data, xColumn, yColumn) {
        this.divId = divId;
        this.data = data;
        this.xColumn = xColumn;
        this.yColumn = yColumn;

        this.container = d3.select(this.divId).node();
        this.containerWidth = this.container.getBoundingClientRect().width;
        this.containerHeight = this.container.getBoundingClientRect().height;

        this.margin = { top: -10, right: 20, bottom: 100, left: 75 };
        this.width = this.containerWidth - this.margin.left - this.margin.right;
        this.height = this.containerHeight - this.margin.top - this.margin.bottom;

        this.filteredData = this.data; // Initialize filtered data

        this.initVis();
    }

    initVis() {
        this.svg = d3.select(this.divId)
            .append("svg")
            .attr("viewBox", `0 0 ${this.containerWidth} ${this.containerHeight - 40}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("width", "100%")
            .style("height", "100%")
            .append("g")
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

        this.tooltip = d3.select("body").append("div")
            .style("position", "absolute")
            .style("background", "#1f1f1f")
            .style("color", "#fff")
            .style("padding", "12px")
            .style("border-radius", "8px")
            .style("opacity", 0.95)
            .style("border", "1px solid #333")
            .style("box-shadow", "0 4px 6px rgba(0,0,0,0.1)")
            .style("font-size", "13px")
            .style("pointer-events", "none")
            .style("z-index", "10")
            .style("transform", "translate(0%, -50%)")
            .style("transition", "opacity 0.2s ease-in-out");

        this.initScales();
        this.initAxes();

        this.wrangleData();
    }

    wrangleData() {
        const selectedProperty = $("#propertyName").val();
        const selectedDistrict = $("#districtName").val();
        const tenureRange = $("#tenureSlider").slider("values");
        const [minTenure, maxTenure] = tenureRange;
        const sliderMax = $("#tenureSlider").slider("option", "max");

        let filteredData = this.data;

        if (selectedProperty && selectedProperty !== "all") {
            filteredData = filteredData.filter(row => row["Project Name"] === selectedProperty);
        }

        if (selectedDistrict && selectedDistrict !== "all") {
            filteredData = filteredData.filter(row => row["Postal District"] === selectedDistrict);
        }

        if (!isNaN(minTenure) && !isNaN(maxTenure)) {
            filteredData = filteredData.filter(row => {
                const leaseEndYear = row["Lease End Year"];
                return leaseEndYear >= minTenure &&
                    leaseEndYear <= maxTenure;
            });
        }

        const groupedData = d3.group(filteredData, d => d[this.xColumn]);

        this.aggregatedData = Array.from(groupedData, ([key, values]) => ({
            [this.xColumn]: key,
            [this.yColumn]: d3.mean(values, d => d[this.yColumn]),
            count: values.length // Include count for tooltip
        }))
            .filter(d => d[this.xColumn] !== null && d[this.xColumn] !== undefined && d[this.xColumn] !== 'NA'); // Filter out NA values

        this.aggregatedData.sort((a, b) => b[this.yColumn] - a[this.yColumn]);

        this.updateVis();
    }

    initScales() {
        this.xScale = d3.scaleBand()
            .range([0, this.width])
            .padding(0.3);  // Adjust padding for better spacing between bars

        this.yScale = d3.scaleLinear()
            .range([this.height, 0]);

        this.colorScale = d3.scaleOrdinal(d3.schemeTableau10.filter((color, index) => index !== 2));
    }

    initAxes() {
        this.svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${this.height})`);

        this.svg.append("g")
            .attr("class", "y-axis");

        // X-Axis Label
        this.svg.append("text")
            .attr("class", "x-label")
            .attr("transform", `translate(${this.width / 2}, ${this.height + 80})`)
            .style("text-anchor", "middle")
            .style("fill", "white")
            .text(this.xColumn);

        // Y-Axis Label
        this.svg.append("text")
            .attr("class", "y-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -this.height / 2)
            .attr("y", -this.margin.left + 20)
            .style("text-anchor", "middle")
            .style("fill", "white")
            .text(this.yColumn);
    }

    updateVis() {
        if (this.aggregatedData.length === 0) {
            this.removeData();  // Remove existing data and elements
            this.showNoDataMessage();  // Display the no data message
            return;
        } else {
            this.removeNoDataMessage();  // Remove the no data message if it exists
            this.removeData();  // Ensure data is removed before adding new
        }

        this.xScale.domain(this.aggregatedData.map(d => d[this.xColumn]));
        this.yScale.domain([0, d3.max(this.aggregatedData, d => d[this.yColumn])]);
        this.colorScale.domain(this.aggregatedData.map(d => d[this.xColumn]));

        this.svg.select(".x-axis")
            .transition()
            .duration(750) // Include transition with 750 duration
            .call(d3.axisBottom(this.xScale))
            .selectAll("text")
            .attr("transform", "translate(-10,0)rotate(-45)")  // Rotate labels for readability
            .style("text-anchor", "end")
            .style("font-size", "12px")
            .style("fill", "white");

        this.svg.select(".y-axis")
            .transition()
            .duration(750) // Include transition with 750 duration
            .call(d3.axisLeft(this.yScale).tickFormat(d => `$${d}`))
            .selectAll("text")
            .style("fill", "white");

        const bars = this.svg.selectAll("rect")
            .data(this.aggregatedData, d => d[this.xColumn]);

        bars.exit()
            .transition()
            .duration(500)
            .attr("y", this.height)
            .attr("height", 0)
            .remove();

        bars.enter()
            .append("rect")
            .merge(bars)
            .attr("x", d => this.xScale(d[this.xColumn]))
            .attr("y", this.height)  // Start from bottom to animate
            .attr("width", this.xScale.bandwidth())
            .attr("height", 0)  // Start with height 0 for animation
            .attr("fill", d => this.colorScale(d[this.xColumn]))
            .on("mouseover", (event, d) => {
                const percentage = ((d.count / d3.sum(this.aggregatedData, d => d.count)) * 100).toFixed(2);
                this.tooltip
                    .style("visibility", "visible")
                    .style("opacity", "0.95")
                    .html(`
                    <div style="display: flex; align-items: center; margin-bottom: 6px;">
                        <div style="width: 12px; height: 12px; background-color: ${this.colorScale(d[this.xColumn])}; margin-right: 8px; border-radius: 2px;"></div>
                        <strong style="color: #fff;">${d[this.xColumn]}</strong>
                    </div>
                    <div style="color: #aaa;">
                        Count: ${d.count}<br>
                        Percentage: ${percentage}%<br>
                    </div>
                `)
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY}px`)
            })
            .on("mousemove", (event) => {
                this.tooltip
                    .style("top", (event.pageY - 30) + "px")
                    .style("left", (event.pageX - 30) + "px");
            })
            .on("mouseout", () => {
                this.tooltip
                    .style("visibility", "hidden")
                    .style("opacity", "0");
            })
            .transition()
            .duration(750) // Include transition with 750 duration
            .attr("y", d => this.yScale(d[this.yColumn]))
            .attr("height", d => this.height - this.yScale(d[this.yColumn]));

        const average = d3.mean(this.aggregatedData, d => d[this.yColumn]);

        this.svg.selectAll(".average-line").remove();

        this.svg.append("line")
            .attr("x1", 0)
            .attr("x2", this.width)
            .attr("y1", this.yScale(average))
            .attr("y2", this.yScale(average))
            .attr("stroke", "red")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,5")
            .attr("class", "average-line");

        this.svg.selectAll(".average-label").remove();

        this.svg.append("text")
            .attr("x", this.width - 10)
            .attr("y", this.yScale(average) - 10)
            .attr("text-anchor", "end")
            .attr("font-size", "12px")
            .attr("fill", "red")
            .attr("class", "average-label")
            .text("Average");
    }

    removeData() {
        // Remove all bars, average line, and labels
        this.svg.selectAll("rect").remove();  // Remove bars
        this.svg.selectAll(".average-line").remove();  // Remove average line
        this.svg.selectAll(".average-label").remove();  // Remove average label
    }

    showNoDataMessage() {
        this.svg.append("text")
            .attr("x", this.width / 2)
            .attr("y", this.height / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .style("fill", "gray")
            .text("No data found");
    }

    removeNoDataMessage() {
        this.svg.selectAll("text")  // Remove all text, which includes the "No data found" message
            .filter(function () {
                return d3.select(this).text() === "No data found";  // Check the text content
            })
            .remove();
    }
}
