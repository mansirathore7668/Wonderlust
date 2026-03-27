const express = require("express");
const router = express.Router();

const bookingController = require("../controllers/bookings");
const wrapAsync = require("../utils/wrapAsync");
const { islogedin } = require("../middleware");

router.get("/", islogedin, wrapAsync(bookingController.listBookings));

router.delete("/:id", islogedin, wrapAsync(bookingController.cancelBooking));

module.exports = router;
