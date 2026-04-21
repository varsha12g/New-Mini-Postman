const mysql = require("mysql2/promise");

const requiredConfig = ["DATABASE_URL"];

for (const key of requiredConfig) {
  if (!process.env[key]) {
    console.warn(`${key} is not set. Check your .env file before starting the app.`);
  }
}

let pool;

function createPool() {
  return mysql.createPool(process.env.DATABASE_URL);
}

async function initializeDatabase() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  await connection.end();

  pool = createPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(190) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS request_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      url TEXT NOT NULL,
      method VARCHAR(10) NOT NULL,
      status_code INT NULL,
      response_time_ms INT NOT NULL,
      response_preview LONGTEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_request_logs_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
    )
  `);
}

function getPool() {
  if (!pool) {
    throw new Error("Database pool has not been initialized yet.");
  }

  return pool;
}

module.exports = {
  getPool,
  initializeDatabase
};
