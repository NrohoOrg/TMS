# TMS Deployment Guide

This guide covers the complete workflow for developing, testing, committing, and deploying the TMS frontend.

---

## 📋 Prerequisites

- **Git remotes configured** (pushes to both `NrohoOrg/TMS` and `badriamouri/TMS`)
- **GitHub Personal Access Token** stored in macOS Keychain
- **Vercel project** connected to `badriamouri/TMS` with Root Directory set to `apps/frontend`

---

## 🔄 Development Workflow

### 1. Start Development Server

```bash
cd /Users/mac/Desktop/Press_Me/Study/NrohoProject/TMS/apps/frontend
npm run dev
```

**Expected output:**
```
✓ Starting...
✓ Ready in 2.3s
◐ Local:        http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) to test your changes.

---

### 2. Make Code Changes

Edit files in `apps/frontend/src/`:
- Components: `components/`, `features/`
- Pages: `app/`
- Styles: `styles/`
- Utilities: `lib/`, `hooks/`

---

### 3. Run Pre-Commit Checks

#### Check TypeScript Errors
```bash
cd /Users/mac/Desktop/Press_Me/Study/NrohoProject/TMS/apps/frontend
npx tsc --noEmit
```

**Expected output:** No errors (silent success) or specific line errors to fix.

#### Check Linting
```bash
npm run lint
```

**Expected output:** `✔ No ESLint warnings or errors` or specific warnings to fix.

#### Test Production Build
```bash
npm run build
```

**Expected output:**
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (16/16)
✓ Finalizing page optimization
```

If build succeeds, you're ready to commit.

---

### 4. Check Git Status

```bash
cd /Users/mac/Desktop/Press_Me/Study/NrohoProject/TMS
git status
```

**Review:**
- Modified files (red)
- Untracked files (red)
- Files ready to commit (green)

---

### 5. Stage Changes

**Stage all changes:**
```bash
git add -A
```

**Or stage specific files:**
```bash
git add apps/frontend/src/components/ui/button.tsx
git add apps/frontend/src/app/admin/page.tsx
```

**Verify staged files:**
```bash
git status --short
```

---

### 6. Commit Changes

**For feature commits:**
```bash
git commit -m "feat(frontend): add new dashboard widget

- Add RevenueChart component with mock data
- Update AdminDashboard layout grid
- Style with TMS color tokens"
```

**For bug fixes:**
```bash
git commit -m "fix(frontend): correct login redirect logic

- Fix useRouter navigation in LoginPage
- Update ROLE_ROUTES mapping for driver role"
```

**For style updates:**
```bash
git commit -m "style(frontend): update spacing on dispatcher tasks page

- Adjust card padding from 4 to 6
- Increase gap between task items"
```

**Commit message format:**
```
<type>(<scope>): <subject>

<body>
```

**Types:** `feat`, `fix`, `style`, `refactor`, `docs`, `test`, `chore`

---

### 7. Push to GitHub (Both Remotes)

```bash
git push origin main
```

This pushes to:
- ✅ `NrohoOrg/TMS` (organization backup)
- ✅ `badriamouri/TMS` (personal, public)

**Expected output:**
```
Enumerating objects: X, done.
Counting objects: 100% (X/X), done.
...
Writing objects: 100% (X/X), done.
To https://github.com/badriamouri/TMS.git
   d38e224..abc1234  main -> main
To https://github.com/NrohoOrg/TMS.git
   d38e224..abc1234  main -> main
```

---

### 8. Verify Vercel Deployment

**Automatic deployment triggers immediately after push.**

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Open your **TMS Frontend** project
3. Check the **Deployments** tab
4. Wait for build to complete (~2 minutes)

**Build status:**
- 🟡 **Building...** (in progress)
- 🟢 **Ready** (deployed successfully)
- 🔴 **Failed** (check build logs)

**Test the live site:**
- Production URL: `https://tms-frontend.vercel.app` (or your custom domain)
- Click through all routes to verify

---

## 🔍 Troubleshooting

### Git Push Authentication Failed

**Symptom:**
```
fatal: Authentication failed for 'https://github.com/...'
```

**Solution:**
```bash
# Re-configure credential helper
git config --global credential.helper osxkeychain

# Push again (Git will prompt for credentials)
git push origin main
# Username: badriamouri
# Password: <paste your GitHub token>
```

---

### Vercel Build Failed

**Check the build logs:**
1. Go to Vercel dashboard → Deployments
2. Click the failed deployment
3. Open **Build Logs** tab

**Common issues:**

**TypeScript errors:**
```bash
# Fix locally first
cd apps/frontend
npx tsc --noEmit
# Fix all errors, then commit and push again
```

**Missing dependencies:**
```bash
# If you added new packages, ensure package.json is committed
git add apps/frontend/package.json apps/frontend/package-lock.json
git commit -m "chore(frontend): add missing dependencies"
git push origin main
```

**Wrong Root Directory:**
- Vercel settings → Root Directory must be `apps/frontend`

---

### Dev Server Not Updating

**Clear Next.js cache:**
```bash
cd apps/frontend
rm -rf .next
npm run dev
```

---

## 📦 Quick Reference

### One-Command Check Before Push
```bash
cd apps/frontend && npx tsc --noEmit && npm run lint && npm run build && cd ../.. && git status
```

**If all pass:** Proceed with commit and push.

---

### View Git Remotes
```bash
git remote -v
```

**Expected:**
```
origin  https://github.com/NrohoOrg/TMS.git (fetch)
origin  https://github.com/badriamouri/TMS.git (push)
origin  https://github.com/NrohoOrg/TMS.git (push)
```

---

### View Recent Commits
```bash
git log --oneline -5
```

---

### Undo Last Commit (Keep Changes)
```bash
git reset --soft HEAD~1
```

---

### Discard All Uncommitted Changes
```bash
git reset --hard HEAD
```

⚠️ **Warning:** This permanently deletes your changes!

---

## 🚀 Full Workflow Example

```bash
# 1. Start dev server
cd apps/frontend
npm run dev

# 2. Make changes in your editor...

# 3. Run checks
npx tsc --noEmit
npm run lint
npm run build

# 4. Stage and commit
cd ../..
git add -A
git commit -m "feat(frontend): add export functionality to reports page

- Add CSV export button to DispatcherReports
- Implement mock data export with date range filter
- Style button with primary variant"

# 5. Push to both repos
git push origin main

# 6. Check Vercel deployment
# Visit https://vercel.com/dashboard and verify build
```

---

## 📝 Notes

- **Every push deploys automatically** — no manual Vercel CLI commands needed
- **Test locally first** — `npm run build` catches 99% of production issues
- **Keep commits atomic** — one logical change per commit
- **Write descriptive messages** — future you will thank you

---

## 🔗 Resources

- **Local dev:** http://localhost:3000
- **Vercel dashboard:** https://vercel.com/dashboard
- **GitHub org repo:** https://github.com/NrohoOrg/TMS
- **GitHub personal repo:** https://github.com/badriamouri/TMS
- **Next.js docs:** https://nextjs.org/docs
- **Vercel docs:** https://vercel.com/docs
