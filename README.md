# Wonderlust (Major Project)

Full-stack listings app (Airbnb-style) built with Node.js, Express, MongoDB (Mongoose), and EJS.

## Features
- Auth: signup/login/logout with Passport (local strategy)
- Listings: create/edit/delete (owner-only) + image upload (Cloudinary)
- Reviews: create/delete (author-only)
- Explore: search + filters + sort + pagination
- UX: modern responsive UI (Bootstrap) + client-side form validation
- Security basics: Helmet + CSP, CSRF protection, input sanitization, auth rate limiting

## Tech stack
- Backend: Express, Mongoose, Passport, Joi
- Frontend: EJS, Bootstrap 5, Font Awesome
- Media: Multer + Cloudinary
- Maps: Leaflet (token via env)

## Getting started (local)
1. Install deps:
   - `npm install`
2. Create `.env` (copy from `.env.example`):
   - `cp .env.example .env`
3. Start MongoDB locally (or set `MONGO_URL` to a hosted cluster).
4. Run the server:
   - `npm run dev`
5. Open:
   - `http://localhost:8080`

## Scripts
- `npm run dev` - start with nodemon
- `npm start` - start with node
- `npm test` - run Jest tests

## Environment variables
See `.env.example`.

## Tests
Basic route tests are in `__tests__/`. Add more API and model tests as you grow the app.

## Notes
- Do not commit real secrets in `.env` (Cloudinary keys, session secret, etc.).
- If you deploy behind a proxy (Render/Railway/Nginx), keep `NODE_ENV=production` to enable secure cookies.
