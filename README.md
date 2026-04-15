# 🏆 ADNLS3 | ADNU League Season 3

<div align="center">
  <img src="https://img.shields.io/badge/Status-Live-success?style=for-the-badge" alt="Status Live" />
  <img src="https://img.shields.io/badge/Stack-React_|_Supabase-blue?style=for-the-badge" alt="Stack React Supabase" />
  <img src="https://img.shields.io/badge/Deployment-Vercel-black?style=for-the-badge" alt="Deployment Vercel" />

  <br />

  ## 🔗 [Visit Official Website: adnuleague.com](https://adnuleague.com/)
  **The official digital hub for the Ateneo de Naga League Season 3**
</div>

---

## 📖 Overview
**ADNLS3** served as the official digital "single source of truth" for Ateneo de Naga University’s Intramurals. The platform was designed to eliminate information fragmentation by centralizing schedules, real-time scoring, and official announcements into a high-performance web experience.


### What The App Does
The site functions as both a public information hub and an admin dashboard for league operations.
* **Public Access:** Visitors can view the home page, event schedules, rankings, brackets, guidelines, directory, and the about page.
* **Admin Access:** Authorized managers can handle announcements, schedules, featured matchups, "now-happening" posts, scoring/results, and concern submissions.

---

## ✨ Core Features

### 🏠 Homepage Highlights
The home page combines four core surfaces to ensure maximum engagement:
* **Featured Matchup Carousel:** Spotlights marquee games and match previews.
* **Now Happening Carousel:** Real-time event photos and live on-the-ground updates.
* **Latest Announcement Panel:** Centralized location for official notices.
* **Home Rankings Preview:** Instant snapshot of current department standings.

### 🛠 Technical Capabilities
* **Announcements:** Content records surfaced on the home page with change logs for full auditability.
* **Schedule Management:** Organized by day with stored activity logs to maintain program flow.
* **Rankings & Scoring:** Admin-controlled visibility settings, including blackout modes and tally hiding.
* **Brackets:** Read-only public pairing views backed by a persistent `brackets` table.
* **Directory:** Searchable listing with committee-based filtering and quick contact actions.
* **Guidelines:** Securely served assets via **Supabase Storage** buckets.


### 🔐 Admin Portal
Admins sign in at a specific link to access a tabbed dashboard for managing:
* Upcoming games and featured matchups.
* Now Happening media, captions, and publishing states.
* Schedules, announcements, and scoring results.
* Concern submissions and forum entries.

---


## 📈 Performance & Impact Metrics
* **Total Reach:** Handled **52,000+ total page views** during the peak event period.
* **Unique Users:** Served over **11,000 unique visitors** within a 5-day window.
* **System Reliability:** Maintained **99.9% uptime** under heavy concurrent load during live match updates.
* **Development Velocity:** Delivered the full-stack platform in a **strict two-week sprint** while managing concurrent academic exams.

---

## ✨ Project Highlights & Key Features

### 📡 Public Information Hub
* **Real-Time Bracketing:** Dynamic tournament trees that update instantly as scores are reported.
* **Live Event Scheduling:** A day-by-day program (Day 1–5) with advanced filtering for sports and venues.
* **Automated Rankings:** Real-time department standings and medal tallies with admin-controlled "blackout" visibility for finales.
* **Engagement Surfaces:** Integrated "Now Happening" media carousels and featured match spotlights to drive student engagement.

### 🛡️ Security & Reliability
* **Centralized Management:** Admins manage matchups, media, schedules, and scoring via a protected dashboard.
* **Auditability:** Activity logs for all admin-driven changes to ensure data integrity.
* **Security Post-Mortem:** Mitigated unauthorized API information disclosure by implementing strict permission scoping and data abstraction.
* **Secure Assets:** Guidelines and media served via **Supabase Storage** with row-level security.


---

## 🤖 AI-Accelerated Workflow
To meet the aggressive two-week deadline, We integrated an **AI-first development strategy**:
* **Architecture Simulation:** Used **Gemini** as a project architect to simulate database schemas and handle edge-case logic before coding.
* **High-Velocity Coding:** Leveraged **GitHub Copilot** to automate boilerplate React components and accelerate debugging.
* **Deployment:** Utilized a CI/CD pipeline via **Vercel** to push critical hotfixes instantly during live events.

---

