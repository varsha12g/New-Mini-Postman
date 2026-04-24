const { MongoClient, ObjectId } = require("mongodb");

const DEFAULT_URI = "mongodb://127.0.0.1:27017/mini_postman";
const DEFAULT_DB_NAME = "mini_postman";
const DEFAULT_SERVER_SELECTION_TIMEOUT_MS = 10000;
const DEFAULT_CONNECT_TIMEOUT_MS = 10000;

let client;
let database;
let collections;

function getDatabaseName() {
  if (process.env.MONGODB_DB) {
    return process.env.MONGODB_DB;
  }

  const uri = process.env.MONGODB_URI || DEFAULT_URI;

  try {
    const parsed = new URL(uri);
    const databaseName = parsed.pathname.replace(/^\//, "").trim();
    return databaseName || DEFAULT_DB_NAME;
  } catch (error) {
    return DEFAULT_DB_NAME;
  }
}

async function initializeDatabase() {
  const uri = process.env.MONGODB_URI || DEFAULT_URI;
  const dbName = getDatabaseName();

  client = new MongoClient(uri, {
    serverSelectionTimeoutMS: Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS) || DEFAULT_SERVER_SELECTION_TIMEOUT_MS,
    connectTimeoutMS: Number(process.env.MONGODB_CONNECT_TIMEOUT_MS) || DEFAULT_CONNECT_TIMEOUT_MS
  });

  try {
    await client.connect();
    database = client.db(dbName);
    await database.command({ ping: 1 });
  } catch (error) {
    await client.close().catch(() => {});
    client = null;
    database = null;
    collections = null;

    const errorMessage = error?.message || "Unknown MongoDB connection error.";
    throw new Error(`Could not connect to MongoDB database "${dbName}". ${errorMessage}`);
  }

  collections = {
    users: database.collection("users"),
    requestLogs: database.collection("request_logs"),
    createdApis: database.collection("created_apis"),
    revokedTokens: database.collection("revoked_tokens"),
    jsonLinks: database.collection("json_links")
  };

  await Promise.all([
    collections.users.createIndex({ email: 1 }, { unique: true }),
    collections.requestLogs.createIndex({ userId: 1, createdAt: -1 }),
    collections.createdApis.createIndex({ userId: 1, createdAt: -1 }),
    collections.revokedTokens.createIndex({ tokenHash: 1 }, { unique: true }),
    collections.revokedTokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    collections.jsonLinks.createIndex({ createdAt: -1 })
  ]);
}

function getCollections() {
  if (!collections) {
    throw new Error("Database has not been initialized yet.");
  }

  return collections;
}

function toObjectId(value) {
  if (!ObjectId.isValid(value)) {
    return null;
  }

  return new ObjectId(value);
}

function serializeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email
  };
}

function serializeRequestLog(entry) {
  return {
    id: entry._id.toString(),
    url: entry.url,
    api_link: entry.apiLink || entry.url,
    method: entry.method,
    status_code: entry.statusCode ?? null,
    response_time_ms: entry.responseTimeMs,
    response_preview: entry.responsePreview || "",
    response_body: entry.responseBody ?? null,
    created_at: entry.createdAt
  };
}

function serializeCreatedApi(entry) {
  return {
    id: entry._id.toString(),
    name: entry.name,
    description: entry.description || "",
    api_link: entry.apiLink,
    url: entry.apiLink,
    method: entry.method,
    headers: Array.isArray(entry.headers) ? entry.headers : [],
    body: entry.body ?? null,
    body_text: entry.bodyText || "",
    created_at: entry.createdAt,
    updated_at: entry.updatedAt || entry.createdAt
  };
}

function serializeJsonLink(entry) {
  return {
    id: entry._id.toString(),
    name: entry.name || "Untitled JSON",
    api_link: entry.apiLink,
    payload: entry.payload,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt || entry.createdAt
  };
}

module.exports = {
  getCollections,
  initializeDatabase,
  serializeCreatedApi,
  serializeJsonLink,
  serializeRequestLog,
  serializeUser,
  toObjectId
};
