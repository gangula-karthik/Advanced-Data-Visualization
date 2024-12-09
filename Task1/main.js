import MapVisualization from './geoHeatMap.js';
import DonutChart from './donutChart.js';
import BarChart from './barChart.js';
import TimelineBrush from './timeline.js';

const svgContainerId = '#content';
const geojsonPath = './data/district_and_planning_area.geojson';
const csvPath = './data/CommercialTrans_201910 to 202410.csv';
const lookupJsonPath = './data/postal_district_lookup.json';

let calls

d3.csv(csvPath).then((data) => {
    console.log(data);

    data.forEach(row => {
        row["Area (SQFT)"] = +row["Area (SQFT)"].replace(/,/g, "");
        row["Area (SQM)"] = +row["Area (SQM)"].replace(/,/g, "");
        row["Transacted Price ($)"] = +row["Transacted Price ($)"].replace(/,/g, "");
        row["Unit Price ($ PSF)"] = +row["Unit Price ($ PSF)"].replace(/,/g, "");
        row["Unit Price ($ PSM)"] = +row["Unit Price ($ PSM)"].replace(/,/g, "");
        row["Sale Date"] = d3.timeParse("%b-%y")(row["Sale Date"]);

    });

    calls = data;

    const timelineBrush = new TimelineBrush('#timeline-brush', data, (x0, x1) => {
        console.log(`Brushed range: ${x0} to ${x1}`);
    });

    const donutChart1 = new DonutChart("#donutChart1", data, "Property Type");
    const donutChart2 = new DonutChart('#donutChart2', data, "Type of Area");
    const barChart = new BarChart('#barChart', data, "Floor Level", "Unit Price ($ PSM)");

})

const mapVis = new MapVisualization(svgContainerId, geojsonPath, csvPath, lookupJsonPath);