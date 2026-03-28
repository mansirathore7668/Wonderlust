const Booking = require("../models/booking");
const Listing = require("../models/listing");

const normalizeDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const nightsBetween = (checkIn, checkOut) => {
  const diffMs = checkOut.getTime() - checkIn.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

module.exports.createBooking = async (req, res) => {
  const listingId = req.params.id;
  const listing = await Listing.findById(listingId);

  if (!listing) {
    req.flash("error", "Listing not found.");
    return res.redirect("/listing");
  }

  if (listing.owner && listing.owner.equals(req.user._id)) {
    req.flash("error", "You can't book your own listing.");
    return res.redirect(`/listing/${listingId}`);
  }

  const checkIn = normalizeDate(req.body.booking.checkIn);
  const checkOut = normalizeDate(req.body.booking.checkOut);

  if (!checkIn || !checkOut || checkOut <= checkIn) {
    req.flash("error", "Please select a valid date range.");
    return res.redirect(`/listing/${listingId}`);
  }

  const overlap = await Booking.findOne({
    listing: listingId,
    status: "confirmed",
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
  });

  if (overlap) {
    req.flash("error", "These dates are already booked. Try different dates.");
    return res.redirect(`/listing/${listingId}`);
  }

  const nights = nightsBetween(checkIn, checkOut);
  const totalPrice = Math.max(0, nights * Number(listing.price || 0));

  const booking = new Booking({
    listing: listingId,
    user: req.user._id,
    checkIn,
    checkOut,
    guests: Number(req.body.booking.guests),
    totalPrice,
  });

  await booking.save();
  req.flash("success", "Booking confirmed!");
  res.redirect("/bookings");
};

module.exports.listBookings = async (req, res) => {
  const bookings = await Booking.find({ user: req.user._id })
    .populate("listing")
    .sort({ createdAt: -1 });

  res.render("bookings/index", { bookings, csrfToken: req.csrfToken() });
};

module.exports.cancelBooking = async (req, res) => {
  const bookingId = req.params.id;
  const booking = await Booking.findOne({ _id: bookingId, user: req.user._id });

  if (!booking) {
    req.flash("error", "Booking not found.");
    return res.redirect("/bookings");
  }

  booking.status = "cancelled";
  await booking.save();
  req.flash("success", "Booking cancelled.");
  res.redirect("/bookings");
};
