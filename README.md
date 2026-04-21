# New Mini Postman

Mini Postman ko ab clean split architecture me organize kiya gaya hai:

- `frontend/` runs on its own port and serves the login + dashboard UI
- `backend/` runs on its own port and exposes the JWT-protected API
- MongoDB Atlas is supported through `backend/.env`
- CORS is configured so the frontend can safely call the backend without cross-site cookie dependency

## Folder Structure

```text
.
|-- backend/
|   |-- server.js
|   |-- package.json
|   |-- .env.example
|   `-- src/
|       |-- config/db.js
|       |-- middleware/auth.js
|       |-- routes/
|       `-- utils/useCases.js
|-- frontend/
|   |-- server.js
|   |-- package.json
|   |-- .env.example
|   `-- public/
|       |-- app.html
|       |-- login.html
|       `-- assets/
|-- package.json
`-- README.md
```

## What Is Stored In MongoDB Atlas

`users` collection:

- `name`
- `email`
- `passwordHash`
- `createdAt`

`request_logs` collection:

- `userId`
- `userEmail`
- `apiLink`
- `url`
- `method`
- `requestHeaders`
- `requestBody`
- `statusCode`
- `responseTimeMs`
- `responsePreview`
- `responseBody`
- `createdAt`

Note:

- Password plain text me store nahi hota.
- Security ke liye `passwordHash` store hota hai.

## Setup

1. Root par sab installs ke liye run karo: `npm run install:all`
2. `backend/.env.example` ko dekh kar `backend/.env` banao
3. Atlas URI ko `MONGODB_URI` me daalo
4. `frontend/.env.example` ko dekh kar `frontend/.env` banao agar custom ports ya backend URL chahiye
5. Dono apps ko saath chalane ke liye run karo: `npm run dev`

## Default Ports

- Frontend: `http://127.0.0.1:3000`
- Backend: `http://127.0.0.1:5000`

## Example Backend Env

```env
PORT=5000
MONGODB_URI=mongodb+srv://your-user:your-password@your-cluster.mongodb.net/mini_postman?retryWrites=true&w=majority&appName=MiniPostman
MONGODB_DB=mini_postman
JWT_SECRET=replace-this-with-a-long-random-secret
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app
```

## Auth Flow

- Register/Login backend se JWT token return karta hai
- Frontend token ko browser storage me save karta hai
- Protected API calls `Authorization: Bearer <token>` ke saath backend par jati hain
- Backend token verify karke MongoDB data return karta hai

## Notes

- Production me `JWT_SECRET` env var set karo
- Backend cookies use nahi karta, isliye cross-site cookie issue avoid hota hai
- Backend CORS localhost, Vercel preview domains, aur optional `CORS_ALLOWED_ORIGINS` entries allow karta hai
- Agar startup par Mongo error aaye to Atlas URI, IP whitelist, aur DB user credentials check karo
- Request history per-user save hoti hai aur latest 8 items UI me dikhte hain
