const fs = require("fs");
const path = require("path");

const API_BASE_URL = process.env.BACKEND_API_BASE_URL || "http://127.0.0.1:5000/api";
const PUBLIC_DIR = path.join(__dirname, "..", "frontend", "public");
const ASSETS_DIR = path.join(PUBLIC_DIR, "assets");

function setContentType(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".html") {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return;
  }

  if (ext === ".css") {
    res.setHeader("Content-Type", "text/css; charset=utf-8");
    return;
  }

  if (ext === ".js") {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    return;
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
}

function sendFile(res, filePath) {
  if (!fs.existsSync(filePath)) {
    res.statusCode = 404;
    res.end("Not found");
    return;
  }

  setContentType(res, filePath);
  res.end(fs.readFileSync(filePath));
}

function sendConfig(res) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.end(`window.APP_CONFIG = ${JSON.stringify({ apiBaseUrl: API_BASE_URL })};`);
}

module.exports = (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const pathname = url.pathname;

  if (pathname === "/") {
    res.statusCode = 302;
    res.setHeader("Location", "/login");
    res.end();
    return;
  }

  if (pathname === "/config.js") {
    sendConfig(res);
    return;
  }

  if (pathname === "/login" || pathname === "/login.html") {
    sendFile(res, path.join(PUBLIC_DIR, "login.html"));
    return;
  }

  if (pathname === "/app" || pathname === "/app.html") {
    sendFile(res, path.join(PUBLIC_DIR, "app.html"));
    return;
  }

  if (pathname.startsWith("/assets/")) {
    const relativeAssetPath = pathname.replace(/^\/assets\//, "");
    const assetPath = path.normalize(path.join(ASSETS_DIR, relativeAssetPath));

    if (!assetPath.startsWith(ASSETS_DIR)) {
      res.statusCode = 403;
      res.end("Forbidden");
      return;
    }

    sendFile(res, assetPath);
    return;
  }

  res.statusCode = 404;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Not found");
};
