const passport = require("passport");
const User = require("../models/user");

module.exports.renderSignupForm = (req, res) => {
    res.render("users/signup.ejs");
};

module.exports.signup = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : email;
        const normalizedUsername = typeof username === "string" ? username.trim() : username;

        const newUser = new User({ email: normalizedEmail, username: normalizedUsername });
        const registeredUser = await User.register(newUser, password);

        req.login(registeredUser, (err) => {
            if (err) {
                return next(err);
            }
            req.flash("success", "welcome to wonderlust");
            res.redirect("/listing");
        });
    } catch (e) {
        req.flash("error", e.message);
        res.redirect("/signup");
    }
};

module.exports.renderLoginForm = (req, res) => {
    res.render("users/login.ejs");
};

module.exports.login = async (req, res) => {
    req.flash("success", "Welcome back to wonderlust");
    res.redirect(res.locals.redirectUrl || "/listing");
};

module.exports.logout = (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash("success", "you are loged out");
        res.redirect("/listing");
    });
};

module.exports.authenticateUser = passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
});
