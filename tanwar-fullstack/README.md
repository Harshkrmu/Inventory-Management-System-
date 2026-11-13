# Tanwar Collections — Inventory Manager

A complete inventory system for a clothing store: secure login, a live stock
overview, and a full product manager — built with **Node.js + Express + MySQL**
and a plain HTML/CSS/JavaScript frontend. One server runs everything; there is
no separate frontend to start.

## What it does

- **Accounts** — sign up / log in, "Keep me signed in", show/hide password, change password, log out
- **Home** — live stats (products, units, stock value, low stock, out of stock), a "needs reordering" list, quick actions, CSV export
- **Inventory** — search (name / SKU / colour), filter (category, stock level), sort, add / edit / delete, one-click **+ / −** stock buttons, CSV export of the current view
- **Safe by default** — hashed passwords (bcrypt), signed login tokens (JWT), brute-force protection, security headers, validated input, HTML-escaped output
- **Works on phones** — slide-out menu, scrollable tables

---

## 1. Run it on your computer (Windows / VS Code)

You need **Node.js 18+** ([nodejs.org](https://nodejs.org)) and **MySQL** running locally
(MySQL Installer from [dev.mysql.com/downloads](https://dev.mysql.com/downloads/installer/); remember the root password you set).

Open the project folder in VS Code → **Terminal → New Terminal**, then:

```powershell
npm install
Copy-Item .env.example .env
```

Open the new **`.env`** file and set:

| Key | What to put |
|---|---|
| `DB_PASSWORD` | your MySQL root password |
| `JWT_SECRET` | optional — leave empty and a secure key is derived automatically |

Then create the database and start the app:

```powershell
npm run db:init
npm start
```

Open **http://localhost:4000** and log in with the demo account (it is created
automatically and intentionally not shown on the login page), or create your own account.

> To stop the server press `Ctrl+C`. Next time you only need `npm start`.

---

## 2. Put it online for free (Render + Clever Cloud)

**You need:** a GitHub account, a free [Clever Cloud](https://clever-cloud.com) account (MySQL) and a free [Render](https://render.com) account (hosting). No credit card.

### A. Push the project to GitHub
`package.json` must be at the **top level** of the repository.
```powershell
git init
git add .
git commit -m "Tanwar Collections"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```
(`.env` is git-ignored, so your passwords are never uploaded.)

### B. Create the free MySQL database
Clever Cloud → **Create → Add-on → MySQL → Dev (free)**. Open it and note the five values:
**Host, Port, User, Password, Database name**.

### C. Create the tables (no MySQL tools needed)
Put those five values into your local `.env` (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`), then run:
```powershell
npm run db:init:managed
```
This creates the tables plus the demo account and sample products on the Clever Cloud database.
Check what is stored any time with `npm run db:view`.

### D. Deploy on Render
Render → **New → Web Service** → pick your repo, then:

| Setting | Value |
|---|---|
| Runtime | Node |
| Root Directory | *(leave empty — or the sub-folder that contains `package.json`)* |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | Free |

Add these **Environment Variables**:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME` | the five values from step B |
| `DB_POOL_LIMIT` | `4` (free MySQL plans allow very few connections) |
| `JWT_SECRET` | optional — a long random string (≥ 32 chars). If empty, a secure key is derived from your DB credentials |
| `SEED_DEMO` | optional — `false` removes the automatic demo login |
| `JWT_EXPIRES_IN` | `7d` |
| `SIGNUP_CODE` | an invite code of your choice (recommended — see below) |

Do **not** set `PORT` — Render sets it. When the deploy finishes, Render shows your public URL.

> The free Render plan sleeps after ~15 minutes without visitors; the next visit takes 30–50 seconds to wake up. That is normal.

### E. Before you share the link
1. **Set `SIGNUP_CODE`.** Without it, anyone who finds the URL can create an account and edit your stock. With it, people need the code to sign up.
2. **Change the demo password** (log in → *Change password* in the sidebar), or sign up your own account.
3. Never commit `.env`. If a password was ever shared or committed, change it in Clever Cloud and Render.

> Tables and the demo account are created automatically the first time the server starts — there is nothing to run by hand. A weak or missing `JWT_SECRET` is replaced by a key derived from your database credentials.

---

## 3. Docker (optional)

Create a `.env` next to `docker-compose.yml` with `DB_PASSWORD=...` (optional: `JWT_SECRET=...`, `SIGNUP_CODE=...`), then:
```bash
docker compose up --build
```
Open http://localhost:4000. The database is created automatically.

---

## Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `JWT_SECRET` | no | derived | Signs login tokens. Use ≥ 32 random chars, or leave empty |
| `SEED_DEMO` | no | `true` | Auto-create the demo login (`false` to disable) |
| `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME` | yes | localhost / 3306 / root / – / tanwar_collections | MySQL connection |
| `NODE_ENV` | no | `development` | Set `production` when deployed |
| `PORT` | no | `4000` | Set automatically by most hosts |
| `DB_POOL_LIMIT` | no | `4` | Max DB connections (keep low on free MySQL) |
| `DB_SSL` | no | off | `true` if your DB host requires SSL |
| `JWT_EXPIRES_IN` | no | `7d` | Login lifetime |
| `SIGNUP_CODE` | no | empty | If set, sign-up requires this invite code |
| `CORS_ORIGIN` | no | `*` | Only change if the frontend is hosted elsewhere |

## npm scripts

| Command | Does |
|---|---|
| `npm start` | start the server |
| `npm run dev` | start with auto-restart on file changes |
| `npm run db:init` | create the database + tables + demo data (local MySQL) |
| `npm run db:init:managed` | create tables on a hosted database that already exists (Clever Cloud) |
| `npm run db:view` | print the users and products currently in the database |
| `npm run user:add -- <email> <password> "<name>"` | create a login, or reset its password |

## API

All `/api/products` routes need `Authorization: Bearer <token>` (returned by login/signup).

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | server + database status |
| GET | `/api/auth/config` | is an invite code required to sign up? |
| POST | `/api/auth/signup` | create account (`name`, `email`, `password`, `code?`) |
| POST | `/api/auth/login` | log in (`email`, `password`) |
| GET | `/api/auth/me` | current account |
| PUT | `/api/auth/password` | change password (`currentPassword`, `newPassword`) |
| GET | `/api/products` | list — `?search=&category=&status=all\|ok\|low\|out&sort=newest\|name\|price_asc\|price_desc\|stock_asc\|stock_desc` |
| GET | `/api/products/stats` | numbers for the Home page |
| POST | `/api/products` | add a product |
| PUT | `/api/products/:id` | edit a product |
| PATCH | `/api/products/:id/stock` | adjust stock by `delta` (never below 0) |
| DELETE | `/api/products/:id` | delete a product |

## Project structure

```
server.js                 Express app: security, API, serves /public
config/db.js              MySQL connection pool
middleware/auth.js        checks the login token
controllers/              auth + product logic (validation lives here)
routes/                   URL → controller wiring
db/schema.sql             tables + demo data (local)       db/init.js
db/schema-managed.sql     same, for hosted databases       db/init-managed.js
db/view-data.js           print what is in the database
public/                   the website (HTML, css/, js/)
Dockerfile, docker-compose.yml
```

## Troubleshooting

| Problem | Fix |
|---|---|
| `ECONNREFUSED` / `Access denied` on `db:init` | MySQL isn't running, or `DB_*` in `.env` is wrong |
| `EADDRINUSE` | Port 4000 is busy — set `PORT=5000` in `.env` |
| Render: `Could not read package.json` | Set **Root Directory** to the folder that contains `package.json` |
| Page looks old after an update | Hard refresh with `Ctrl+Shift+R` |
| `Too many connections` | Lower `DB_POOL_LIMIT` (e.g. `3`) |
| Demo login (or any login) doesn't work | Run `npm run user:add -- owner@tanwarcollections.com demo1234 "Rakesh Tanwar"` — it creates the login or resets its password on the database your `.env` points to. Check what exists with `npm run db:view` |
| "Too many attempts" at login | Wait ~15 minutes (only repeated wrong passwords trigger it) |
