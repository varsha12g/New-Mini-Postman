const express = require("express");
const bcrypt = require("bcryptjs");

const { getPool } = require("../config/db");

const router = express.Router();

router.get("/session", (req, res) => {
  if (!req.session.user) {
    return res.json({
      authenticated: false
    });
  }

  return res.json({
    authenticated: true,
    user: req.session.user
  });
});

router.post("/register", async (req, res, next) => {
  try {
    const pool = getPool();
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required."
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long."
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const [existingUsers] = await pool.query("SELECT id FROM users WHERE email = ?", [normalizedEmail]);

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: "This email is already registered."
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [String(name).trim(), normalizedEmail, passwordHash]
    );

    req.session.user = {
      id: result.insertId,
      name: String(name).trim(),
      email: normalizedEmail
    };

    return res.status(201).json({
      message: "Account created successfully.",
      user: req.session.user
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const pool = getPool();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required."
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const [rows] = await pool.query(
      "SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email
    };

    return res.json({
      message: "Logged in successfully.",
      user: req.session.user
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", (req, res, next) => {
  req.session.destroy((error) => {
    if (error) {
      return next(error);
    }

    res.clearCookie("connect.sid");
    return res.json({
      message: "Logged out successfully."
    });
  });
});

module.exports = router;
