# Tanwar Collections — Inventory Manager (Full Stack)

A complete inventory management web app for a local clothing store:
login/signup, a home overview, and a full product dashboard — backed by
a real Node.js + Express + MySQL API. One server runs everything; there
is nothing separate to start.

**This has been tested end-to-end** — a real MySQL database was created
from `db/schema.sql`, the server was started, and login, product
fetching, stats, and adding a product were all verified against the
live API before this was handed to you.

---

## What you need installed

- **Node.js** v18 or later — [nodejs.org](https://nodejs.org)
- **MySQL** (or MariaDB, which is fully compatible) running locally —
  [dev.mysql.com/downloads](https://dev.mysql.com/downloads/) or
  `sudo apt install mariadb-server` on Linux

## Run it — step by step

**1. Install dependencies**

```bash
cd tanwar-fullstack
npm install
```

**2. Set up your database connection**

```bash
cp .env.example .env
```

Open `.env` in any text editor and set `DB_PASSWORD` to your actual
MySQL root password (and `DB_USER`/`DB_HOST` too, if different).
Also change `JWT_SECRET` to any random string of your choosing.

**3. Create the database and tables**

Make sure your MySQL/MariaDB server is running, then:

```bash
npm run db:init
```

This creates the `tanwar_collections` database, the `users` and
`products` tables, a demo login, and 6 demo products. You'll see:

```
Connected. Running schema.sql ...
Done — database and tables are ready.
```

**4. Start the app**

```bash
npm start
```

You'll see:

```
Tanwar Collections API running on http://localhost:4000
```

**5. Open it in your browser**

Go to **http://localhost:4000** — that's it. The login page, signup,
home, and dashboard are all served from this one address.

**Demo login:** `owner@tanwarcollections.com` / `demo1234`
(or create your own account on the signup page)

---

## Using `npm run dev` instead

`npm run dev` uses `nodemon`, which restarts the server automatically
whenever you edit a backend file. Handy while making changes.

---

## What's actually happening

Unlike the earlier prototype (which stored everything in the browser's
`localStorage`), this version is a real client-server app:

- **`public/`** — the frontend: plain HTML/CSS/JS. This is served
  directly by the Express server, so opening `http://localhost:4000`
  is the same as opening `public/index.html`, except now its JavaScript
  talks to a real API instead of the browser's local storage.
- **`server.js` + `routes/` + `controllers/`** — the backend API.
  Handles login/signup (with hashed passwords and JWT tokens) and full
  product CRUD (create/read/update/delete), all reading and writing to
  MySQL.
- **`db/schema.sql`** — defines the two database tables (`users`,
  `products`) and seeds them with a demo login and demo stock.

Because everything is one server, there's no CORS configuration to
fight with and no second terminal window to keep open — `npm start`
is the whole app.

## API reference

| Method | Endpoint                | Auth required | Purpose                          |
|--------|--------------------------|:--:|-----------------------------------|
| POST   | `/api/auth/signup`      |    | Create an account                 |
| POST   | `/api/auth/login`       |    | Log in, returns a token           |
| GET    | `/api/products`         | ✅ | List products (`?search=&category=&status=`) |
| GET    | `/api/products/stats`   | ✅ | Summary numbers for the Home page |
| POST   | `/api/products`         | ✅ | Add a product                     |
| PUT    | `/api/products/:id`     | ✅ | Edit a product                    |
| DELETE | `/api/products/:id`     | ✅ | Delete a product                  |

## Project structure

```
tanwar-fullstack/
├── server.js                  # Express app — serves the API AND the frontend
├── package.json
├── .env.example                # copy this to .env and fill in your MySQL password
├── Dockerfile                  # builds a production container image of the app
├── docker-compose.yml          # runs app + MySQL together with one command
├── .dockerignore
├── config/db.js                # MySQL connection pool
├── db/
│   ├── schema.sql              # tables + demo login + demo products
│   └── init.js                 # runs schema.sql for you (npm run db:init)
├── middleware/auth.js          # checks the login token on protected routes
├── controllers/
│   ├── authController.js       # signup / login logic
│   └── productController.js    # product CRUD + stats logic
├── routes/
│   ├── auth.js
│   └── products.js
└── public/                     # the frontend — served automatically
    ├── index.html               # login
    ├── signup.html
    ├── home.html
    ├── dashboard.html
    ├── css/styles.css
    └── js/
        ├── common.js            # session handling + API helper (fetch wrapper)
        ├── auth.js               # login/signup form logic
        └── inventory.js          # dashboard table + home stats, all via the API
```

## Troubleshooting

**"ECONNREFUSED" or "Access denied" when running `npm run db:init`**
Your MySQL server isn't running, or the credentials in `.env` don't
match. Confirm MySQL is running (`mysqladmin ping`) and that
`DB_USER`/`DB_PASSWORD` in `.env` are correct.

**Port 4000 already in use**
Change `PORT=4000` in `.env` to something else, e.g. `PORT=5000`, and
open `http://localhost:5000` instead.

**Signed up but can't log back in**
Passwords are case-sensitive; email is not. Double-check both.

---

## Deploying so other people can use it (not just your laptop)

Right now the app only runs on `localhost` — nobody outside your
computer can reach it. Deploying means putting it on a server with a
public address. There are two realistic paths; pick whichever fits.

### Option A — Docker Compose on any VPS (most control, recommended if you have to demo "real deployment")

This bundles the app *and* MySQL together with one command — good for
a cheap VPS (DigitalOcean, AWS Lightsail, a college server, etc.)

1. Install Docker + Docker Compose on the server (see
   [docs.docker.com/engine/install](https://docs.docker.com/engine/install/)).
2. Copy this whole project folder onto the server (`scp`, `git clone`, etc.).
3. Create a `.env` file in the project root with just these two lines
   (Compose reads them to configure both containers):
   ```
   DB_PASSWORD=pick_a_strong_password
   JWT_SECRET=generate_a_long_random_string
   ```
4. Run:
   ```bash
   docker compose up --build -d
   ```
   This builds the app image, starts MySQL, automatically runs
   `db/schema.sql` on first boot, and starts the server.
5. Visit `http://your-server-ip:4000`. To use a real domain and HTTPS,
   put [Caddy](https://caddyserver.com/) or [nginx](https://nginx.org/)
   in front as a reverse proxy — Caddy in particular gets you free
   auto-renewing HTTPS with about 3 lines of config.

To stop it: `docker compose down` (add `-v` to also wipe the database).

### Option B — Railway (easiest, no server to manage)

[Railway](https://railway.app) builds your app from this folder and
gives you a public HTTPS URL, with a MySQL database provisioned
alongside it. No Docker knowledge needed.

1. Push this project to a GitHub repository.
2. On Railway: **New Project → Deploy from GitHub repo** → pick your repo.
3. **New → Database → Add MySQL** in the same project. Railway creates
   it and exposes connection details as environment variables.
4. Open your app service → **Variables** tab, and set:
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` — copy
     these from the MySQL service's own Variables tab (Railway shows
     them there, e.g. `MYSQLHOST`, `MYSQLPASSWORD`, etc. — map each
     one across).
   - `JWT_SECRET` — any long random string.
   - `NODE_ENV=production`
   - `CORS_ORIGIN=*`
5. Once deployed, open your app's **Settings → Networking** and
   generate a public domain.
6. Run the schema once against the new database — easiest way is
   Railway's built-in MySQL query console (in the MySQL service, open
   the "Data" tab) — paste in the contents of `db/schema.sql` and run it.
7. Visit the generated URL. Done — that URL works for anyone, anywhere.

### A note on security before you share the URL

- Generate a real `JWT_SECRET` instead of leaving the example value:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
- Use a real, unique `DB_PASSWORD` — never the example one.
- Never commit your real `.env` file (it's already in `.gitignore`).
- The app already includes production-safety middleware: `helmet`
  (security headers), rate limiting on login/signup (blocks brute-force
  password guessing), gzip compression, and hidden internal error
  details once `NODE_ENV=production` is set.
