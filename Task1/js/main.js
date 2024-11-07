import { DonutChart } from './donutChart.js';
import { renderMap } from './singaporeMap.js';
import { barChart } from './barChart.js'

d3.csv("./data/CommercialTrans_201910 to 202410.csv").then(data => {
    // Aggregate counts for each Property Type
    const propertyTypeCounts = data.reduce((acc, curr) => {
        acc[curr["Property Type"]] = (acc[curr["Property Type"]] || 0) + 1;
        return acc;
    }, {});

    // Convert counts to an array of objects suitable for DonutChart
    const propertyTypeData = Object.entries(propertyTypeCounts).map(([key, value]) => ({ key, value }));

    // Create the Donut Chart
    DonutChart("#donutChart1", propertyTypeData);

    const typeOfAreaCounts = data.reduce((acc, curr) => {
        acc[curr["Type of Area"]] = (acc[curr["Type of Area"]] || 0) + 1;
        return acc;
    }, {});

    // Convert counts to an array of objects suitable for DonutChart
    const typeOfAreaData = Object.entries(typeOfAreaCounts).map(([key, value]) => ({ key, value }));

    // Create the Donut Chart
    DonutChart("#donutChart2", typeOfAreaData);

    renderMap('#content', './data/district_and_planning_area.geojson', './data/CommercialTrans_201910 to 202410.csv', './data/postal_district_lookup.json');


    const floorLevelCounts = data.reduce((acc, curr) => {
        acc[curr["Floor Level"]] = (acc[curr["Floor Level"]] || 0) + 1;
        return acc;
    }, {});
    console.log(data);

    const floorLevelData = Object.entries(floorLevelCounts).map(([key, Value]) => ({ key: key === "-" ? "Single Floor" : key, Value }));
    console.log(floorLevelData)


    barChart("#barChart", floorLevelData);
});