# ADNLS3 / ADNU League Season 3

ADNLS3 is the official Ateneo de Naga League Season 3 website. It presents the public league experience, publishes event information, and provides a protected admin portal for content managers.

Repository: ADNUELeague

## What The App Does

The site is a public information hub plus admin dashboard for league operations. Visitors can view the home page, event schedule, rankings, brackets, guidelines, directory, and about page. Authorized admins can manage announcements, schedules, featured matchups, now-happening posts, scoring and results, and concern submissions.

## Public Routes

The live routes are defined in [src/routes/AppRoutes.jsx](src/routes/AppRoutes.jsx).

| Route | Purpose |
| --- | --- |
| `/` | Home page with the featured matchup carousel, now-happening carousel, latest announcements, and home rankings. |
| `/schedule` | Day 1 to Day 5 event schedule with sports, times, and venues. |
| `/ranking` | Department standings and event rankings. |
| `/bracketing` | Tournament bracket views and matchups. |
| `/more/guidelines` | Official guidelines and event requirements, including downloadable PDFs from Supabase Storage. |
| `/more/directory` | Searchable team manager directory with contact and social links. |
| `/more/about` | About page, acknowledgments, and the concerns or forum entry point. |

## Homepage Highlights

The home page combines four core surfaces:

- Featured matchup carousel for spotlight games and match previews.
- Now Happening carousel for event photos and live updates.
- Latest announcement panel for official notices.
- Home rankings preview for the current standings snapshot.

## Core Features

### Announcements

Announcements are published content records surfaced on the home page and announcement-related views. The admin portal can create, edit, and remove them, and the schema records change logs for auditability.

### Schedule

Schedules are organized by day and displayed publicly as the day-by-day event program. The admin portal manages event entries for the schedule flow, and the schema stores schedule rows plus activity logs.

### Rankings and Scoring

Rankings show overall department standings and event-level results. The app also supports scoring management in the admin portal, with app settings for visibility controls such as blackout mode, breakdown visibility, forum visibility, and tally hiding.

### Brackets

The bracketing page shows tournament pairings and scores for league events. It is read-only for public visitors and is backed by the `brackets` table.

### Featured Matchups

Featured matchups power the home page carousel and can be curated by admins. The app uses published matchup entries, ordering, and activity logs to keep the carousel current.

### Now Happening

Now Happening is a public media carousel for current event photos. Admins can upload images to the `now-happening` Supabase Storage bucket and manage captions, ordering, and publish state.

### Directory

The directory page provides searchable team manager listings with committee filtering and quick contact actions.

### Guidelines

Guidelines are served as downloadable PDFs and related images from the `adnl-guidelines` Supabase Storage bucket. The page groups files into official guideline cards and exposes view and download actions.

### About and Concerns

The about page presents the season story, acknowledgments, and the anonymous concern workflow. Forum visibility can be toggled through app settings.

## Admin Portal

The protected admin area lives under `/adnu-admin-portal` and is guarded by [src/routes/ProtectedRoute.jsx](src/routes/ProtectedRoute.jsx).

Admins sign in at `/adnu-admin-portal/login`, then use the dashboard to manage:

- Upcoming games and featured matchup entries
- Now Happening posts and uploaded images
- Schedules
- Announcements
- Scoring and match results
- Concerns and forum submissions

The dashboard is a tabbed manager panel, not a separate public experience.

## Supabase Data Layer

The app is wired to Supabase through [src/services/supabaseClient.js](src/services/supabaseClient.js).

Required environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`

If these values are missing, the client falls back to mock responses for UI testing. Admin auth will not be functional in that mode.

Key tables and buckets used by the app:

- `announcements`
- `announcement_activity_logs`
- `schedules`
- `schedule_activity_logs`
- `departments`
- `events`
- `event_results`
- `brackets`
- `directory`
- `guidelines`
- `featured_matchup`
- `featured_matchup_entries`
- `featured_matchup_activity_logs`
- `now_happening_posts`
- `now_happening_activity_logs`
- `forum_submissions`
- `app_settings`
- Storage bucket: `now-happening`
- Storage bucket: `adnl-guidelines`

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file if needed and define the Supabase variables listed above.

3. Start the dev server:

```bash
npm run dev
```

Optional commands:

```bash
npm run build
npm run preview
```

## Project Structure

- `src/pages` contains the route-level screens.
- `src/features` contains domain-specific feature modules.
- `src/services` contains Supabase client and data-access logic.
- `src/components` contains reusable UI building blocks.
- `src/routes` contains the route map and auth guard.

## Notes

- Public access is read-only for most content.
- Admin write access is controlled through Supabase auth and row-level security.
- The README reflects the current implemented app, not a roadmap.
