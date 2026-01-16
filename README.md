<div align="center">
  <img src="public/logo.png" alt="AShow Tracker Logo" width="120" />
  <h1>AShow Tracker</h1>
  <p>
    <strong>A next-generation anime & show tracking experience.</strong>
  </p>
  
  <p>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" /></a>
    <a href="https://tauri.app/"><img src="https://img.shields.io/badge/Tauri-FFC131?style=for-the-badge&logo=tauri&logoColor=black" alt="Tauri" /></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
    <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" /></a>
  </p>
</div>

<br />

## About

**AShow Tracker** is a premium cross-platform application built for enthusiasts who want a beautiful, seamless way to track their binge-watching habits. Breaking away from clunky web interfaces, it offers a native, glassmorphism-inspired UI with deep system integration.

## Features (v1.9.1)

### 🎨 Stunning UI/UX
- **Glassmorphism Design** — Modern, translucent aesthetics with dynamic gradient backgrounds
- **Premium Interactions** — "Shiny" button animations, smooth transitions, and custom mouse aura effect
- **Deep System Integration** — Custom toast notifications and deep linking support
- **Responsive Mobile UI** — Fully adaptive interface for mobile screens

### 🔐 Authentication
- **Secure Login** — OAuth integration via Google (Supabase Auth)
- **Session Management** — Automatic token handling with PKCE flow for mobile
- **Data Protection** — In-memory session validation with Row Level Security (RLS)

### 👤 Profile
- **Identity** — Set a custom nickname and upload a profile picture with drag & zoom cropping
- **Customization** — Shuffle your banner gradient to match your vibe
- **Social Fields** — Add custom links (GitHub, Twitter, etc.) with platform-specific icons
- **Bio** — A Markdown-style "About Me" section to tell your story

### 📺 Multi-Source Tracking
- **Anime** — Full integration with Jikan API (MyAnimeList data)
- **Movies & TV Shows** — TMDB integration for Hollywood and international content
- **Smart Deduplication** — Intelligent search that removes duplicates across sources

### 📋 Custom Lists
- **Multi-List Support** — Create unlimited custom lists (Watching, Plan to Watch, Favorites, etc.)
- **Custom Icons & Colors** — Personalize each list with unique icons
- **Easy Organization** — Drag and drop shows between lists

### 🔔 Notifications
- **New Episodes** — Get notified when new episodes air for your tracked shows
- **Smart Updates** — Database-level deduplication prevents duplicate notifications
- **Flexible Delivery** — Choose between in-app bell or native OS notifications

### ⚡ Real-time Sync
- **Cross-Device** — Changes on Desktop reflect on Mobile instantly, and vice-versa
- **Live Updates** — Watchlist status, episode progress, and profile changes sync in real-time
- **Seamless Experience** — Switch devices mid-session without missing a beat

### 🔄 Auto-Updates
- **In-App Updates** — Seamless update mechanism with signed releases
- **One-Click Install** — Update banner with instant installation
- **Startup Option** — Optional auto-launch at system startup

---

## Roadmap

We're actively building the future of show tracking:

- [x] 📱 Mobile Adaptation — Fully responsive mobile app for Android
- [ ] 🤖 Smart Recommendations — AI-driven suggestions based on your list
- [ ] 👥 Social Features — Friend lists and shared watchlists

---

## Download & Installation

### Windows
1. Download the latest `.msi` or `.exe` installer from the [Releases](https://github.com/barros-luis/show-tracker/releases/latest) page.
2. Run the installer.
3. **Windows SmartScreen Warning:** Since the app is not code-signed with a paid certificate, Windows may show a warning:
   - Click **"More info"** → **"Run anyway"**
   
   > This is normal for indie apps. The app is safe and open-source!

### macOS
1. Download the `.dmg` file from the [Releases](https://github.com/barros-luis/show-tracker/releases/latest) page.
2. Open the DMG and drag the app to Applications.
3. **Gatekeeper Warning:** Since the app is not notarized, macOS will block it. Run this in Terminal (one-time):
   ```bash
   xattr -cr /Applications/AShowTracker.app
   ```
   > The app is safe and open-source!

### Android
1. Download the `.apk` file from the [Releases](https://github.com/barros-luis/show-tracker/releases/latest) page.
2. Open the file on your Android device.
3. If prompted, enable "Install from Unknown Sources" for your browser/file manager.
4. Tap **Install**.

After initial installation, you can update directly from within the app!

---

## Development

<details>
<summary>Developer setup</summary>

### Prerequisites
- Node.js (v18+)
- Rust (latest stable)
- Android Studio (for mobile development)

### Setup
```bash
git clone https://github.com/barros-luis/show-tracker.git
cd show-tracker
npm install
npm run tauri dev        # Desktop
npm run tauri android dev # Mobile
```
</details>

---

<div align="center">
  <sub>Built with ❤️ by the AShow Team</sub>
</div>
