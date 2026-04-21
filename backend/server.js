require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { initializeDatabase } = require("./src/config/db");
const authRoutes = require("./src/routes/authRoutes");
const requestRoutes = require("./src/routes/requestRoutes");

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const CUSTOM_ALLOWED_ORIGINS = String(process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  if (CUSTOM_ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }

  return (
    /^http:\/\/(127\.0\.0\.1|localhost):3000$/i.test(origin) ||
    /^https:\/\/.+\.vercel\.app$/i.test(origin)
  );
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
    optionsSuccessStatus: 204
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "backend"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api", requestRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    message: "Something went wrong while processing the request."
  });
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend API is running on http://127.0.0.1:${PORT}`);
      console.log("CORS allows localhost:3000, Vercel preview domains, and any CORS_ALLOWED_ORIGINS entries.");
    });
  })
  .catch((error) => {
    console.error("Failed to initialize the MongoDB connection.");
    console.error("Check that MongoDB is running and backend/.env has a valid MONGODB_URI.");
    console.error(error);
    process.exit(1);
  });
