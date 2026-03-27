const express = require("express");
const router = express.Router({ mergeParams: true });

const bookingController = require("../controllers/bookings");
const wrapAsync = require("../utils/wrapAsync");
const ExpressError = require("../utils/ExpressError");
const { bookingSchema } = require("../schema");
const { islogedin } = require("../middleware");

const validateBooking = (req, res, next) => {
  const { error } = bookingSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    const errmsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errmsg);
  }
  next();
};

router.post(
  "/",
  islogedin,
  validateBooking,
  wrapAsync(bookingController.createBooking)
);

module.exports = router;
