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

## 🚀 About
**AShow Tracker** is a premium desktop application built for enthusiasts who want a beautiful, seamless way to track their binge-watching habits. Breaking away from clunky web interfaces, it offers a native, glassmorphism-inspired UI with deep system integration.

## ✨ Features (v0.7.0)

### 🎨 Stunning UI/UX
- **Glassmorphism Design:** Modern, translucent aesthetics with dynamic gradient backgrounds.
- **Premium Interactions:** "Shiny" button animations, smooth transitions, and a custom mouse aura effect.
- **Deep System Integration:** Custom toast notifications and deep linking support.

### 🔐 Robust Authentication
- **Secure Login:** OAuth integration via Google (Supabase Auth).
- **Session Management:** Automatic token handling and deep link redirection logic.
- **Security:** In-memory session validation and Row Level Security (RLS) data protection.

### 👤 Profile V1 (New!)
- **Identity:** Set a custom nickname and upload a profile picture with **Drag & Zoom Cropping**.
- **Customization:** "Shuffle" your banner gradient to match your vibe.
- **Social Fields:** Add custom links (GitHub, Twitter, etc.) with specific icons.
- **Bio:** A Markdown-style "About Me" section to tell your story.

### 📺 Management
- **Search:** Instant access to anime metadata (Jikan API).
- **Watchlist:** One-click add to your personal tracking list.
- **Progress:** Visual progress bars for episode tracking.

---

## 🗺️ Roadmap & Upcoming Features

We are actively building the future of show tracking. Here is what's coming next:

- [ ] **Mobile Adaptation:** Seamless sync with a future mobile app (#19).
- [ ] **Smart Recommendations:** AI-driven suggestions based on your list (#12).
- [ ] **Detailed Info View:** Trailers, full descriptions, and advanced metadata (#15).
- [ ] **Advanced Filtering:** Sort by genre, score, and status (#21).
- [ ] **Multi-List Support:** Separate lists for Movies, Shows, and Anime (#13).
- [ ] **Custom Lists:** Create your own collections (e.g., "Weekend Binge") (#14).
- [ ] **Social Features:** Notifications system and friend updates (#18).
- [ ] **Auto-Updates:** In-app update mechanism to skip manual downloads (#20).

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- Rust (latest stable) for Tauri

### Installation

1. **Clone the repo**
   ```bash
   git clone https://github.com/yourusername/show-tracker.git
   cd show-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run Development Mode**
   ```bash
   npm run tauri dev
   ```

4. **Build for Production**
   ```bash
   npm run tauri build
   ```

---

<div align="center">
  <sub>Built with ❤️ by the AShow Team</sub>
</div>
