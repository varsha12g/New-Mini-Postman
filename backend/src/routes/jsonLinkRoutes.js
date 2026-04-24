const express = require("express");

const { getCollections, serializeJsonLink, toObjectId } = require("../config/db");

const router = express.Router();

router.get("/links", async (req, res, next) => {
  try {
    const { jsonLinks } = getCollections();
    const items = await jsonLinks.find({}).sort({ createdAt: -1 }).limit(50).toArray();

    return res.json({
      items: items.map(serializeJsonLink)
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/links", async (req, res, next) => {
  try {
    const { jsonLinks } = getCollections();
    const { name, json, payload } = req.body;
    const trimmedName = String(name || "").trim() || "Untitled JSON";

    let normalizedPayload = payload ?? json;

    if (typeof normalizedPayload === "string") {
      try {
        normalizedPayload = JSON.parse(normalizedPayload);
      } catch (error) {
        return res.status(400).json({
          message: "JSON data must be valid JSON."
        });
      }
    }

    if (normalizedPayload === undefined) {
      return res.status(400).json({
        message: "JSON data is required."
      });
    }

    const result = await jsonLinks.insertOne({
      name: trimmedName,
      payload: normalizedPayload,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const item = await jsonLinks.findOne({ _id: result.insertedId });
    const serializedItem = serializeJsonLink({
      ...item,
      apiLink: `/api/data/${result.insertedId.toString()}`
    });

    await jsonLinks.updateOne(
      { _id: result.insertedId },
      {
        $set: {
          apiLink: serializedItem.api_link
        }
      }
    );

    return res.status(201).json({
      message: "JSON API link created successfully.",
      item: serializedItem
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/data/:id", async (req, res, next) => {
  try {
    const { jsonLinks } = getCollections();
    const linkId = toObjectId(req.params.id);

    if (!linkId) {
      return res.status(400).json({
        message: "Invalid API link id."
      });
    }

    const item = await jsonLinks.findOne({ _id: linkId });

    if (!item) {
      return res.status(404).json({
        message: "JSON API link not found."
      });
    }

    return res.json(item.payload);
  } catch (error) {
    return next(error);
  }
});

router.delete("/links/:id", async (req, res, next) => {
  try {
    const { jsonLinks } = getCollections();
    const linkId = toObjectId(req.params.id);

    if (!linkId) {
      return res.status(400).json({
        message: "Invalid JSON link id."
      });
    }

    const result = await jsonLinks.deleteOne({ _id: linkId });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "JSON link not found."
      });
    }

    return res.json({
      message: "JSON link deleted successfully."
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
