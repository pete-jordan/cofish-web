# Pushing to GitHub - Quick Guide

## Your Current Setup
✅ Git repository initialized  
✅ Remote configured: `https://github.com/pete-jordan/cofish-web.git`  
✅ On branch: `main`

## Steps to Push

### 1. Stage all your changes
```bash
git add .
```

### 2. Commit your changes
```bash
git commit -m "Add catch verification flow with multi-frame analysis and uniqueness checking"
```

### 3. Push to GitHub
```bash
git push origin main
```

If you get authentication errors, you may need to:
- Use a Personal Access Token instead of password
- Or set up SSH keys

---

## Alternative: Step-by-Step Commands

```bash
# See what changed
git status

# Add all files (except those in .gitignore)
git add .

# Commit with a message
git commit -m "Your commit message here"

# Push to GitHub
git push origin main
```

---

## If You Get Authentication Errors

GitHub no longer accepts passwords. You need a **Personal Access Token**:

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name like "CoFish Development"
4. Select scopes: `repo` (full control)
5. Generate and **copy the token** (you won't see it again!)
6. When pushing, use the token as your password

Or use SSH (more secure long-term):
```bash
# Check if you have SSH keys
ls ~/.ssh

# If not, generate one
ssh-keygen -t ed25519 -C "your_email@example.com"

# Add to GitHub: Settings → SSH and GPG keys → New SSH key
# Copy the public key: cat ~/.ssh/id_ed25519.pub
```

---

## After Pushing

Once your code is on GitHub:
1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Select "GitHub" and authorize Netlify
4. Choose your `cofish-web` repository
5. Build settings (auto-detected):
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Click "Deploy site"

Done! 🚀



