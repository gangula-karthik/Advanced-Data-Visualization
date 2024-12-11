import MapVisualization from './geoHeatMap.js';
import DonutChart from './donutChart.js';
import BarChart from './barChart.js';
import TimelineBrush from './timeline.js';

const svgContainerId = '#content';
const geojsonPath = './data/district_and_planning_area.geojson';
const csvPath = './data/CommercialTrans_201910 to 202410.csv';
const lookupJsonPath = './data/postal_district_lookup.json';

let calls;

function populateDropdown(data, columnName, dropdownId, formatText = (value) => value, isNumeric = false) {
    let uniqueValues = Array.from(new Set(data.map(row => row[columnName])));

    if (isNumeric) {
        uniqueValues.sort((a, b) => +a - +b);
    } else {
        uniqueValues.sort();
    }

    const dropdown = document.getElementById(dropdownId);

    uniqueValues.forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = formatText(value);
        dropdown.appendChild(option);
    });
}

$("#propertyName").on("change", updateCharts);
$("#districtName").on("change", updateCharts);



d3.csv(csvPath).then((data) => {
    console.log(data);

    // Data parsing and transformation
    data.forEach(row => {
        row["Area (SQFT)"] = +row["Area (SQFT)"].replace(/,/g, "");
        row["Area (SQM)"] = +row["Area (SQM)"].replace(/,/g, "");
        row["Transacted Price ($)"] = +row["Transacted Price ($)"].replace(/,/g, "");
        row["Unit Price ($ PSF)"] = +row["Unit Price ($ PSF)"].replace(/,/g, "");
        row["Unit Price ($ PSM)"] = +row["Unit Price ($ PSM)"].replace(/,/g, "");
        row["Sale Date"] = d3.timeParse("%b-%y")(row["Sale Date"]);

        const tenure = row["Tenure"]; // Get the "Tenure" column value
        const match = tenure.match(/(\d+)\s+yrs\s+lease\s+commencing\s+from\s+(\d{4})/); // Extract duration and start year

        if (match) {
            const leaseYears = parseInt(match[1], 10);
            const startYear = parseInt(match[2], 10);
            const endYear = startYear + leaseYears;

            row["Lease Start Year"] = startYear;
            row["Lease End Year"] = endYear;
        } else {
            row["Lease Start Year"] = "Freehold";
            row["Lease End Year"] = "Freehold";
        }
    });

    calls = data;

    // Populate dropdowns
    populateDropdown(data, "Project Name", "propertyName");
    populateDropdown(data, "Postal District", "districtName", (value) => `District ${value}`, true);

    // Get min and max years for the tenure slider
    const minYear = Math.min(...data.map(row => row["Lease End Year"]).filter(val => val !== "Freehold"));
    const maxYear = Math.max(...data.map(row => row["Lease End Year"]).filter(val => val !== "Freehold"));

    // Initialize the tenure slider
    $("#tenureSlider").slider({
        range: true,
        min: minYear,
        max: maxYear + 1, // Add an extra step for "Freehold"
        values: [minYear, maxYear + 1], // Default to maxYear + 1 (Freehold)
        slide: function (event, ui) {
            // Special handling for Freehold
            const startLabel = ui.values[0] > maxYear ? "Freehold" : `Year ${ui.values[0]}`;
            const endLabel = ui.values[1] > maxYear ? "Freehold" : `Year ${ui.values[1]}`;

            // Update the range label dynamically
            $("#tenureRangeLabel").text(`${startLabel} - ${endLabel}`);

            // Prevent sliding past "Freehold" point
            if (ui.values[0] > maxYear) {
                $(this).slider('values', 0, maxYear + 1);
            }
            if (ui.values[1] > maxYear) {
                $(this).slider('values', 1, maxYear + 1);
            }
        },
        change: function (event, ui) {
            // Trigger updateCharts on slider change
            updateCharts();
        }
    });

    $("#tenureRangeLabel").text(`Year ${minYear} - Year ${maxYear}`);
    $("#minTenureLabel").text(`Year ${minYear}`);

    // Create chart instances after data is ready
    const donutChart1 = new DonutChart("#donutChart1", data, "Property Type");
    const donutChart2 = new DonutChart('#donutChart2', data, "Type of Area");
    const barChart = new BarChart('#barChart', data, "Floor Level", "Unit Price ($ PSM)");
    const timelineBrush = new TimelineBrush('#timeline-brush', data, (x0, x1) => {
        console.log(`Brushed range: ${x0} to ${x1}`);
    });

    // Store charts globally for later updates
    window.donutChart1 = donutChart1;
    window.donutChart2 = donutChart2;
    window.barChart = barChart;
    window.timelineBrush = timelineBrush;
});

// Function to update the charts on dropdown or slider change
function updateCharts() {
    if (window.donutChart1) window.donutChart1.wrangleData();
    if (window.donutChart2) window.donutChart2.wrangleData();
    if (window.barChart) window.barChart.wrangleData();
    if (window.timelineBrush) window.timelineBrush.wrangleData();
}

const mapVis = new MapVisualization(svgContainerId, geojsonPath, csvPath, lookupJsonPath);