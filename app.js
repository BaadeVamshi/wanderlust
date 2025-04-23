
if(process.env.NODE_ENV!="production"){
    require('dotenv').config()
}


let express = require("express");
let app = express();

const mongoose = require('mongoose');
let path = require("path");
const Listing = require("./models/listing");
const Review=require("./models/review.js");
const Booking=require("./models/booking.js");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


const methodOverride = require('method-override');
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, "/public")));

let ExpressError = require("./utils/ExpressError");
let wrapAsync=require("./utils/wrapAsync.js");

const {listingSchema}=require("./schema.js");
const {reviewSchema}=require("./schema.js");
const {userSchema}=require("./schema.js");



//session,flash,passport
const session=require("express-session");
const MongoStore = require('connect-mongo');
const flash=require("connect-flash");
const passport=require("passport");
const LocalStrategy = require("passport-local");
const User=require("./models/user.js");



//middleware
const {isLoggedIn, isReviewOwner}=require("./middleware.js");
const {redirectPath}=require("./middleware.js");
const {isOwner}=require("./middleware.js");


//upload image
const multer  = require('multer')
const {config,storage}=require("./cloudConfig.js");
const upload = multer({ storage })


//map
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const map_token=process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({ accessToken: map_token });

const ejsMate = require("ejs-mate");
const { serialize, deserialize } = require("v8");

app.engine('ejs', ejsMate);

const db_url=process.env.ATLAS_DB;
main().then((res) => {
    console.log(res);
})
.catch((err) => {
    console.log(err);
})

async function main() {
    await mongoose.connect(db_url);
}


let port = 8080;
app.listen(port, () => {
    console.log("port is listening");
})

//session in production
const store=MongoStore.create({
    mongoUrl: db_url,
    crypto:{
        secret: process.env.SECRET,
    },
    touchAfter:24*3600,
});


//session - cookies
const sessionsecret={
    store,
    secret:process.env.SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        expires:Date.now()+7*24*60*60*1000,
        maxAge:7*24*60*60*1000,
        httpOnly:true,
    }
};
app.use(session(sessionsecret));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

//passport - local strategy
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());//stores users details in session --->  pbkdf2 hashing algo
passport.deserializeUser(User.deserializeUser());//remove stored info of user when session is complete


app.use((req,res,next)=>{
    res.locals.success=req.flash("success");
    next();
})
app.use((req,res,next)=>{
    res.locals.error=req.flash("error");
    res.locals.currUser=req.user;
    next();
})



//schema validations
let validateListing=(req,res,next)=>{
    let {error}=listingSchema.validate({listing:req.body});
    // console.log(result);
    if(error){
        console.log("Error",error.details);
        throw new ExpressError(400, error.details.map(err => err.message).join(", "));
    }
    else{
        next();
    }
}

let validateReview=(req,res,next)=>{
    let {error}=reviewSchema.validate(req.body);
    // console.log(result);
    if(error){
        throw new ExpressError(400, error.details.map(err => err.message).join(", "));
    }
    else{
        next();
    }
}

let validateUser=(req,res,next)=>{
    let {error}=userSchema.validate(req.body);
    // console.log(result);
    if(error){
        req.flash("error",error.message);
        res.redirect("/signup");
    }
    else{
        next();
    }
}


//signup-get
app.get("/signup",(req,res)=>{
    res.render("users/signup.ejs");
});
//signup-post
app.post("/signup",validateUser,wrapAsync(async (req,res,next)=>{
    try{
        let {email,username,password}=req.body;
        let user=new User({
            email:email,
            username:username,
        })
        let test=await User.register(user,password);
        req.login(test,(err)=>{
            if(err){
                return next(err);
            }
            req.flash("success","Welcome to Wonderlust");
            res.redirect("/listings");
        })
        
    }
    catch(r){
        req.flash("error",r.message);
        res.redirect("/signup");
    }
   
}));

//login-get
app.get("/login",(req,res)=>{
    res.render("users/login.ejs");
});
//login-post
app.post("/login",redirectPath,passport.authenticate("local",{failureRedirect:"/login",failureFlash:true}),async (req,res)=>{
    // console.log(req.user);
    req.flash("success","Welcome back to Wonderlust");
    let redirectpath1=res.locals.redirect || "/listings";
    res.redirect(redirectpath1);;
})

//logout-route
app.get("/logout",(req,res,next)=>{
    console.log(req.user);
    req.logout((err)=>{
        if(err){
            return next(err);
        }
        req.flash("success","Logged out successfully");
        res.redirect("/listings");
    });
    
})

// all listings
app.get("/listings", wrapAsync(async (req, res) => {
    let AllListings = await Listing.find({});
    res.render("listings/index.ejs", { AllListings });
}));

//create new list
app.get("/listings/new", isLoggedIn,(req, res) => {
    res.render("listings/new.ejs");
})

