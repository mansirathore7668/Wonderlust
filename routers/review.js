const express = require("express");
const router = express.Router({mergeParams:true});

const reviewController = require("../controllers/reviews");
const wrapAsync = require("../utils/wrapAsync");
const ExpressError = require("../utils/ExpressError");
const { reviewSchema } = require("../schema");
const { islogedin, isReveiwAuthor } = require("../middleware");

const validateReview=(req,res,next)=>{
    let {error}=reviewSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
     
    if(error){
        let errmsg=error.details.map((el)=>el.message).join(",");
        throw new ExpressError(400,errmsg);
    }else{
        next();
    }
};

//reviews  post route
router.post("/review" ,islogedin,validateReview,wrapAsync(reviewController.createReview)
);

// delete review route
router.delete("/:reviewId",
    islogedin,
    isReveiwAuthor,
    wrapAsync(reviewController.destroyReview)

);

module.exports = router;
