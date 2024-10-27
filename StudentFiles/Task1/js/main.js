d3.csv("./data/CommercialTrans_201910 to 202410.csv", (data) => {
    // data["Area (SQFT)"] = Number(data["Area (SQFT)"])
    data["Area (SQM)"] = Number(data["Area (SQM)"])
    console.log(data)
})