//create new list post
app.post("/listings",isLoggedIn,upload.single('image'),wrapAsync(async (req, res,next) => {

    let { title, description, price, location, country } = req.body;
    let response=await geocodingClient.forwardGeocode({
        query:location,
        limit: 1
      })
    .send()
    let url=req.file.path;
    let filename=req.file.filename;
    // console.log(url+" path-->"+filename);
    let newlisting = new Listing({
        title: title,
        description: description,
        price: price,
        location: location,
        country: country
    });    
    newlisting.image={url,filename};
    newlisting.owner=req.user._id;
    newlisting.geometry=response.body.features[0].geometry;
    let savedListing=await  newlisting.save();
    // console.log(savedListing);
    req.flash("success","New Listing Created");
    res.redirect("/listings");
}));



//showing individual
app.get("/listings/:id",wrapAsync(async (req, res, next) => {
    let { id } = req.params;
    let data = await Listing.findById(id)
    .populate({path:"reviews",
        populate:{path:"author"},
    })
    .populate("owner");
    res.render("listings/show.ejs", { data });
}));

//edit
app.get("/listings/:id/edit", isLoggedIn,isOwner,wrapAsync(async (req, res) => {
    
    let { id } = req.params;
    let data = await Listing.findById(id);
    if(!data){
        req.flash("error","Listing does not exist!");
        return res.redirect("/listings");
    }
    let originalImageUrl=data.image.url;
    originalImageUrl=originalImageUrl.replace("/upload","/upload/w_250");
    res.render("listings/edit.ejs", { data ,originalImageUrl});
}));


//update
app.patch("/listings/:id",isLoggedIn,isOwner,upload.single('image') , wrapAsync(async (req, res) => {
    
    const { id } = req.params;
    const { title, description, price, location, country } = req.body;
    const listing = await Listing.findById(id);
    
    let list=await Listing.findByIdAndUpdate(
        id,
        {
            $set: {
                title: title,
                description: description,
                price: price,
                location: location,
                country: country,
            },
        },
        { new: true }
    );
    let response=await geocodingClient.forwardGeocode({
        query:location,
        limit: 1
      })
    .send()
    list.geometry=response.body.features[0].geometry;
    await list.save();
    if(typeof req.file!=="undefined"){
        let url=req.file.path;
        let filename=req.file.filename;
        list.image={url,filename};
        await list.save();
    }

    req.flash("success","Listing Updated");
    res.redirect("/listings");
}));

//delete
app.delete("/listings/:id/delete", isLoggedIn,isOwner,wrapAsync(async (req, res) => {
   
    let { id } = req.params;
    await Listing.findByIdAndDelete(id);
    console.log("deleted successfully");
    req.flash("success","Listing Deleted");
    res.redirect("/listings");
}));


//review
app.post("/listings/:id/reviews",isLoggedIn,validateReview,async (req,res,next)=>{
    try{
        let { id } = req.params;
        let { comment,rating} = req.body.review;
        let listing = await Listing.findById(id);
        if (!listing) {
            throw new ExpressError(404, "Listing not found");
        }
        let newReview = new Review({rating,comment});
        newReview.author=req.user._id;
        await newReview.save();
        listing.reviews.push(newReview);
        await listing.save();
        req.flash("success","New Review Created");
        res.redirect(`/listings/${id}`);
    }
    catch(error){
        next(new ExpressError(400, error.message || "Invalid data"));
    }
});

//delete review
app.delete("/listings/:id/reviews/:reviewId",isReviewOwner,async (req,res)=>{
    let {id,reviewId}=req.params;
    await Listing.findByIdAndUpdate(id,{$pull:{reviews:reviewId}});
    await Review.findByIdAndDelete(reviewId);
    res.redirect(`/listings/${id}`);
});

//order now 
app.post("/listings/:id/order",isLoggedIn,async (req,res,next)=>{
    let {id}=req.params;
    let listing=await Listing.findById(id);
    let newBooking=new Booking({guest:req.user._id,listing:listing._id,host: listing.owner});
    newBooking.save();
    req.flash("success","Order Placed");
    res.redirect(`/listings/${id}`);
    
});
//host
app.get("/myOrders",async (req,res)=>{
    let bookings=await Booking.find({host:req.user._id}).populate("listing").populate("guest");
    res.render("listings/myorders",{bookings});
});
//mybookings guest
app.get("/mybookings", async (req, res) => {
    const bookings = await Booking.find({ guest: req.user._id })
      .populate("listing")
      .populate("host");
    res.render("listings/mybooking", { bookings });
  });
//status
app.post("/bookings/:id/status",async (req,res)=>{
    let {id}=req.params;
    let {status}=req.body;
    let booking=await Booking.findById(id);
    if (booking.host.toString() !== req.user._id.toString()) {
        return res.status(403).send("Unauthorized");
    }
    booking.status=status;await booking.save();
    res.redirect(`/mybookings`);
});

app.all("*",(req,res,next)=>{
    return next(new ExpressError(405,"Page not found"));
})

app.use((err, req, res, next) => {
    let { status = 501, message = "something went wrong" } = err;
    res.status(status).render("error.ejs",{message});
});
