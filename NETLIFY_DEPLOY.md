# Deploying CoFish to Netlify

## Quick Deploy (Recommended)

### Option 1: Deploy via Netlify CLI (Fastest)

1. **Install Netlify CLI** (if not already installed):
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**:
   ```bash
   netlify login
   ```

3. **Initialize and deploy**:
   ```bash
   netlify init
   ```
   - Choose "Create & configure a new site"
   - Choose your team
   - Site name: `cofish-mvp` (or your preferred name)
   - Build command: `npm run build` (should auto-detect)
   - Publish directory: `dist` (should auto-detect)

4. **Deploy**:
   ```bash
   netlify deploy --prod
   ```

Your site will be live at `https://your-site-name.netlify.app`

---

### Option 2: Deploy via Netlify Dashboard (Git-based)

1. **Push your code to GitHub/GitLab/Bitbucket**

2. **Go to Netlify Dashboard**: https://app.netlify.com

3. **Click "Add new site" → "Import an existing project"**

4. **Connect your Git provider** and select your repository

5. **Configure build settings** (should auto-detect):
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Node version**: `18` (or latest LTS)

6. **Click "Deploy site"**

Netlify will automatically deploy on every push to your main branch!

---

### Option 3: Drag & Drop Deploy

1. **Build your project locally**:
   ```bash
   npm run build
   ```

2. **Go to Netlify Dashboard**: https://app.netlify.com

3. **Drag and drop the `dist` folder** onto the deploy area

4. **Your site is live!**

---

## Environment Variables (if needed)

If you need to set any environment variables:

1. Go to **Site settings** → **Environment variables**
2. Add any variables your app needs
3. Redeploy

**Note**: Your Amplify configuration is already in `amplifyconfiguration.json`, so you likely don't need additional env vars.

---

## Custom Domain (Optional)

1. Go to **Site settings** → **Domain management**
2. Click **Add custom domain**
3. Follow the instructions to configure DNS

---

## Important Notes

✅ **HTTPS is automatic** - Netlify provides free SSL certificates  
✅ **SPA routing works** - The `_redirects` file handles React Router  
✅ **PWA ready** - Your `manifest.json` is included  
✅ **Mobile testing** - Access your site on iPhone/Android with proper HTTPS  

---

## Troubleshooting

### Build fails?
- Check that `npm run build` works locally
- Check Netlify build logs for errors
- Ensure Node version is set to 18 or higher

### Routing doesn't work?
- Verify `public/_redirects` file exists with: `/*    /index.html   200`
- Check `netlify.toml` has the redirects configuration

### Camera not working on mobile?
- Ensure you're accessing via HTTPS (Netlify provides this automatically)
- Check browser console for errors
- Verify camera permissions are granted

---

## Next Steps After Deployment

1. **Test on iPhone/Android** - Your site will have proper HTTPS
2. **Share with friends** - Send them the Netlify URL
3. **Set up continuous deployment** - Every push auto-deploys
4. **Monitor usage** - Check Netlify analytics

Your app is now live and ready to share! 🎣






