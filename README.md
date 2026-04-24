# Mini JSON Link

This project is now simplified to one flow:

- paste JSON in the frontend
- save it in MongoDB
- generate a public API link
- open that link to get the same JSON response

## Deploy Setup

- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas

Live URLs:

- Frontend: [https://new-mini-postman.vercel.app/app](https://new-mini-postman.vercel.app/app)
- Backend: [https://new-mini-postman.onrender.com/](https://new-mini-postman.onrender.com/)

## API Endpoints

- `GET /api/health`
- `GET /api/links`
- `POST /api/links`
- `DELETE /api/links/:id`
- `GET /api/data/:id`

## Local Development

1. Run installs:
   `npm run install:all`
2. Create `backend/.env`
3. Create `frontend/.env`
4. Start both apps:
   `npm run dev`

## Backend Env

Create `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://your-user:your-password@your-cluster.mongodb.net/?appName=Mini-postman
MONGODB_DB=mini_postman
CORS_ALLOWED_ORIGINS=https://new-mini-postman.vercel.app
```

For Render:

- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`

## Frontend Env

Create `frontend/.env` for local use:

```env
PORT=3000
BACKEND_API_BASE_URL=http://127.0.0.1:5000/api
```

For Vercel:

- Project Root: repo root
- Framework Preset: `Other`
- Environment Variable:

```env
BACKEND_API_BASE_URL=https://new-mini-postman.onrender.com/api
```

If you do not set that Vercel env var, the code now falls back to the Render backend URL automatically when running on Vercel.

## Notes

- Render root `/` now returns a small JSON status response.
- The public API link format is:
  `https://new-mini-postman.onrender.com/api/data/<id>`
- If CORS fails on production, confirm `CORS_ALLOWED_ORIGINS` on Render includes:
  `https://new-mini-postman.vercel.app`
