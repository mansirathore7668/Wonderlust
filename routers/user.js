const express = require("express");
const router = express.Router();
const userController = require("../controllers/users");
const wrapAsync = require("../utils/wrapAsync");
const { userSignupSchema, userLoginSchema } = require("../schema");
const {saveRedirectUrl}=require("../middleware.js");
const { createRateLimiter } = require("../middleware.js");

const authRateLimit = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 20 });

const validateSignup = (req, res, next) => {
    const { error } = userSignupSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
        const errmsg = error.details.map((el) => el.message).join(",");
        req.flash("error", errmsg);
        return res.redirect("/signup");
    }
    next();
};

const validateLogin = (req, res, next) => {
    const { error } = userLoginSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
        const errmsg = error.details.map((el) => el.message).join(",");
        req.flash("error", errmsg);
        return res.redirect("/login");
    }
    next();
};

router.get("/signup",userController.renderSignupForm);

router.post("/signup", authRateLimit, validateSignup, wrapAsync(userController.signup));

router.get("/login" ,userController.renderLoginForm);

router.post(
    "/login",
    authRateLimit,
    saveRedirectUrl,
    validateLogin,
    userController.authenticateUser,
    userController.login
);

router.get("/logout",userController.logout);
module.exports = router;
