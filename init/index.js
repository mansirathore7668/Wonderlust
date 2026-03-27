const mongoose=require("mongoose");
const initdata=require("./data.js");
const listing=require("../models/listing.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/wonderlust";

main()
    .then(() => {
        console.log("connect to DB");
    })
    .catch((res) => {
        console.log(res);
    });

async function main() {
    await mongoose.connect(MONGO_URL);
}

const initDB=async()=>{
    await listing.deleteMany({});
   initdata.data= initdata.data.map((obj)=>({...obj,owner:"6986e7775bca1ba0ce656436"}));
    await listing.insertMany(initdata.data);
    console.log("data was initialized");
}

initDB();