# New Mini Postman

A fresh Mini Postman app with:

- Login and registration pages
- MySQL-backed user accounts
- Protected dashboard for testing APIs
- Recent request history saved per user

## Setup

1. Open `.env` and fill in your MySQL credentials
2. Start your MySQL server
3. Install dependencies with `npm install`
4. Start the app with `npm start`

## Default flow

- Open `http://127.0.0.1:3000`
- Create a new account
- Login and use the dashboard

## Notes

- The app automatically creates the database from `DB_NAME` if the MySQL user has permission.
- The app stores sessions in memory for simplicity.
- Request history is stored in MySQL.
- If startup shows `ECONNREFUSED`, MySQL is not running or the host/port in `.env` is incorrect.
