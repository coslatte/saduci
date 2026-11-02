# SADUCI

Web client for SADUCI — clinical decision support in the ICU, Hospital Arnaldo Milián Castro.

Name: Saduci (Sistema de Apoyo en la Decisión en la Unidad de Cuidado Intensivo)

This repository contains the frontend application (Saduci Platform). The backend service remains named `sadeci-core` where applicable.

## Getting Started

### 1. Configure the backend URL

Copy `.env.example` to `.env.local` and set the URL of the [sadeci-core](https://github.com/coslatte/sadeci-core) backend:

```bash
cp .env.example .env.local
```

```env
# .env.local
API_URL=http://localhost:8000
```

The frontend routes all simulation requests through `/api/simulation` (a Next.js Route Handler), so `API_URL` stays server-side and is never exposed to the browser.

The same backend is now also required for authentication. The login screen uses the admin user seeded by `saduci-core` on first startup, so the gateway must be running before entering the app.

### 2. Run the development server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

> **Note:** sadeci-core must be running (default: `http://localhost:8000`) for the patient simulation to return results.
