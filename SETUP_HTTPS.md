# Setting Up HTTPS for Local Development

## Option 1: Install mkcert (Recommended - Creates Trusted Certificates)

### On Windows:

1. **Install mkcert using Chocolatey** (if you have Chocolatey):
   ```powershell
   choco install mkcert
   ```

2. **Or download directly**:
   - Go to: https://github.com/FiloSottile/mkcert/releases
   - Download `mkcert-v1.4.4-windows-amd64.exe` (or latest version)
   - Rename it to `mkcert.exe`
   - Move it to a folder in your PATH (e.g., `C:\Windows\System32`) or add it to PATH

3. **Install the local CA**:
   ```powershell
   mkcert -install
   ```

4. **Generate certificates for localhost and your IP**:
   ```powershell
   # Get your local IP address first (run: ipconfig and look for IPv4 Address)
   # Then run:
   mkcert localhost 127.0.0.1 ::1 [YOUR_LOCAL_IP]
   ```
   This creates `localhost+3.pem` and `localhost+3-key.pem`

5. **Update vite.config.ts** to use these certificates (see below)

### Update vite.config.ts:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    https: {
      key: fs.readFileSync(path.resolve(__dirname, 'localhost+3-key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, 'localhost+3.pem')),
    },
  },
})
```

## Option 2: Quick Fix - Proceed Past Warning

### On Computer Browser:
1. Click "Advanced" → "Proceed to localhost (unsafe)"

### On iPhone Safari:
1. Tap "Show Details"
2. Tap "visit this website"
3. You'll need to do this each time you visit

## Option 3: Use ngrok (Alternative)

1. Sign up at https://ngrok.com (free)
2. Download ngrok
3. Run: `ngrok http 5174`
4. Use the HTTPS URL ngrok provides (works on mobile without warnings)

