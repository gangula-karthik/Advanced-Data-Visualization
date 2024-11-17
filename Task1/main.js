import MapVisualization from './geoHeatMap.js';
import DonutChart from './donutChart.js';
import BarChart from './barChart.js';
import TimelineBrush from './timeline.js';

const svgContainerId = '#content';
const geojsonPath = './data/district_and_planning_area.geojson';
const csvPath = './data/CommercialTrans_201910 to 202410.csv';
const lookupJsonPath = './data/postal_district_lookup.json';


// Usage example:
const data = [
    { key: 'Group 1', value: 10 },
    { key: 'Group 2', value: 20 },
    { key: 'Group 3', value: 30 },
    { key: 'Group 4', value: 40 },
    { key: 'Group 5', value: 50 }
];

// Usage example:
const data2 = [
    { key: 'Category 1', Value: 10 },
    { key: 'Category 2', Value: 20 },
    { key: 'Category 3', Value: 30 },
    { key: 'Category 4', Value: 40 },
    { key: 'Category 5', Value: 50 }
];

const data3 = [
    { date: new Date('2020-01-01') },
    { date: new Date('2020-02-01') },
    { date: new Date('2020-03-01') },
    // ... more date objects
];

const mapVis = new MapVisualization(svgContainerId, geojsonPath, csvPath, lookupJsonPath);
const donutChart = new DonutChart('#donutChart1', data);
const donutChart2 = new DonutChart('#donutChart2', data);
const barChart = new BarChart('#barChart', data2);
const timelineBrush = new TimelineBrush('#timeline-brush', data, (x0, x1) => {
    console.log(`Brushed range: ${x0} to ${x1}`);
});