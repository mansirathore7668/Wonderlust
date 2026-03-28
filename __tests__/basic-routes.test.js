process.env.NODE_ENV = "test";

const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../app");
const User = require("../models/user");
const Listing = require("../models/listing");
const Review = require("../models/review");
const Booking = require("../models/booking");

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/wonderlust";
const extractCsrfToken = (html) => html.match(/name="_csrf" value="([^"]+)"/)?.[1];

beforeAll(async () => {
  await mongoose.connect(MONGO_URL);
});

afterAll(async () => {
  await User.deleteMany({ username: /^test_auth_/ });
  await Review.deleteMany({ comment: /^Test review / });
  await Listing.deleteMany({ title: /^Test listing / });
  await mongoose.disconnect();
});

describe("basic routes", () => {
  it("GET /login returns 200", async () => {
    const res = await request(app).get("/login");
    expect(res.statusCode).toBe(200);
    expect(res.text).toMatch(/name="_csrf" value="[^"]+"/);
  });

  it("GET /signup returns 200", async () => {
    const res = await request(app).get("/signup");
    expect(res.statusCode).toBe(200);
  });

  it("GET /nope returns 404", async () => {
    const res = await request(app).get("/nope");
    expect(res.statusCode).toBe(404);
  });

  it("GET /listing/new redirects guests to login", async () => {
    const res = await request(app).get("/listing/new");
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/login");
  });

  it("login persists auth and logout clears it", async () => {
    const agent = request.agent(app);
    const username = `test_auth_${Date.now()}`;
    const email = `${username}@example.com`;
    const password = "password123";

    const signupPage = await agent.get("/signup");
    const signupToken = signupPage.text.match(/name="_csrf" value="([^"]+)"/)?.[1];
    expect(signupToken).toBeTruthy();

    const signupRes = await agent
      .post("/signup")
      .type("form")
      .send({ _csrf: signupToken, username, email, password });
    expect(signupRes.statusCode).toBe(302);

    const firstLogoutRes = await agent.get("/logout");
    expect(firstLogoutRes.statusCode).toBe(302);
    expect(firstLogoutRes.headers.location).toBe("/listing");

    const loginPage = await agent.get("/login");
    const loginToken = loginPage.text.match(/name="_csrf" value="([^"]+)"/)?.[1];
    expect(loginToken).toBeTruthy();

    const loginRes = await agent
      .post("/login")
      .type("form")
      .send({ _csrf: loginToken, username, password });
    expect(loginRes.statusCode).toBe(302);
    expect(loginRes.headers.location).toContain("/listing");

    const protectedRes = await agent.get("/listing/new");
    expect(protectedRes.statusCode).toBe(200);

    const secondLogoutRes = await agent.get("/logout");
    expect(secondLogoutRes.statusCode).toBe(302);
    expect(secondLogoutRes.headers.location).toBe("/listing");

    const guestRes = await agent.get("/listing/new");
    expect(guestRes.statusCode).toBe(302);
    expect(guestRes.headers.location).toBe("/login");

    await User.deleteOne({ username });
  });

  it("authenticated non-owner can see review and booking forms on listing page", async () => {
    const ownerAgent = request.agent(app);
    const guestAgent = request.agent(app);
    const ownerUsername = `test_auth_owner_${Date.now()}`;
    const guestUsername = `test_auth_guest_${Date.now()}`;
    const password = "password123";
    const listingTitle = `Test listing ${Date.now()}`;

    const ownerSignupPage = await ownerAgent.get("/signup");
    const ownerSignupToken = extractCsrfToken(ownerSignupPage.text);
    await ownerAgent
      .post("/signup")
      .type("form")
      .send({
        _csrf: ownerSignupToken,
        username: ownerUsername,
        email: `${ownerUsername}@example.com`,
        password,
      });

    const newListingPage = await ownerAgent.get("/listing/new");
    const newListingToken = extractCsrfToken(newListingPage.text);
    await ownerAgent
      .post("/listing")
      .type("form")
      .send({
        _csrf: newListingToken,
        "listing[title]": listingTitle,
        "listing[category]": "trending",
        "listing[description]": "A valid description for authenticated listing page coverage.",
        "listing[price]": "1200",
        "listing[location]": "Jaipur",
        "listing[country]": "India",
      });

    const listing = await Listing.findOne({ title: listingTitle }).sort({ _id: -1 });
    expect(listing).toBeTruthy();

    const guestSignupPage = await guestAgent.get("/signup");
    const guestSignupToken = extractCsrfToken(guestSignupPage.text);
    await guestAgent
      .post("/signup")
      .type("form")
      .send({
        _csrf: guestSignupToken,
        username: guestUsername,
        email: `${guestUsername}@example.com`,
        password,
      });

    const showRes = await guestAgent.get(`/listing/${listing._id}`);
    expect(showRes.statusCode).toBe(200);
    expect(showRes.text).toContain("Log out");
    expect(showRes.text).toContain("Leave a review");
    expect(showRes.text).toContain("Confirm booking");

    await Listing.deleteOne({ _id: listing._id });
    await User.deleteMany({ username: { $in: [ownerUsername, guestUsername] } });
  });

  it("authenticated user can create a review and a booking", async () => {
    const ownerAgent = request.agent(app);
    const guestAgent = request.agent(app);
    const ownerUsername = `test_auth_owner_${Date.now()}`;
    const guestUsername = `test_auth_guest_${Date.now()}`;
    const password = "password123";
    const listingTitle = `Test listing ${Date.now()}`;
    const reviewComment = `Test review ${Date.now()}`;

    const ownerSignupPage = await ownerAgent.get("/signup");
    const ownerSignupToken = extractCsrfToken(ownerSignupPage.text);
    await ownerAgent
      .post("/signup")
      .type("form")
      .send({
        _csrf: ownerSignupToken,
        username: ownerUsername,
        email: `${ownerUsername}@example.com`,
        password,
      });

    const newListingPage = await ownerAgent.get("/listing/new");
    const newListingToken = extractCsrfToken(newListingPage.text);
    await ownerAgent
      .post("/listing")
      .type("form")
      .send({
        _csrf: newListingToken,
        "listing[title]": listingTitle,
        "listing[category]": "trending",
        "listing[description]": "A valid description for booking and review creation coverage.",
        "listing[price]": "900",
        "listing[location]": "Delhi",
        "listing[country]": "India",
      });

    const listing = await Listing.findOne({ title: listingTitle }).sort({ _id: -1 });
    expect(listing).toBeTruthy();

    const guestSignupPage = await guestAgent.get("/signup");
    const guestSignupToken = extractCsrfToken(guestSignupPage.text);
    await guestAgent
      .post("/signup")
      .type("form")
      .send({
        _csrf: guestSignupToken,
        username: guestUsername,
        email: `${guestUsername}@example.com`,
        password,
      });

    let showRes = await guestAgent.get(`/listing/${listing._id}`);
    let csrfToken = extractCsrfToken(showRes.text);
    expect(csrfToken).toBeTruthy();

    const reviewRes = await guestAgent
      .post(`/listing/${listing._id}/review`)
      .type("form")
      .send({
        _csrf: csrfToken,
        "review[rating]": "5",
        "review[comment]": reviewComment,
      });
    expect(reviewRes.statusCode).toBe(302);
    expect(reviewRes.headers.location).toBe(`/listing/${listing._id}`);

    const review = await Review.findOne({ comment: reviewComment }).sort({ _id: -1 });
    expect(review).toBeTruthy();

    showRes = await guestAgent.get(`/listing/${listing._id}`);
    csrfToken = extractCsrfToken(showRes.text);
    const bookingRes = await guestAgent
      .post(`/listing/${listing._id}/bookings`)
      .type("form")
      .send({
        _csrf: csrfToken,
        "booking[checkIn]": "2030-04-10",
        "booking[checkOut]": "2030-04-13",
        "booking[guests]": "2",
      });
    expect(bookingRes.statusCode).toBe(302);
    expect(bookingRes.headers.location).toBe("/bookings");

    const booking = await Booking.findOne({ listing: listing._id }).sort({ _id: -1 });
    expect(booking).toBeTruthy();
    expect(booking.status).toBe("confirmed");

    await Booking.deleteOne({ _id: booking._id });
    await Review.deleteOne({ _id: review._id });
    await Listing.deleteOne({ _id: listing._id });
    await User.deleteMany({ username: { $in: [ownerUsername, guestUsername] } });
  });
});
