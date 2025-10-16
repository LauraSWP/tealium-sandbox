# GitHub Pages Deployment Guide

This repository uses GitHub Actions to automatically deploy both `main` and `dev` branches to GitHub Pages at different paths.

## 🌐 Live URLs

- **Production (main branch):** https://lauraswp.github.io/tealium-sandbox/
- **Development (dev branch):** https://lauraswp.github.io/tealium-sandbox/dev/

## 📋 How It Works

The GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) automatically:

1. **Triggers on push** to `main` or `dev` branches
2. **Deploys to separate paths:**
   - `main` → Root path (`/`)
   - `dev` → Subdirectory (`/dev/`)
3. **Manages a `gh-pages` branch** that contains both deployments
4. **Updates base href** automatically for dev deployment to ensure proper resource loading

## 🚀 Setup Instructions

### 1. Enable GitHub Pages

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Pages**
3. Under **Source**, select:
   - **Branch:** `gh-pages`
   - **Folder:** `/ (root)`
4. Click **Save**

### 2. Configure Workflow Permissions

1. Go to **Settings** → **Actions** → **General**
2. Scroll down to **Workflow permissions**
3. Select **Read and write permissions**
4. Check **Allow GitHub Actions to create and approve pull requests**
5. Click **Save**

### 3. Trigger Initial Deployment

The workflow runs automatically on push, but you can also trigger it manually:

1. Go to **Actions** tab
2. Select **Deploy to GitHub Pages** workflow
3. Click **Run workflow**
4. Choose branch (`main` or `dev`)
5. Click **Run workflow**

## 📦 Deployment Process

### When you push to `main`:
```bash
git checkout main
git push origin main
```
→ Deploys to: `https://lauraswp.github.io/tealium-sandbox/`

### When you push to `dev`:
```bash
git checkout dev
git push origin dev
```
→ Deploys to: `https://lauraswp.github.io/tealium-sandbox/dev/`

## 🔄 Workflow Details

### What Happens During Deployment:

1. **Checkout** the pushed branch (main or dev)
2. **Fetch or create** the `gh-pages` branch
3. **Copy files** to the appropriate path:
   - Main: Root directory (preserves `/dev/` folder)
   - Dev: `/dev/` subdirectory
4. **Update base href** in dev's `index.html` for proper resource loading
5. **Commit and push** to `gh-pages` branch
6. **GitHub Pages** automatically serves the updated content

### Branch Structure:

```
Repository Branches:
├── main        → Source code (production)
├── dev         → Source code (development)  
└── gh-pages    → Deployment branch
    ├── index.html, js/, css/, etc.  (main deployment)
    └── dev/
        └── index.html, js/, css/, etc.  (dev deployment)
```

## 🧪 Testing

After deployment, verify both URLs are working:

```bash
# Production
curl -I https://lauraswp.github.io/tealium-sandbox/

# Development  
curl -I https://lauraswp.github.io/tealium-sandbox/dev/
```

## 🛠️ Troubleshooting

### Issue: Pages not updating

1. Check the **Actions** tab for workflow status
2. Verify workflow completed successfully
3. GitHub Pages can take 1-2 minutes to reflect changes
4. Hard refresh your browser (Ctrl+F5 / Cmd+Shift+R)

### Issue: 404 errors on dev deployment

- Verify the base href was added correctly in `/dev/index.html`
- Check that the gh-pages branch has the `/dev/` folder

### Issue: Resources not loading on dev

- The workflow automatically adds `<base href="/tealium-sandbox/dev/">` to dev's index.html
- If manual edits are needed, update the workflow's sed command

### Issue: Workflow fails

1. Check **Settings** → **Actions** → **General**
2. Ensure workflow has **Read and write permissions**
3. Check workflow logs in **Actions** tab for specific errors

## 📝 Manual Deployment (Not Recommended)

If you need to deploy manually without the workflow:

```bash
# Checkout gh-pages branch
git checkout gh-pages

# For main deployment
git checkout main -- .
git add .
git commit -m "Manual deploy: main"

# For dev deployment  
mkdir -p dev
git checkout dev -- .
mv * dev/ 2>/dev/null || true
git add dev/
git commit -m "Manual deploy: dev"

git push origin gh-pages
```

## 🔒 Security Notes

- Workflow runs with `contents: write` and `pages: write` permissions
- Only pushes to `main` and `dev` trigger deployments
- The `gh-pages` branch is auto-managed (don't edit directly)

## 📚 Additional Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow File](.github/workflows/deploy-pages.yml)

---

**Last Updated:** October 2025

