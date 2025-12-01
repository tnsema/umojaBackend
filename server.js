// server.js (or index.js)
import express from "express";
import cors from "cors";
import http from "http"; // only needed if you’ll attach websockets; otherwise omit
import mongoose from "mongoose";
import frontroutes from "./routes/front.routes.js";

// if you’re using ESM, include the .js extension:
import config from "./config/config.js";

const app = express();
const server = http.createServer(app);

/* ---------- middleware ---------- */
app.use(
  cors({
    origin: config.clientOrigin || "http://localhost:3000",
    credentials: true,
  })
);

// replaces body-parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ---------- db connect (Mongoose 6/7/8) ---------- */
(async () => {
  try {
    await mongoose.connect(config.mongoURI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    console.log("Database connected");
  } catch (err) {
    console.error("failed to connect database", err);
    process.exit(1);
  }
})();

/* ---------- routes ---------- */

app.use("/api", frontroutes);

app.get("/", (_req, res) => {
  res.send("Hello from Umoja Backend API");
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

/* ---------- server ---------- */
// If you don’t need websockets, you can use app.listen directly:
server.listen(config.port, () => {
  console.log(`App listening on port ${config.port}`);
});

// If you plan to add Socket.IO later, do:
// const server = http.createServer(app);
// server.listen(config.port, () => console.log(`App on :${config.port}`));
