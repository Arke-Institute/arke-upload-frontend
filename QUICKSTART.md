# Quick Start Guide

Get the Arke upload frontend running in 5 minutes.

## 1. Install Dependencies

```bash
npm install
```

## 2. Configure Environment

Edit `wrangler.jsonc` if needed (defaults should work):

```jsonc
{
  "vars": {
    "UPLOAD_API_URL": "http://upload.arke.institute",
    "ARKE_INSTITUTE_URL": "https://arke.institute"
  },
  "services": [
    {
      "binding": "ORCHESTRATOR",
      "service": "arke-orchestrator"
    }
  ]
}
```

## 3. Build & Run

```bash
# Build client bundle and run dev server
npm run dev
```

Open `http://localhost:8787`

## 4. Test Upload

1. Enter your name (e.g., "Test User")
2. Enter archive path (e.g., "/test/upload")
3. Click "Select Directory" and choose a folder
4. Click "Start Upload"
5. Watch the progress bar!

## Development Commands

```bash
# Development
npm run dev              # Build once, run dev server
npm run dev:watch        # Auto-rebuild on changes

# Building
npm run build:client     # Build client bundle only
npm run inject:client    # Inject client into worker
npm run build            # Build both

# Deployment
npm run deploy           # Deploy to Cloudflare
```

## File Structure

```
src/
├── client/          # Browser code (TypeScript)
├── templates/       # HTML components
├── api/             # Worker API routes
└── index.ts         # Worker entry point

dist/
└── client.js        # Built client bundle (auto-generated)
```

## Troubleshooting

**"Cannot find module './client-bundle'"**
→ Run `npm run build` first

**"ORCHESTRATOR binding not found"**
→ Make sure `arke-orchestrator` worker is deployed

**Build fails**
→ Delete `node_modules`, `dist/`, run `npm install` again

## Next Steps

- Read [README.md](./README.md) for full documentation
- Check [UPLOAD_API.md](./UPLOAD_API.md) for API details
- Customize UI in `src/templates/components/`

## Production Deployment

```bash
# Build and deploy
npm run deploy

# Add custom domain in Cloudflare Dashboard:
# Workers & Pages → arke-upload-frontend → Settings → Domains
```

Your frontend will be live at:
`https://arke-upload-frontend.<your-subdomain>.workers.dev`
