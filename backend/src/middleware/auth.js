const jwt = require("jsonwebtoken");

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
    const userId = toObjectId(payload.sub);

    if (!userId) {
      return res.status(401).json({
        message: "Invalid token."
      });
    }

    const { users } = getCollections();
    const user = await users.findOne({ _id: userId });

    if (!user) {
      return res.status(401).json({
        message: "User not found for this token."
      });
    }

    req.user = serializeUser(user);
    req.userDocument = user;
    return next();
  } catch (error) {
    return res.status(401).json({
      message: "Your session has expired. Please login again."
    });
  }
}

module.exports = {
  requireAuth,
  signAuthToken
};
