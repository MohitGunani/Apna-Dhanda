# Apna Dhandha

A small idea sharing app with a FastAPI and MongoDB backend, Google Sheets and Drive sync, and a single page frontend. The frontend also has a browser-only demo mode.

## Project layout

```text
.
├── frontend/
│   └── index.html                 # App UI and browser demo
├── backend/
│   ├── server.py                  # FastAPI app and API routes
│   ├── auth.py                    # Google sign-in and admin sessions
│   ├── google_sync.py             # Sheets sync and Drive music access
│   ├── requirements.txt           # Python dependencies
│   ├── .env.example               # Safe configuration template
│   ├── .env                       # Local config; create from .env.example
│   └── secrets/                   # Local service-account key; never commit
├── integrations/
│   └── google-apps-script/
│       └── Code.gs                # Optional standalone Apps Script integration
├── .gitignore
└── README.md
```

The `.venv/` directory is a local Python environment and is intentionally excluded from the project structure. Recreate it on another machine from `backend/requirements.txt`.

## Run locally

1. Create a virtual environment and install the backend dependencies:

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
   ```

2. `backend/.env` is already present in this workspace. Its MongoDB URL points to the local default `mongodb://localhost:27017`, with the database name set by `DB_NAME`. For a fresh copy of the project, copy `backend/.env.example` to `backend/.env` and fill in the settings you use. For Google sync, put the service-account key at `backend/secrets/service-account.json` and share the Sheet and Drive folder with its service account email.

3. Start MongoDB, then run the API from the project root:

   ```powershell
   .\.venv\Scripts\python.exe -m uvicorn backend.server:app --reload --port 8000
   ```

4. Open <http://localhost:8000>. The admin page is at <http://localhost:8000/#admin>.

For a frontend-only demo, open `frontend/index.html` directly. It uses sample ideas saved in the browser.

## Google setup

- Enable the Google Sheets API and Google Drive API in the Google Cloud project.
- Create a service account and save its key only under `backend/secrets/`.
- Share the target spreadsheet with the service account as Editor and the music folder as Viewer.
- Create an OAuth Web application client ID, add the app URL to its authorized JavaScript origins, and set `GOOGLE_CLIENT_ID` in `backend/.env`.
- Set `ADMIN_EMAIL` to the account allowed to use the admin page and set `JWT_SECRET` to a long random value.

## Production security setup

The admin API is protected server-side: the owner must sign in with Google, and every dashboard read or mutation requires a signed, one-hour bearer token. Before deploying, configure these environment variables in the host's secret settings:

- `APP_ENV=production`
- `MONGO_URL` set to your hosted MongoDB connection string (use TLS; MongoDB Atlas `mongodb+srv://` URLs enable TLS by default)
- `JWT_SECRET` set to a private random value of at least 32 characters; keep the same value across restarts
- `ADMIN_EMAIL` set to the one Google account allowed into the dashboard
- `GOOGLE_CLIENT_ID` set to the OAuth Web client ID, with the deployed website's HTTPS origin registered in Google Cloud
- `CORS_ORIGINS` set to the exact deployed website origin, such as `https://your-domain.example` (no trailing slash and no `*`)

The app refuses production startup when required values are missing, the database still points to localhost, or CORS allows every website. Production mode also disables the built-in API docs and adds browser security headers. Serve the site over HTTPS, restrict MongoDB network access to the app host, give the Google service account only the Sheet/Drive permissions it needs, and store its key outside the source tree. Never commit `backend/.env` or service-account keys.

For local development, keep `APP_ENV=development` and the local MongoDB URL. The API docs remain available at `/docs` locally.

The Apps Script under `integrations/google-apps-script/` is an optional separate integration. It can be copied into a Google Apps Script project and configured there independently.

## Deploy publicly with Render

The project includes a Docker image and a Render Blueprint. The app serves the frontend and API from the same HTTPS origin, and MongoDB Atlas stores submitted ideas and votes.

### Before creating the Render service

1. Create a MongoDB Atlas database and a database user with access only to the `apna_dhandha` database. Copy its TLS `mongodb+srv://` connection string and replace the password placeholder. URL-encode special characters in the username or password.
2. In Atlas Network Access, allow the Render service's outbound IP ranges for its selected region. You can find those ranges in the Render service's **Connect → Outbound** panel after creating the service. Avoid `0.0.0.0/0`.
3. In Google Cloud, enable Google Sheets API and Google Drive API. Keep the service-account key JSON private. Share the target Sheet with the service-account email as Editor and the music folder as Viewer.
4. In Google Cloud OAuth settings, register the final site HTTPS origin as an Authorized JavaScript origin. Use the Render `onrender.com` origin first, and add your custom-domain origin after attaching that domain.
5. Create a private GitHub repository for this project and push the code. Before pushing, confirm `backend/.env` and `backend/secrets/service-account.json` are ignored. Never add either file to Git.

### Create the service

1. In Render, create a Blueprint from the GitHub repository containing `render.yaml`. The Blueprint uses Render's Free web-service plan. The service sleeps after 15 minutes without traffic, so the first visit after idle may take about a minute to wake it.
2. Add the service-account JSON in the service's **Environment → Secret Files** as `service-account.json`. The Blueprint points to `/etc/secrets/service-account.json`.
3. Set the prompted environment values in Render:
   - `MONGO_URL`: Atlas TLS connection string.
   - `ADMIN_EMAIL`: the one Google account that may use the admin dashboard.
   - `GOOGLE_CLIENT_ID`: the OAuth Web client ID.
   - `GOOGLE_SHEET_ID`: target spreadsheet ID.
   - `GOOGLE_DRIVE_FOLDER_ID`: music folder ID.
4. Set `CORS_ORIGINS` only if needed. If omitted, the app uses Render's HTTPS service URL. When adding a custom domain, set this to the exact origin, for example `https://ideas.example.com` (no trailing slash). Include both origins as a comma-separated list during a domain migration.
5. Keep one web-service instance while the built-in Sheets sync is enabled. The sync lock is process-local, so multiple instances could write the same Sheet at once.
6. Wait for `/api/health` to return `{"ok":true,"database":"connected"}`. Then verify the public site, Google admin sign-in, idea submission and approval, Sheet sync, and music playback. Add the custom domain in Render and confirm its HTTPS certificate before sharing the URL.

Render creates a private random `JWT_SECRET` from the Blueprint. Keep it stable between deploys. Do not paste secrets into this README, `render.yaml`, or GitHub. The Docker build excludes `.env` files and the local `backend/secrets/` directory.

Render Free provides 750 instance hours per workspace per month, and the service can be suspended if its free limits are exceeded. Atlas Free (M0) is intended for small development and low-throughput use, has limited storage and operational features, and does not provide the full backup capabilities of paid tiers. Export the data regularly before inviting public users, keep an eye on provider usage dashboards, and expect slow wake-ups after idle periods. For public access, use a restricted Atlas IP allowlist rather than `0.0.0.0/0`. See [Render's free-tier limits](https://render.com/docs/free), [Atlas Free cluster limits](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/), and [Atlas IP access-list guidance](https://www.mongodb.com/docs/atlas/security/ip-access-list/).
