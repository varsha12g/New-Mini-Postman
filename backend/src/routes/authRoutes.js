const express = require("express");
const bcrypt = require("bcryptjs");

const { getCollections, serializeUser } = require("../config/db");
const { requireAuth, signAuthToken } = require("../middleware/auth");

const router = express.Router();

router.get("/me", requireAuth, (req, res) => {
  res.json({
    authenticated: true,
    user: req.user
  });
});

router.post("/register", async (req, res, next) => {
  try {
    const { users } = getCollections();
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required."
      });
    }

    const trimmedName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();

    if (!trimmedName) {
      return res.status(400).json({
        message: "Name is required."
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long."
      });
    }

    const existingUser = await users.findOne({ email: normalizedEmail }, { projection: { _id: 1 } });

    if (existingUser) {
      return res.status(409).json({
        message: "This email is already registered."
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userDocument = {
      name: trimmedName,
      email: normalizedEmail,
      passwordHash,
      createdAt: new Date()
    };

    const result = await users.insertOne(userDocument);
    const savedUser = {
      ...userDocument,
      _id: result.insertedId
    };

    return res.status(201).json({
      message: "Account created successfully.",
      token: signAuthToken(savedUser),
      user: serializeUser(savedUser)
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({
        message: "This email is already registered."
      });
    }

    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { users } = getCollections();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await users.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    return res.json({
      message: "Logged in successfully.",
      token: signAuthToken(user),
      user: serializeUser(user)
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", (req, res) => {
  res.json({
    message: "Logged out successfully."
  });
});

module.exports = router;
