import MapVisualization from './geoHeatMap.js';
import DonutChart from './donutChart.js';
import BarChart from './barChart.js';
import TimelineBrush from './timeline.js';

const geojsonPath = './data/merged_output.geojson';
const csvPath = './data/CommercialTrans_201910 to 202410.csv';


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

function updateKpiCards(data) {
    // Calculate total properties
    const totalProperties = new Set(data.map(row => row["Project Name"])).size;

    // Calculate total revenue
    const totalRevenue = d3.sum(data, row => row["Transacted Price ($)"]);

    // Calculate price change
    const initialAvgPrice = d3.mean(
        data.filter(d => d["Sale Date"].getFullYear() === 2022),
        d => d["Unit Price ($ PSM)"]
    );
    const latestAvgPrice = d3.mean(
        data.filter(d => d["Sale Date"].getFullYear() === 2023),
        d => d["Unit Price ($ PSM)"]
    );
    const priceChange = ((latestAvgPrice - initialAvgPrice) / initialAvgPrice) * 100;

    // Find the hottest district
    const districtRevenue = d3.rollup(
        data,
        v => d3.sum(v, d => d["Transacted Price ($)"]),
        d => d["Postal District"]
    );
    const hottestDistrict = Array.from(districtRevenue).reduce((a, b) => b[1] > a[1] ? b : a);

    // Update KPI cards with jQuery
    $("#total-properties").text(totalProperties);
    $("#total-revenue").text(`$${(totalRevenue / 1e6).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} M`);
    $("#price-change").text(`${priceChange.toFixed(2)}%`);
    $("#hottest-district").text(`District ${hottestDistrict[0]}`);
}



d3.csv(csvPath).then((data) => {
    console.log(data);

    // Data parsing and transformation
    data.forEach(row => {
        row["Area (SQFT)"] = +row["Area (SQFT)"].replace(/,/g, "");
        row["Area (SQM)"] = +row["Area (SQM)"].replace(/,/g, "");
        row["Transacted Price ($)"] = +row["Transacted Price ($)"].replace(/,/g, "");
        row["Unit Price ($ PSF)"] = +row["Unit Price ($ PSF)"].replace(/,/g, "");
        row["Unit Price ($ PSM)"] = +row["Unit Price ($ PSM)"].replace(/,/g, "");
        row["Floor Level"] = row["Floor Level"].replace("-", "NA")
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

    updateKpiCards(data)

    window.originalData = data
    window.chartData = data

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
    const timelineBrush = new TimelineBrush('#timeline-svg', data, (x0, x1) => {
        const filteredData = x0 && x1
            ? data.filter(d => {
                const saleDate = d["Sale Date"]; // Already parsed during initial data processing
                return saleDate >= x0 && saleDate <= x1;
            })
            : data;

        window.chartData = filteredData;

        updateCharts();
    });

    $('#reset-filter-btn').on('click', resetBrush);

    const mapVis = new MapVisualization('#content', geojsonPath, data);

    // Store charts globally for later updates
    window.donutChart1 = donutChart1;
    window.donutChart2 = donutChart2;
    window.barChart = barChart;
    window.timelineBrush = timelineBrush;
    window.mapVis = mapVis;
});

function resetBrush() {
    // Reset brush for timelineBrush
    d3.select('#timeline-svg .brush').call(timelineBrush.brush.move, null);
    window.chartData = window.originalData;

    updateKpiCards(window.chartData);

    // Reset data to original state for all charts
    timelineBrush.data = window.chartData;
    timelineBrush.wrangleData(); // Reprocess data

    // Reset data for donutChart1
    donutChart1.data = window.chartData;
    donutChart1.wrangleData();

    // Reset data for donutChart2
    donutChart2.data = window.chartData;
    donutChart2.wrangleData();

    // Reset data for barChart
    barChart.data = window.chartData;
    barChart.wrangleData();

    // Reset data for mapVis
    mapVis.csvData = window.chartData;
    mapVis.wrangleData(); // Reprocess map data
}



function updateCharts() {
    const dataToUse = window.chartData;

    updateKpiCards(dataToUse);

    if (window.donutChart1) {
        window.donutChart1.data = dataToUse;
        window.donutChart1.wrangleData();
    }
    if (window.donutChart2) {
        window.donutChart2.data = dataToUse;
        window.donutChart2.wrangleData();
    }
    if (window.barChart) {
        window.barChart.data = dataToUse;
        window.barChart.wrangleData();
    }
    if (window.timelineBrush) {
        window.timelineBrush.data = dataToUse;
        window.timelineBrush.wrangleData();
    }
    if (window.mapVis) {
        window.mapVis.csvData = dataToUse;
        window.mapVis.wrangleData();
    }
}