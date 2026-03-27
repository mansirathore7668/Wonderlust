const express = require("express");
const router = express.Router();
const listingController = require("../controllers/listings");
const wrapAsync = require("../utils/wrapAsync");
const ExpressError = require("../utils/ExpressError");
const { listingSchema } = require("../schema");
const {islogedin,isOwner}=require("../middleware.js");
const { upload } = require("../utils/cloudConfig");

const normalizeListingBody = (req, res, next) => {
    if (!req.body.listing) {
        const listing = {};
        for (const [key, value] of Object.entries(req.body)) {
            const match = key.match(/^listing\[(.+)\]$/);
            if (match) listing[match[1]] = value;
        }
        if (Object.keys(listing).length) req.body.listing = listing;
    }
    next();
};

const validateListing=(req,res,next)=>{
    let {error}=listingSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
     
    if(error){
        let errmsg=error.details.map((el)=>el.message).join(",");
        throw new ExpressError(400,errmsg);
    }else{
        next();
    }
};

// Index Route

router.get("/", wrapAsync(listingController.index));
// new Route

router.get("/new",islogedin,listingController.renderNewForm);

// show Route
router.get("/:id", wrapAsync(listingController.showListing));

// Crate Route
router.post("/",islogedin,
    upload.single("image"),
    normalizeListingBody,
    validateListing,
    wrapAsync(listingController.createListing)
);

//Edit Route
router.get("/:id/edit",islogedin,isOwner, wrapAsync(listingController.renderEditForm));

//Update Route
router.put("/:id",islogedin,isOwner,
    upload.single("image"),
    normalizeListingBody,
    validateListing,
    wrapAsync(listingController.updateListing)
);

//Delete Route
router.delete("/:id",islogedin,isOwner, wrapAsync(listingController.destroyListing));

module.exports = router;
