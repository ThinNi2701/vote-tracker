# Vote Tracker

Project structure:

```text
vote-tracker/
|-- backend/
|   |-- src/
|   |   |-- controllers/
|   |   |-- models/
|   |   |-- routes/
|   |   |-- middleware/
|   |   |-- config/
|   |   \-- app.js
|   |-- .env
|   \-- package.json
|-- frontend/
|   |-- src/
|   |   |-- api/
|   |   |-- components/
|   |   |-- pages/
|   |   |-- hooks/
|   |   \-- App.jsx
|   |-- tailwind.config.js
|   \-- package.json
\-- README.md
```

## Quick start

1. Install backend dependencies:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Deploy On Render

### Backend environment variables

- `DB_URL`
- `JWT_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `USER_USERNAME`
- `USER_PASSWORD`

### Frontend environment variables

- `VITE_API_BASE_URL=https://<your-backend-service>.onrender.com/api`

`VITE_API_BASE_URL` is required in production. If missing, the app will show a configuration warning and API requests will fail with a clear error.

### Quick verification

1. Open `https://<your-backend-service>.onrender.com/api/health` and ensure status is ok.
2. Rebuild/redeploy frontend after setting `VITE_API_BASE_URL` (Vite reads env at build time).
