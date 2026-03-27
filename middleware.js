const listing = require("./models/listing");
const Review = require("./models/review");

const createRateLimiter = ({ windowMs = 10 * 60 * 1000, max = 30 } = {}) => {
    const hits = new Map();

    return (req, res, next) => {
        const now = Date.now();
        const ip = req.ip || req.connection?.remoteAddress || "unknown";
        const entry = hits.get(ip) || { count: 0, resetAt: now + windowMs };

        if (now > entry.resetAt) {
            entry.count = 0;
            entry.resetAt = now + windowMs;
        }

        entry.count += 1;
        hits.set(ip, entry);

        res.setHeader("RateLimit-Limit", String(max));
        res.setHeader("RateLimit-Remaining", String(Math.max(0, max - entry.count)));
        res.setHeader("RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

        if (entry.count > max) {
            req.flash("error", "Too many requests. Please try again in a few minutes.");
            return res.redirect(req.get("Referrer") || "/");
        }

        next();
    };
};

const islogedin = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.redirectUrl = req.originalUrl;
        req.flash("error", "You must be logged in first.");
        return res.redirect("/login");
    }
    next();
};

const saveRedirectUrl = (req, res, next) => {
    if (req.session.redirectUrl) {
        res.locals.redirectUrl = req.session.redirectUrl;
        delete req.session.redirectUrl;
    }
    next();
};

const isOwner = async (req, res, next) => {
    const { id } = req.params;
    const listings = await listing.findById(id);

    if (!listings) {
        req.flash("error", "Listing not found.");
        return res.redirect("/listing");
    }

    if (!res.locals.currUser) {
        req.flash("error", "You must be logged in first.");
        return res.redirect("/login");
    }

    if (!listings.owner.equals(res.locals.currUser._id)) {
        req.flash("error", "You don't have permission to edit this listing.");
        return res.redirect(`/listing/${id}`);
    }
    next();
};

const isReviewAuthor = async (req, res, next) => {
    const { id, reviewId } = req.params;
    const review = await Review.findById(reviewId);

    if (!review) {
        req.flash("error", "Review not found.");
        return res.redirect(`/listing/${id}`);
    }

    if (!res.locals.currUser) {
        req.flash("error", "You must be logged in first.");
        return res.redirect("/login");
    }

    if (!review.author.equals(res.locals.currUser._id)) {
        req.flash("error", "You don't have permission to delete this review.");
        return res.redirect(`/listing/${id}`);
    }
    next();
};

module.exports = {
    islogedin,
    saveRedirectUrl,
    isOwner,
    isReviewAuthor,
    createRateLimiter,
    // Backward-compatible alias for existing imports.
    isReveiwAuthor: isReviewAuthor,
};
