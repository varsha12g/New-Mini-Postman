const { MongoClient, ObjectId } = require("mongodb");

const DEFAULT_URI = "mongodb://127.0.0.1:27017/mini_postman";
const DEFAULT_DB_NAME = "mini_postman";

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

  client = new MongoClient(uri);
  await client.connect();

  database = client.db(dbName);
  collections = {
    users: database.collection("users"),
    requestLogs: database.collection("request_logs")
  };

  await Promise.all([
    collections.users.createIndex({ email: 1 }, { unique: true }),
    collections.requestLogs.createIndex({ userId: 1, createdAt: -1 })
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

module.exports = {
  getCollections,
  initializeDatabase,
  serializeRequestLog,
  serializeUser,
  toObjectId
};
