

## Plan: Dual Distribution - Native Android + PWA for iOS

### Overview
Set up PWA (Progressive Web App) support for iOS users while keeping the existing Capacitor configuration for Android native app builds.

**Distribution Strategy:**
- **Android Users**: Native APK via Capacitor (already configured)
- **iOS Users**: Installable PWA from browser (to be added)

---

### Changes Required

#### 1. Install PWA Plugin

Add `vite-plugin-pwa` dependency to enable PWA functionality.

---

#### 2. Configure Vite for PWA

**File:** `vite.config.ts`

Add PWA plugin configuration with:
- App name: "Masjid Sanda Register"
- Short name: "Sanda Register"
- Theme color matching app branding (emerald green)
- Icons for various sizes (192x192, 512x512)
- Service worker for offline support
- iOS-specific meta tags support

---

#### 3. Update HTML with PWA Meta Tags

**File:** `index.html`

Add mobile-optimized meta tags:
- Apple-specific tags for iOS home screen
- Theme color meta tag
- Apple touch icon links
- Apple mobile web app capable tag
- Status bar style

---

#### 4. Create PWA Icons

Generate required icon sizes in `public/` folder:
- `pwa-192x192.png` - Standard PWA icon
- `pwa-512x512.png` - Large PWA icon
- `apple-touch-icon.png` - iOS home screen icon (180x180)

These will be created from the existing `ahsan-logo.png`.

---

#### 5. Create Install Page (Optional but Recommended)

**File:** `src/pages/Install.tsx`

A dedicated page at `/install` that:
- Detects if user is on iOS
- Shows step-by-step instructions for iOS users:
  1. Tap the Share button
  2. Scroll down and tap "Add to Home Screen"
  3. Tap "Add" to confirm
- Shows Android users a link to download the APK
- Provides visual guides for installation

---

### Technical Details

```text
┌─────────────────────────────────────────────────────┐
│                  User Access Flow                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Android User                    iOS User            │
│       │                              │               │
│       ▼                              ▼               │
│  Download APK                  Visit Website         │
│  (Capacitor Build)                   │               │
│       │                              ▼               │
│       ▼                     Share → Add to Home      │
│  Install Native App               Screen             │
│       │                              │               │
│       ▼                              ▼               │
│  Full Native                   PWA Installed         │
│  Experience                    (Offline Ready)       │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**PWA Configuration in vite.config.ts:**
```typescript
import { VitePWA } from 'vite-plugin-pwa'

VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico', 'ahsan-logo.png'],
  manifest: {
    name: 'Masjid Sanda Register',
    short_name: 'Sanda Register',
    description: 'Track and manage mosque monthly donations',
    theme_color: '#10b981',
    background_color: '#ffffff',
    display: 'standalone',
    icons: [...]
  }
})
```

---

### Summary of Files

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | Modify | Add vite-plugin-pwa dependency |
| `vite.config.ts` | Modify | Configure PWA plugin |
| `index.html` | Modify | Add iOS/PWA meta tags |
| `public/pwa-192x192.png` | Create | PWA icon |
| `public/pwa-512x512.png` | Create | PWA icon |
| `public/apple-touch-icon.png` | Create | iOS icon |
| `src/pages/Install.tsx` | Create | Installation guide page |
| `src/App.tsx` | Modify | Add /install route |

---

### Result

After implementation:
- **iOS users** can visit the app, tap Share → "Add to Home Screen" and get an app-like experience with offline support
- **Android users** continue using the native APK built with Capacitor
- Both platforms get the same functionality, just different distribution methods

