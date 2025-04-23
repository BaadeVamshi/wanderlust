const mongoose = require("mongoose");
let initData = require("../models/listing.js");
let dataFromFile = require("./data");

async function main() {
    await mongoose.connect('mongodb://127.0.0.1:27017/wonderlust');
}

const clearAndInsertData = async () => {
    await initData.deleteMany({});
    dataFromFile.data = dataFromFile.data.map((obj)=>({...obj,owner:"67bdc9c82feb9ab744fde89e"}));
    await initData.insertMany(dataFromFile.data);
}

main().then((res) => {
    console.log(res);
    clearAndInsertData();
})
.catch((err) => {
    console.log(err);
});
