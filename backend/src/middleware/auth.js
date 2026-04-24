const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const { getCollections, serializeUser, toObjectId } = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET || "mini-postman-local-jwt-secret";
const TOKEN_EXPIRY = "8h";

function signAuthToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      name: user.name
    },
    JWT_SECRET,
    {
      expiresIn: TOKEN_EXPIRY
    }
  );
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

async function revokeAuthToken(token, payload) {
  if (!token) {
    return;
  }

  const { revokedTokens } = getCollections();
  const expiresAt =
    payload?.exp && Number.isFinite(payload.exp) ? new Date(payload.exp * 1000) : new Date(Date.now() + 8 * 60 * 60 * 1000);

  await revokedTokens.updateOne(
    { tokenHash: hashToken(token) },
    {
      $set: {
        tokenHash: hashToken(token),
        userId: payload?.sub || null,
        expiresAt,
        revokedAt: new Date()
      }
    },
    { upsert: true }
  );
}

async function requireAuth(req, res, next) {
  try {
    const authorization = req.headers.authorization || "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        message: "Authorization token is missing."
      });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    const { revokedTokens, users } = getCollections();
    const revokedToken = await revokedTokens.findOne({ tokenHash: hashToken(token) }, { projection: { _id: 1 } });

    if (revokedToken) {
      return res.status(401).json({
        message: "Your session has expired. Please login again."
      });
    }

    const userId = toObjectId(payload.sub);

    if (!userId) {
      return res.status(401).json({
        message: "Invalid token."
      });
    }

    const user = await users.findOne({ _id: userId });

    if (!user) {
      return res.status(401).json({
        message: "User not found for this token."
      });
    }

    req.user = serializeUser(user);
    req.userDocument = user;
    req.authToken = token;
    req.authPayload = payload;
    return next();
  } catch (error) {
    return res.status(401).json({
      message: "Your session has expired. Please login again."
    });
  }
}

module.exports = {
  requireAuth,
  revokeAuthToken,
  signAuthToken
};
