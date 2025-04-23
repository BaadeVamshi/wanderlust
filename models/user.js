let mongoose=require("mongoose");
let Schema=mongoose.Schema;
const passportLocalMongoose=require("passport-local-mongoose");

let userSchema=new Schema({
    email:{
        type:String,
        required:true//username and password are inbuilt in passport
    }
})
userSchema.plugin(passportLocalMongoose);
module.exports=mongoose.model("User",userSchema);