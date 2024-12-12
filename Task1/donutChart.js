export default class DonutChart {
    constructor(svgContainerId, data, columnToAggregate) {
        this.svgContainerId = svgContainerId;
        this.data = data;
        this.columnToAggregate = columnToAggregate; // The column name you want to aggregate

        this.width = 250;  // Fixed small width
        this.height = 250; // Fixed small height
        this.margin = 30;  // Minimal margin to save space

        // Calculate the radius
        this.radius = Math.min(this.width, this.height) / 2 - this.margin;

        // Create the SVG container
        this.initVis();
    }

    initVis() {
        // Remove any existing SVG to prevent duplicates
        d3.select(this.svgContainerId).selectAll("*").remove();

        // Append the SVG object to the container
        this.svg = d3.select(this.svgContainerId)
            .append("svg")
            .attr("width", `${this.width}px`)
            .attr("height", `${this.height}px`)
            .attr("viewBox", `0 0 ${this.width} ${this.height - 20}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("display", "block")
            .style("margin", "auto");

        // Create a group for the pie chart, positioned in the center
        this.chartGroup = this.svg.append("g")
            .attr("transform", `translate(${this.width / 2}, ${this.height / 2 - 30})`);

        // Create a group for the legend
        this.legendGroup = this.svg.append("g")
            .attr("transform", `translate(0, ${this.height - 80})`);

        // Set the color scale
        this.colorScale = d3.scaleOrdinal(d3.schemeTableau10);

        // Compute the position of each group on the pie
        this.pieGenerator = d3.pie()
            .value(d => d.value)
            .sort(null);

        // Define the arc generator
        this.arcGenerator = d3.arc()
            .innerRadius(this.radius * 0.5)
            .outerRadius(this.radius);

        // Create a tooltip
        this.tooltip = d3.select("body")
            .append("div")
            .attr("class", "donut-tooltip")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background-color", "#1f1f1f")
            .style("border", "1px solid #333")
            .style("color", "#fff")
            .style("padding", "12px")
            .style("border-radius", "8px")
            .style("box-shadow", "0 4px 6px rgba(0,0,0,0.1)")
            .style("font-size", "13px")
            .style("max-width", "250px")
            .style("pointer-events", "none")
            .style("z-index", "10")
            .style("transform", "translate(-50%, -50%)")
            .style("opacity", "0.95")
            .style("transition", "opacity 0.2s ease-in-out");

        this.wrangleData();
    }


    wrangleData() {
        // Get selected values from the dropdowns
        const selectedProperty = $("#propertyName").val();
        const selectedDistrict = $("#districtName").val();

        // Get the value from the range slider
        const tenureRange = $("#tenureSlider").slider("values");
        const [minTenure, maxTenure] = tenureRange;
        const sliderMax = $("#tenureSlider").slider("option", "max");

        // Filter the data based on the selected dropdown values and tenure range
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
                if (leaseEndYear === "Freehold") {
                    return maxTenure === sliderMax;
                }
                return leaseEndYear >= minTenure && leaseEndYear <= maxTenure;
            });
        }

        // Group the filtered data based on the specified column and count the occurrences
        const groupedData = d3.rollups(
            filteredData,
            v => v.length,
            d => d[this.columnToAggregate]
        ).map(([key, value]) => ({ key, value }));

        // Sort data to ensure consistent color assignment
        groupedData.sort((a, b) => b.value - a.value);

        // Prepare the data for the pie layout
        this.dataReady = this.pieGenerator(groupedData);

        // Update the visualizations after filtering the data
        this.updateVis();
    }


    createLegend(dataReady) {
        // Ensure we have a valid legendGroup and data
        if (!this.legendGroup || !dataReady || dataReady.length === 0) {
            return;
        }

        // Remove existing legend
        this.legendGroup.selectAll("*").remove();

        // Create legend items
        const legendItems = this.legendGroup.selectAll(".legend-item")
            .data(dataReady) // Data is bound in the order it appears in dataReady
            .enter()
            .append("g")
            .attr("class", "legend-item")
            .attr("transform", (d, i) => {
                // Center the legend items horizontally
                const totalWidth = dataReady.length * 100; // Each item takes up 100px
                const startX = (this.width - totalWidth) / 2; // Calculate starting X to center
                return `translate(${startX + i * 80}, -40)`; // Spread items evenly
            });

        // Add colored rectangles
        legendItems.append("rect")
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", d => this.colorScale(d.data.key))
            .attr("rx", 2)
            .attr("ry", 2);

        // Add text labels vertically centered beside the rectangle
        legendItems.append("text")
            .attr("x", 20) // Position the text beside the rectangle
            .attr("y", 9.5) // Vertically center the text relative to the rectangle
            .text(d => `${d.data.key}`) // Use the key for the label
            .style("font-size", "10px")
            .style("fill", "white")
            .style("alignment-baseline", "middle");
    }



    updateVis() {
        // Remove any existing content, including "No data found" text
        this.svg.selectAll("*:not(.legend-group)").remove();

        // Recreate the chart group
        this.chartGroup = this.svg.append("g")
            .attr("transform", `translate(${this.width / 2}, ${this.height / 2 - 30})`);

        // Recreate the legend group
        this.legendGroup = this.svg.append("g")
            .attr("class", "legend-group")
            .attr("transform", `translate(${30}, ${this.height + 5})`);

        // Check if there is data
        if (this.dataReady.length === 0) {
            // Display "No data found" message
            this.svg.append("text")
                .attr("x", this.width / 2)
                .attr("y", this.height / 2)
                .attr("text-anchor", "middle")
                .style("font-size", "14px")
                .style("fill", "gray")
                .text("No data found");
            return;
        }

        // Create pie slices
        const slices = this.chartGroup.selectAll('g.slice')
            .data(this.dataReady)
            .enter()
            .append('g')
            .attr('class', 'slice');

        // Add paths with entrance animation
        const paths = slices.append('path')
            .attr('fill', d => this.colorScale(d.data.key))
            .attr('d', d => {
                // Start with a zero-sized slice
                const zeroArc = { startAngle: 0, endAngle: 0 };
                return this.arcGenerator(zeroArc);
            })
            .transition()
            .duration(1000)
            .attrTween('d', (d) => {
                const interpolate = d3.interpolate(
                    { startAngle: 0, endAngle: 0 },
                    { startAngle: d.startAngle, endAngle: d.endAngle }
                );
                return t => this.arcGenerator(interpolate(t));
            });

        // Tooltip event handlers
        slices.on("mouseover", (event, d) => {
            // Calculate percentage
            const total = d3.sum(this.dataReady, d => d.value);
            const percentage = ((d.value / total) * 100).toFixed(1);

            // Create tooltip with category color indicator
            const categoryColor = this.colorScale(d.data.key);

            this.tooltip
                .style("visibility", "visible")
                .style("opacity", "0.95")
                .html(`
            <div style="display: flex; align-items: center; margin-bottom: 6px;">
                <div style="width: 12px; height: 12px; background-color: ${categoryColor}; margin-right: 8px; border-radius: 2px;"></div>
                <strong style="color: #fff;">${d.data.key}</strong>
            </div>
            <div style="color: #aaa;">
                Count: ${d.value}<br>
                Percentage: ${percentage}%
            </div>
        `);
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
            });

        // Create legend
        this.createLegend(this.dataReady);
    }
}