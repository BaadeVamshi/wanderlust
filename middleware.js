
const Listing=require("./models/listing");
const Review=require("./models/review");
module.exports.isLoggedIn=(req,res,next)=>{
    // console.log(req.path,"...",req.originalUrl);
    if(!req.isAuthenticated()){
        req.session.redirectpath=req.originalUrl;
        req.flash("error","You must be logged in !");
        return res.redirect("/login");
    }
    next();
}

module.exports.redirectPath=(req,res,next)=>{
    if(req.session.redirectpath){
        res.locals.redirect=req.session.redirectpath;
    }
    next();
}

module.exports.isOwner=async (req,res,next)=>{
    const { id } = req.params;
    const listing = await Listing.findById(id);
    if(!listing.owner._id.equals(res.locals.currUser._id)){
        req.flash("error","You do not have permission to edit this listing");
        return res.redirect(`/listings`);
    }
    next();
}


module.exports.isReviewOwner=async (req,res,next)=>{
    const { id, reviewId } = req.params;
    const review = await Review.findById(reviewId);
    if(!review.author._id.equals(res.locals.currUser._id)){
        req.flash("error","You do not have permission to edit this review");
        return res.redirect(`/listings/${id}`);
    }
    next();
}