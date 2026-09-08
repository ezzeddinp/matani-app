// Vercel builds this repository from the root. Keep the server implementation in
// backend/ and expose the Express app through the root entrypoint Vercel detects.
export { default } from "./backend/app.js";
