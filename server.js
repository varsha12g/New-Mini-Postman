require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");

const { initializeDatabase } = require("./src/config/db");
const authRoutes = require("./src/routes/authRoutes");
const requestRoutes = require("./src/routes/requestRoutes");
const { requireAuth, requirePageAuth, attachUser } = require("./src/middleware/auth");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "mini-postman-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);
app.use(attachUser);
app.use("/assets", express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  if (req.session.user) {
    return res.redirect("/app");
  }

  return res.redirect("/login");
});

app.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/app");
  }

  return res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/app", requirePageAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "app.html"));
});

app.use("/api/auth", authRoutes);
app.use("/api", requireAuth, requestRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    message: "Something went wrong while processing the request."
  });
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Mini Postman is running on http://127.0.0.1:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize the database.");
    console.error(error);
    process.exit(1);
  });
