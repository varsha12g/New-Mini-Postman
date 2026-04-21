const express = require("express");

const { getPool } = require("../config/db");
const { inferUseCases } = require("../utils/useCases");

const router = express.Router();

router.get("/config", (req, res) => {
  res.json({
    user: req.session.user
  });
});

router.get("/history", async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `
        SELECT id, url, method, status_code, response_time_ms, created_at
        FROM request_logs
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 8
      `,
      [req.session.user.id]
    );

    return res.json({
      items: rows
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/history/:id", async (req, res, next) => {
  try {
    const pool = getPool();
    const historyId = Number(req.params.id);

    if (!Number.isInteger(historyId) || historyId <= 0) {
      return res.status(400).json({
        message: "Invalid history item."
      });
    }

    const [result] = await pool.query(
      `
        DELETE FROM request_logs
        WHERE id = ? AND user_id = ?
      `,
      [historyId, req.session.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "History item not found."
      });
    }

    return res.json({
      message: "History item deleted."
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/request", async (req, res, next) => {
  try {
    const pool = getPool();
    const { url, method, headers, body } = req.body;
    const requestMethod = String(method || "GET").toUpperCase();

    if (!url) {
      return res.status(400).json({
        message: "API URL is required."
      });
    }

    if (!/^https?:\/\//i.test(url)) {
      return res.status(400).json({
        message: "Please enter a valid URL that starts with http:// or https://"
      });
    }

    let parsedBody = undefined;
    if (body && ["POST", "PUT", "PATCH", "DELETE"].includes(requestMethod)) {
      try {
        parsedBody = typeof body === "string" ? JSON.parse(body) : body;
      } catch (error) {
        return res.status(400).json({
          message: "Body must be valid JSON."
        });
      }
    }

    const sanitizedHeaders = {};
    for (const entry of Array.isArray(headers) ? headers : []) {
      if (entry && entry.key) {
        sanitizedHeaders[String(entry.key)] = String(entry.value || "");
      }
    }

    if (parsedBody && !sanitizedHeaders["Content-Type"]) {
      sanitizedHeaders["Content-Type"] = "application/json";
    }

    const startedAt = Date.now();
    let response;
    try {
      response = await fetch(url, {
        method: requestMethod,
        headers: sanitizedHeaders,
        body: parsedBody ? JSON.stringify(parsedBody) : undefined
      });
    } catch (error) {
      return res.status(502).json({
        message: "The target API could not be reached. Check the URL or network access and try again."
      });
    }
    const duration = Date.now() - startedAt;

    const text = await response.text();
    let responseData = text;

    try {
      responseData = JSON.parse(text);
    } catch (error) {
      responseData = text;
    }

    const preview =
      typeof responseData === "string"
        ? responseData.slice(0, 1200)
        : JSON.stringify(responseData, null, 2).slice(0, 1200);

    await pool.query(
      `
        INSERT INTO request_logs (user_id, url, method, status_code, response_time_ms, response_preview)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [req.session.user.id, url, requestMethod, response.status, duration, preview]
    );

    return res.json({
      status: response.status,
      ok: response.ok,
      duration,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
      suggestions: inferUseCases(url, requestMethod, parsedBody)
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
