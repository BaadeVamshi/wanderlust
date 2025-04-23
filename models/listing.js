let mongoose=require("mongoose");
let Schema=mongoose.Schema;
let Review=require("./review.js");

let listing=new Schema({
    title:{
        type:String,
        
    },
    description:{
        type:String
    },
    image: { 
        url:String,
        filename:String
    },

    price:{
        type:Number
    },
    location:{
        type:String
    },
    country:{
        type:String
    },
    reviews:[
        {
            type:Schema.Types.ObjectId,
            ref:"Review"
        }
    ],
    owner:{
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    geometry:{
        type:{
            type:String,
            enum:["Point"],
            required:true
        },
        coordinates:{
            type:[Number],
            required:true
        }
    }
});

listing.post("findOneAndDelete",async(listing)=>{
    if(listing){
        await Review.deleteMany({reviews:{$in:listing.reviews}});
    }
})

const Listing=mongoose.model("Listing",listing);

module.exports=Listing;