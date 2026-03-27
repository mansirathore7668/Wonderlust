const Joi = require("joi");

module.exports.listingSchema = Joi.object({
    listing: Joi.object({
        title: Joi.string().trim().min(3).max(80).required(),
        description: Joi.string().trim().min(10).max(2000).required(),
        location: Joi.string().trim().min(2).max(60).required(),
        country: Joi.string().trim().min(2).max(60).required(),
        price: Joi.number().required().min(0),
        category: Joi.string()
            .valid("trending", "rooms", "beach", "mountains", "city", "camping", "farm", "lake", "desert", "historic")
            .required(),
        image: Joi.string().allow("", null),

    }).required()
});

module.exports.reviewSchema = Joi.object({
    review: Joi.object({
        rating: Joi.number().required().min(1).max(5),
        comment: Joi.string().trim().min(2).max(800).required(),
    }).required()
});

module.exports.userSignupSchema = Joi.object({
    username: Joi.string()
        .trim()
        .min(3)
        .max(30)
        .pattern(/^[a-zA-Z0-9._-]+$/)
        .required(),
    email: Joi.string().trim().email().max(120).required(),
    password: Joi.string().min(8).max(72).required(),
});

module.exports.userLoginSchema = Joi.object({
    username: Joi.string().trim().min(1).max(30).required(),
    password: Joi.string().min(1).max(72).required(),
});

module.exports.bookingSchema = Joi.object({
    booking: Joi.object({
        checkIn: Joi.date().required(),
        checkOut: Joi.date().required(),
        guests: Joi.number().integer().min(1).max(6).required(),
    }).required(),
});
