const express = require("express");

const { getCollections, serializeRequestLog, toObjectId } = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const { inferUseCases } = require("../utils/useCases");

const router = express.Router();
const REQUEST_TIMEOUT_MS = 15000;

router.use(requireAuth);

router.get("/config", (req, res) => {
  res.json({
    user: req.user
  });
});

router.get("/history", async (req, res, next) => {
  try {
    const { requestLogs } = getCollections();
    const items = await requestLogs
      .find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(8)
      .toArray();

    return res.json({
      items: items.map(serializeRequestLog)
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/history/:id", async (req, res, next) => {
  try {
    const { requestLogs } = getCollections();
    const historyId = toObjectId(req.params.id);

    if (!historyId) {
      return res.status(400).json({
        message: "Invalid history item."
      });
    }

    const result = await requestLogs.deleteOne({
      _id: historyId,
      userId: req.user.id
    });

    if (result.deletedCount === 0) {
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
    const { requestLogs } = getCollections();
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

    let parsedBody;
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
        body: parsedBody ? JSON.stringify(parsedBody) : undefined,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });
    } catch (error) {
      return res.status(502).json({
        message:
          error?.name === "TimeoutError"
            ? `The target API took longer than ${REQUEST_TIMEOUT_MS / 1000} seconds to respond.`
            : "The target API could not be reached. Check the URL or network access and try again."
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

    await requestLogs.insertOne({
      userId: req.user.id,
      userEmail: req.user.email,
      url,
      apiLink: url,
      method: requestMethod,
      requestHeaders: sanitizedHeaders,
      requestBody: parsedBody ?? null,
      statusCode: response.status,
      responseTimeMs: duration,
      responsePreview: preview,
      responseBody: responseData,
      createdAt: new Date()
    });

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
