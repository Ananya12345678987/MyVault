# MyVault

A personal secure vault for passwords, notes, code snippets, people and resources.
Everything sensitive is encrypted with AES-256-GCM, and the key is derived from your
master password, so it is never stored in the database.

**Live demo:** https://myvault-mu.vercel.app

## Tech stack
- Frontend: React, Vite, Tailwind CSS, Tiptap
- Backend: Node.js, Express, MongoDB (Mongoose)
- Security: Argon2id, AES-256-GCM, httpOnly cookies, rate limiting, helmet

## Run locally
1. `cd backend`, copy `.env.example` to `.env`, fill in the values, then `npm install` and `npm run dev`
2. `cd frontend`, then `npm install` and `npm run dev`
3. Open http://localhost:5173

## Deployment
Frontend on Vercel, backend on Render, database on MongoDB Atlas.