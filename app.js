const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path=require("path");//for requiring ejs
require("dotenv").config();
const methodOverride = require("method-override");
const ejsmate = require('ejs-mate');
const ExpressError=require("./utils/ExpressError.js");
const flash=require("connect-flash");
const session=require("express-session");
const MongoStore = require('connect-mongo');
const helmet = require("helmet");
const csrf = require("csurf");
const MongoStore = require("connect-mongo");
const passport =require("passport");
const localStrategy = require("passport-local");
const user = require("./models/user.js");
const Listing = require("./models/listing.js");

const listingRouter = require("./routers/listing.js");
const reviewRouter = require("./routers/review.js");
const userRouter=require("./routers/user.js");
const bookingRouter = require("./routers/booking.js");
const userBookingRouter = require("./routers/userBookings.js");

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/wonderlust";
const isProduction = process.env.NODE_ENV === "production";

if (process.env.NODE_ENV !== "test") {
    main()
        .then(() => {
            console.log("connect to DB");
        })
        .catch((res) => {
            console.log(res);
        });
}

async function main() {
    await mongoose.connect(MONGO_URL);
}

app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(express.urlencoded({ extended: true, limit: "20kb" }));
app.use(methodOverride("_method"));
app.engine('ejs',ejsmate);
app.use(express.static(path.join(__dirname,"/public")));

app.use(
    helmet({
        crossOriginEmbedderPolicy: false,
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
                styleSrc: [
                    "'self'",
                    "https://cdn.jsdelivr.net",
                    "https://cdnjs.cloudflare.com",
                    "https://unpkg.com",
                    "https://fonts.googleapis.com",
                    "'unsafe-inline'",
                ],
                fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: [
                    "'self'",
                    "https://api.mapbox.com",
                    "https://nominatim.openstreetmap.org",
                ],
                frameAncestors: ["'none'"],
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                upgradeInsecureRequests: [],
            },
        },
        referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    })
);

const sanitizePlainObject = (value) => {
    if (!value || typeof value !== "object") return value;
    if (Array.isArray(value)) {
        for (const item of value) sanitizePlainObject(item);
        return value;
    }

    for (const key of Object.keys(value)) {
        const lowerKey = String(key).toLowerCase();
        const isDangerousKey =
            key.startsWith("$")
            || key.includes(".")
            || lowerKey === "__proto__"
            || lowerKey === "prototype"
            || lowerKey === "constructor";

        if (isDangerousKey) {
            delete value[key];
            continue;
        }
        sanitizePlainObject(value[key]);
    }
    return value;
};

app.use((req, res, next) => {
    sanitizePlainObject(req.body);
    sanitizePlainObject(req.query);
    sanitizePlainObject(req.params);
    next();
});

const canUseMongoStore =
    process.env.NODE_ENV !== "test" && typeof MONGO_URL === "string" && MONGO_URL.trim().length > 0;

const sessionStore = canUseMongoStore
    ? MongoStore.create({
        mongoUrl: MONGO_URL,
        touchAfter: 24 * 3600,
         crypto:{
        secret:"mysupersecretcode"
    },
    })
    : undefined;


    // const store = MongoStore.create({
    // mongoUrl:MONGO_URL,
   
    // touchAfter:24*3600,
//});
store.on("error",()=>{
    console.log("Error in MONGO SESSION STORE",err);
});

const sessionOptions ={
    store,
    secret: process.env.SESSION_SECRET || "mysupersecretcode",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie:{
        expires:Date.now()+7*24*60*60*1000,
        maxAge:7*24*60*60*1000,
        httpOnly:true,
        sameSite: "lax",
        secure: isProduction,
    },
};



app.use(session(sessionOptions));
app.use(flash());
app.use(csrf());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(user.authenticate()));

passport.serializeUser(user.serializeUser());
passport.deserializeUser(user.deserializeUser());


app.use((req,res,next)=>{
    res.locals.success=req.flash("success");
    res.locals.error=req.flash("error");
    res.locals.currUser=req.user;
    res.locals.mapboxToken = process.env.MAPBOX_TOKEN || "";
    res.locals.csrfToken = req.csrfToken();
    next();
});

app.get("/", async (req, res, next) => {
    try {
        const featured = await Listing.find({}).sort({ _id: -1 }).limit(6);
        res.render("home", { featured });
    } catch (err) {
        next(err);
    }
});

if (process.env.ENABLE_DEMO_USER === "true") {
    app.get("/demouser",async(req,res)=>{
        let fakeuser=new user({
            email:"student@gmail.com",
            username:"delta-student",
        });
        await user.register(fakeuser,"helloworld");
        req.flash("success", "Demo user created.");
        res.redirect("/login");
    });
}

// Use Routers
app.use("/listing", listingRouter);
app.use("/listing/:id", reviewRouter);
app.use("/listing/:id/bookings", bookingRouter);
app.use("/bookings", userBookingRouter);
app.use("/",userRouter);

app.use((err, req, res, next) => {
    if (err.code === "EBADCSRFTOKEN") {
        req.flash("error", "Invalid or expired form token. Please try again.");
        return res.status(403).redirect(req.get("Referrer") || "/");
    }
    next(err);
});

app.use((req,res,next)=>{
    next(new ExpressError(404,"Page not found!")); 
});

app.use((err,req,res,next)=>{
    if (res.headersSent) {
        return next(err);
    }
    let{statusCode=500,message="somthing went wrong!"}=err;

    if (err.name === "MulterError") {
        statusCode = 400;
        message = err.message || "File upload failed.";
    }

    if (err.message === "Only image files are allowed.") {
        statusCode = 400;
        message = err.message;
    }
    //res.status(statusCode).send(message);
    res.status(statusCode).render("error",{message});
});

const PORT = Number(process.env.PORT) || 8080;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`server is listening on port ${PORT}`);
    });
}

module.exports = app;
