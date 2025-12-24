# Icons Directory

This directory should contain PNG icon files for the PWA app.

## Required Icon Files

### App Icons
- `icon-72x72.png` - 72x72px
- `icon-96x96.png` - 96x96px
- `icon-128x128.png` - 128x128px
- `icon-192x192.png` - 192x192px (already referenced in manifest)
- `icon-512x512.png` - 512x512px (already referenced in manifest)

### Badge Icon
- `badge-72x72.png` - 72x72px (used in notifications)

### Apple Icon
- `apple-touch-icon.png` - 180x180px (for iOS home screen)

## Quick Solution: Generate Using Online Tools

1. **Create a base image** (e.g., 512x512px with your design)
2. **Use an online converter:**
   - [convertio.co](https://convertio.co/)
   - [icoconvert.com](https://icoconvert.com/)
   - [ezgif.com](https://ezgif.com/)

3. **Resize to all required dimensions** - Most tools can create multiple sizes at once

## Alternative: Use Placeholder Icons

If you don't have icons ready, you can use inline SVG data URLs in `manifest.json`:

```json
"icons": [
  {
    "src": "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'><rect fill='%230EA5E9' width='192' height='192'/><text x='50%' y='50%' font-size='120' font-weight='bold' fill='white' text-anchor='middle' dominant-baseline='central'>H</text></svg>",
    "sizes": "192x192",
    "type": "image/svg+xml"
  }
]
```

## Note

The app will work without these icon files, but PWA installation on home screen may not show a proper icon. The app itself will function normally for quiz taking, offline support, and all other features.
