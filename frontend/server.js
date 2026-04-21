require("dotenv").config();

const path = require("path");
const express = require("express");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const API_BASE_URL = process.env.BACKEND_API_BASE_URL || "http://127.0.0.1:5000/api";

app.use("/assets", express.static(path.join(__dirname, "public", "assets")));

app.get("/config.js", (req, res) => {
  res.type("application/javascript");
  res.send(`window.APP_CONFIG = ${JSON.stringify({ apiBaseUrl: API_BASE_URL })};`);
});

app.get("/", (req, res) => {
  res.redirect("/login");
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/app", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "app.html"));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Frontend app is running on http://127.0.0.1:${PORT}`);
    console.log(`Frontend is targeting backend API ${API_BASE_URL}`);
  });
}

module.exports = app;
