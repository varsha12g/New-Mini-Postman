const express = require("express");

const { getCollections, serializeCreatedApi, toObjectId } = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

function normalizeHeaders(headers) {
  return (Array.isArray(headers) ? headers : [])
    .map((entry) => ({
      key: String(entry?.key || "").trim(),
      value: String(entry?.value || "").trim()
    }))
    .filter((entry) => entry.key);
}

function parseApiBody(body) {
  if (body === undefined || body === null || body === "") {
    return {
      body: null,
      bodyText: ""
    };
  }

  if (typeof body === "string") {
    return {
      body: JSON.parse(body),
      bodyText: body
    };
  }

  return {
    body,
    bodyText: JSON.stringify(body, null, 2)
  };
}

router.use(requireAuth);

router.get("/created-apis", async (req, res, next) => {
  try {
    const { createdApis } = getCollections();
    const items = await createdApis
      .find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(24)
      .toArray();

    return res.json({
      items: items.map(serializeCreatedApi)
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/created-apis", async (req, res, next) => {
  try {
    const { createdApis } = getCollections();
    const { name, description, apiLink, method, headers, body } = req.body;
    const trimmedName = String(name || "").trim();
    const trimmedDescription = String(description || "").trim();
    const normalizedMethod = String(method || "GET").trim().toUpperCase();
    const trimmedApiLink = String(apiLink || "").trim();

    if (!trimmedName) {
      return res.status(400).json({
        message: "API name is required."
      });
    }

    if (!trimmedApiLink) {
      return res.status(400).json({
        message: "API link is required."
      });
    }

    if (!/^https?:\/\//i.test(trimmedApiLink)) {
      return res.status(400).json({
        message: "API link must start with http:// or https://"
      });
    }

    if (!ALLOWED_METHODS.has(normalizedMethod)) {
      return res.status(400).json({
        message: "Choose a valid HTTP method."
      });
    }

    let parsedBody;
    try {
      parsedBody = parseApiBody(body);
    } catch (error) {
      return res.status(400).json({
        message: "Sample body must be valid JSON."
      });
    }

    const document = {
      userId: req.user.id,
      userEmail: req.user.email,
      name: trimmedName,
      description: trimmedDescription,
      apiLink: trimmedApiLink,
      method: normalizedMethod,
      headers: normalizeHeaders(headers),
      body: parsedBody.body,
      bodyText: parsedBody.bodyText,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await createdApis.insertOne(document);

    return res.status(201).json({
      message: "API created successfully.",
      item: serializeCreatedApi({
        ...document,
        _id: result.insertedId
      })
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/created-apis/:id", async (req, res, next) => {
  try {
    const { createdApis } = getCollections();
    const apiId = toObjectId(req.params.id);

    if (!apiId) {
      return res.status(400).json({
        message: "Invalid API item."
      });
    }

    const result = await createdApis.deleteOne({
      _id: apiId,
      userId: req.user.id
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "API item not found."
      });
    }

    return res.json({
      message: "API item deleted."
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
