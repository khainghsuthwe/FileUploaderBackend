# FileUploader Backend

This is the Express backend for the FileUploader take-home assignment.

Features

- Image upload using multer
- File validation (image types + size limit)
- Serves uploaded files from `/uploads`
- Security: helmet, CORS configuration, rate-limiting

Requirements

- Node 18+

Run locally (development)

1. Install dependencies

```bash
cd Backend
npm install
```

2. Start the server (nodemon)

```bash
npm run dev
```

By default the server listens on port `5001`. You can override with `PORT` env var.

Environment variables

- PORT - port to run the server (default 5001)
- FRONTEND_URL - allowed origin for CORS (default http://localhost:3000)
- BACKEND_URL - optional URL returned as file URLs; otherwise uses `http://localhost:${PORT}`

Cloudinary (optional)

- If you want uploaded files to be stored on Cloudinary, set the following environment variables:
  - CLOUDINARY_CLOUD_NAME
  - CLOUDINARY_API_KEY
  - CLOUDINARY_API_SECRET
  - (optional) CLOUDINARY_FOLDER - folder name inside your Cloudinary account (default: `fileuploader`)

When Cloudinary env vars are present the server will stream uploads directly to Cloudinary and return the CDN URL. If Cloudinary is not configured, uploads are saved to the local `uploads/` directory as a fallback.

<!-- Docker

Build and run with Docker:

```bash
# from project root
docker compose up --build
``` -->

This will build both frontend and backend and expose the services on ports 3000 (frontend) and 5001 (backend).

Notes

- The backend stores uploaded files in the local `uploads/` directory. For production, consider using object storage (S3) or a network file system.
- Source is provided in CommonJS JavaScript under `src/` (server.js, routes, controllers). There are also TypeScript sources present — the project runs the JS files.
