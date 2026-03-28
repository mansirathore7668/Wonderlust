const passport = require("passport");
const User = require("../models/user");

module.exports.renderSignupForm = (req, res) => {
    res.render("users/signup.ejs", { csrfToken: req.csrfToken() });
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
            req.session.save((saveErr) => {
                if (saveErr) {
                    return next(saveErr);
                }
                res.redirect("/listing?welcome=1");
            });
        });
    } catch (e) {
        req.flash("error", e.message);
        res.redirect("/signup");
    }
};

module.exports.renderLoginForm = (req, res) => {
    res.render("users/login.ejs", { csrfToken: req.csrfToken() });
};

module.exports.login = async (req, res, next) => {
    const target = res.locals.redirectUrl || "/listing";
    const redirectUrl = target.includes("?") ? `${target}&welcome=1` : `${target}?welcome=1`;
    req.session.save((err) => {
        if (err) {
            return next(err);
        }
        res.redirect(redirectUrl);
    });
};

module.exports.logout = (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.session.destroy((sessionErr) => {
            if (sessionErr) {
                return next(sessionErr);
            }
            res.clearCookie("wl.sid");
            res.redirect("/listing");
        });
    });
};

module.exports.authenticateUser = passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
});
