# 🏆 GLive Stream Hub (24x7 Live Sports Directory)

A self-updating 24x7 directory and REST API for live sports streams broadcasting on GLive with direct stream player links (`https://glive.skyexchange.bet/stream?matchId=<matchId>`).

---

## ⚡ Features
- **24/7 Automated Updates:** GitHub Actions periodically fetches and commits active streams to `streams.json`.
- **Zero Hosting Cost:** Runs completely free on **GitHub Pages** or **Cloudflare Workers**.
- **Responsive Dashboard:** Mobile/desktop optimized with Cricket, Tennis, and Soccer category filters.
- **Direct Stream Launcher:** 1-click **Open Stream**, 1-click **In-Page Preview**, and **Copy Link** buttons.
- **REST API:** Access raw JSON via `streams.json` or `/api/streams` for Telegram bots and integrations.

---

## 🚀 How to Publish to Your GitHub (Go Live)

### Step 1: Create a New GitHub Repository
1. Go to [github.com/new](https://github.com/new).
2. Name your repository (e.g., `glive-stream-hub`).
3. Set it to **Public** and leave "Initialize this repository with a README" unchecked.
4. Click **Create repository**.

### Step 2: Push Your Local Code
Run these commands in this directory:
```bash
git remote add origin https://github.com/<YOUR-GITHUB-USERNAME>/glive-stream-hub.git
git branch -M main
git push -u origin main
```

### Step 3: Turn on Free 24/7 GitHub Pages
1. On your GitHub repository page, go to **Settings** > **Pages** (on the left menu).
2. Under **Build and deployment > Source**, select **Deploy from a branch**.
3. Under **Branch**, choose `main` and `/ (root)`, then click **Save**.
4. In about 1 minute, your site will be live at:
   ```
   https://<YOUR-GITHUB-USERNAME>.github.io/glive-stream-hub/
   ```

### Step 4: Enable Automated 24/7 Updates (GitHub Actions)
1. In your GitHub repository, go to **Settings** > **Actions** > **General**.
2. Scroll to **Workflow permissions** and select **Read and write permissions**.
3. Click **Save**.
4. The workflow in `.github/workflows/update-streams.yml` will now automatically refresh `streams.json` every 10 minutes!

---

## 💻 Running Locally

To run the local server on your Mac / PC:
```bash
node server.js
```
- Local Dashboard: `http://localhost:3888`
- Local API: `http://localhost:3888/api/streams`
