const Listing = require("../models/listing");
const { uploadToCloudinary, hasValidCloudinaryConfig } = require("../utils/cloudConfig");

const CATEGORY_OPTIONS = [
    { key: "trending", label: "Trending", icon: "fa-fire" },
    { key: "rooms", label: "Rooms", icon: "fa-bed" },
    { key: "beach", label: "Beach", icon: "fa-umbrella-beach" },
    { key: "mountains", label: "Mountains", icon: "fa-mountain" },
    { key: "city", label: "City", icon: "fa-city" },
    { key: "camping", label: "Camping", icon: "fa-campground" },
    { key: "farm", label: "Farm", icon: "fa-tractor" },
    { key: "lake", label: "Lake", icon: "fa-water" },
    { key: "desert", label: "Desert", icon: "fa-sun" },
    { key: "historic", label: "Historic", icon: "fa-landmark" },
];

module.exports.index = async (req, res) => {
    const qRaw = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const q = qRaw.length ? qRaw.slice(0, 80) : "";
    const pageRaw = typeof req.query.page === "string" ? req.query.page.trim() : "";
    const parsedPage = Number(pageRaw);
    const page = Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : 1;
    const limit = 12;

    const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parseNonNegativeNumber = (value) => {
        if (typeof value !== "string") return null;
        const trimmed = value.trim();
        if (!trimmed.length) return null;
        const num = Number(trimmed);
        if (!Number.isFinite(num) || num < 0) return null;
        return num;
    };

    const minPrice = parseNonNegativeNumber(req.query.minPrice);
    const maxPrice = parseNonNegativeNumber(req.query.maxPrice);
    const countryRaw = typeof req.query.country === "string" ? req.query.country.trim() : "";
    const country = countryRaw.length ? countryRaw.slice(0, 60) : "";
    const locationRaw = typeof req.query.location === "string" ? req.query.location.trim() : "";
    const location = locationRaw.length ? locationRaw.slice(0, 60) : "";
    const categoryRaw = typeof req.query.category === "string" ? req.query.category.trim() : "";
    const category = Listing.CATEGORY_KEYS && Listing.CATEGORY_KEYS.includes(categoryRaw) ? categoryRaw : "";

    const sortRaw = typeof req.query.sort === "string" ? req.query.sort.trim() : "";
    const sort = ["relevance", "newest", "price_asc", "price_desc"].includes(sortRaw) ? sortRaw : "relevance";

    const query = {};
    if (q) {
        const regex = new RegExp(escapeRegex(q), "i");
        query.$or = [{ title: regex }, { location: regex }, { country: regex }];
    }

    if (country) query.country = new RegExp(escapeRegex(country), "i");
    if (location) query.location = new RegExp(escapeRegex(location), "i");
    if (category) query.category = category;

    if (minPrice !== null || maxPrice !== null) {
        query.price = {};
        if (minPrice !== null) query.price.$gte = minPrice;
        if (maxPrice !== null) query.price.$lte = maxPrice;
        if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
            query.price = { $gte: maxPrice, $lte: minPrice };
        }
    }

    const sortSpec =
        sort === "newest"
            ? { createdAt: -1 }
            : sort === "price_asc"
                ? { price: 1 }
                : sort === "price_desc"
                    ? { price: -1 }
                    : undefined;

    const totalCount = await Listing.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * limit;

    let listingQuery = Listing.find(query);
    if (sortSpec) listingQuery = listingQuery.sort(sortSpec);
    const allListing = await listingQuery.skip(skip).limit(limit);

    const activeFiltersCount = [
        category ? 1 : 0,
        country ? 1 : 0,
        location ? 1 : 0,
        minPrice !== null ? 1 : 0,
        maxPrice !== null ? 1 : 0,
        sort !== "relevance" ? 1 : 0,
    ].reduce((sum, n) => sum + n, 0);

    const startIndex = totalCount === 0 ? 0 : skip + 1;
    const endIndex = skip + allListing.length;

    const buildPages = (current, total) => {
        if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
        const pages = new Set([1, total]);
        for (let p = current - 2; p <= current + 2; p += 1) {
            if (p >= 1 && p <= total) pages.add(p);
        }
        return Array.from(pages).sort((a, b) => a - b);
    };

    res.render("listings/index.ejs", {
        allListing,
        totalCount,
        startIndex,
        endIndex,
        q,
        categories: CATEGORY_OPTIONS,
        filters: {
            minPrice: minPrice ?? "",
            maxPrice: maxPrice ?? "",
            category,
            country,
            location,
            sort,
        },
        activeFiltersCount,
        pagination: {
            page: safePage,
            totalPages,
            hasPrev: safePage > 1,
            hasNext: safePage < totalPages,
            prevPage: safePage > 1 ? safePage - 1 : 1,
            nextPage: safePage < totalPages ? safePage + 1 : totalPages,
            pages: buildPages(safePage, totalPages),
        },
    });
};

module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs", { categories: CATEGORY_OPTIONS });
};

module.exports.showListing = async (req, res) => {
    const { id } = req.params;
    const listings = await Listing.findById(id)
        .populate({
            path: "reviews",
            populate: { path: "author" },
        })
        .populate("owner");

    if (!listings) {
        req.flash("error", " Listing you requested for does not exist!");
        return res.redirect("/listing");
    }

    const categoryMeta = CATEGORY_OPTIONS.find((cat) => cat.key === listings.category) || null;
    res.render("listings/show.ejs", { listings, categoryMeta });
};

module.exports.createListing = async (req, res) => {
    const newlisting = new Listing(req.body.listing);
    newlisting.owner = req.user._id;

    if (req.file) {
        if (!hasValidCloudinaryConfig()) {
            req.flash("error", "Cloudinary is not configured. Listing created with default image.");
        } else {
            try {
                const uploadedImage = await uploadToCloudinary(req.file.buffer);
                newlisting.image = uploadedImage.secure_url;
            } catch (err) {
                req.flash("error", "Image upload failed. Listing created with default image.");
            }
        }
    }

    await newlisting.save();
    req.flash("success", "New Listing Created!");
    res.redirect("/listing");
};

module.exports.renderEditForm = async (req, res) => {
    const { id } = req.params;
    const listings = await Listing.findById(id);

    if (!listings) {
        req.flash("error", " Listing you requested for does not exist!");
        return res.redirect("/listing");
    }

    res.render("listings/edit.ejs", { listings, categories: CATEGORY_OPTIONS });
};

module.exports.updateListing = async (req, res) => {
    const { id } = req.params;
    const updatedListing = await Listing.findByIdAndUpdate(id, { ...req.body.listing }, { new: true });

    if (req.file && updatedListing) {
        if (!hasValidCloudinaryConfig()) {
            req.flash("error", "Cloudinary is not configured. Image was not updated.");
        } else {
            try {
                const uploadedImage = await uploadToCloudinary(req.file.buffer);
                updatedListing.image = uploadedImage.secure_url;
                await updatedListing.save();
            } catch (err) {
                req.flash("error", "Image upload failed. Previous image is kept.");
            }
        }
    }

    req.flash("success", " Listing Updated!");
    res.redirect(`/listing/${id}`);
};

module.exports.destroyListing = async (req, res) => {
    const { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", " Listing Deleted!");
    res.redirect("/listing");
};
