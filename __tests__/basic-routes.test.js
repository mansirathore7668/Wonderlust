process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../app");

describe("basic routes", () => {
  it("GET /login returns 200", async () => {
    const res = await request(app).get("/login");
    expect(res.statusCode).toBe(200);
  });

  it("GET /signup returns 200", async () => {
    const res = await request(app).get("/signup");
    expect(res.statusCode).toBe(200);
  });

  it("GET /nope returns 404", async () => {
    const res = await request(app).get("/nope");
    expect(res.statusCode).toBe(404);
  });
});
