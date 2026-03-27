const Listing = require("../models/listing");
const Review = require("../models/review");

module.exports.createReview = async (req, res) => {
    const listings = await Listing.findById(req.params.id);
    if (!listings) {
        req.flash("error", "Listing not found!");
        return res.redirect("/listing");
    }

    const newReview = new Review(req.body.review);
    newReview.author = req.user._id;
    listings.reviews.push(newReview._id);
    await newReview.save();
    await listings.save();
    req.flash("success", "New Review Created!");
    return res.redirect(`/listing/${listings.id}`);
};

module.exports.destroyReview = async (req, res) => {
    const { id, reviewId } = req.params;
    const listings = await Listing.findById(id);
    if (!listings) {
        req.flash("error", "Listing not found!");
        return res.redirect("/listing");
    }

    const belongsToListing = listings.reviews.some((reviewObjectId) =>
        reviewObjectId.equals(reviewId)
    );

    if (!belongsToListing) {
        req.flash("error", "Review does not belong to this listing!");
        return res.redirect(`/listing/${id}`);
    }

    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);
    req.flash("success", " Review Deleted!");
    return res.redirect(`/listing/${id}`);
};
