# Hotelapp (Expo + Node/Express)

## Prereqs

- Node.js (LTS recommended)
- MongoDB running locally (or a MongoDB Atlas URI)

## Setup

Install dependencies:

```bash
npm install
cd HotelBackend && npm install
```

Create env files:

- Copy `.env.example` → `.env`
- Copy `HotelBackend/.env.example` → `HotelBackend/.env`

Minimum required to boot backend:

- `HotelBackend/.env`
  - `MONGO_URI` (or start local MongoDB)
  - `JWT_SECRET`

## Run (2 terminals)

Terminal A (backend):

```bash
cd HotelBackend
npm run start
```

Terminal B (Expo):

```bash
npm start
```

### Notes (Expo Go + phone)

- The app auto-targets your PC’s LAN IP for the API when using Expo Go.
- If requests time out, allow **Node** through Windows Defender Firewall and ensure port **5000** is reachable from your phone:
  - Open `http://YOUR_PC_LAN_IP:5000/api/health` in your phone browser.

## Google Sign-In (optional)

Google Sign-In in **Expo Go** requires a public HTTPS origin (Google blocks LAN IPs for Web OAuth redirects).

1. Run a tunnel to your backend:

```bash
ngrok http 5000
```

2. Set the same origin (no `/api`) in both env files:

- `.env` → `EXPO_PUBLIC_GOOGLE_RELAY_BASE=https://<your-ngrok-host>`
- `HotelBackend/.env` → `GOOGLE_OAUTH_PUBLIC_BASE=https://<your-ngrok-host>`

3. In Google Cloud Console (Web OAuth client) add this exact redirect URI:

- `https://<your-ngrok-host>/api/auth/google/expo/callback`

Restart Expo + backend after env changes.

