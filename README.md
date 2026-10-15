# LIVE-TRACK by Logic_Shift!!!

A disaster-response command dashboard for logging incidents, analyzing aerial drone imagery, mapping affected areas, dispatching rescue tasks, and generating after-action reports.

## Features

| Module | What it does |
| --- | --- |
| **Overview** | Dashboard with summary stat cards, a bar chart of incidents by disaster type, and recent dispatch activity. |
| **Incidents** | Create, edit, view and delete incidents. Search and filter by priority, status and disaster type. |
| **AI Analysis** | Upload a JPG/PNG aerial image (up to 20 MB), link it to an incident, and view detections of people, vehicles and obstacles with confidence scores. *(Simulated in Phase 1.)* |
| **Rescue Map** | Interactive Leaflet map on OpenStreetMap tiles with color-coded incident markers by priority. |
| **Tasks** | Assign rescue tasks to response teams. Switch between a Kanban board and a table view. |
| **Reports** | Generate per-incident audit reports (detection totals, open vs. completed tasks), preview them, print them, or export all reports to CSV. |
| **Settings** | Theme (dark/light), notification toggles, and a one-click reset of demo data. |

### Typical workflow

1. Log a critical incident with location, type and severity.
2. Upload drone imagery and run the analysis.
3. Confirm the incident's position on the map.
4. Dispatch tasks to response teams with due dates.
5. Generate and export a situation report.

---

## Tech Stack

- [Next.js](https://nextjs.org/) 16 (App Router) with React 19 and TypeScript
- [Tailwind CSS](https://tailwindcss.com/) v4 (neo-brutalist UI theme)
- [react-leaflet](https://react-leaflet.js.org/) / [Leaflet](https://leafletjs.com/) for mapping
- [Recharts](https://recharts.org/) for charts
- [lucide-react](https://lucide.dev/) for icons

---

## Getting Started

### Prerequisites

- Node.js 20 or later
- npm

## Project Structure

```
.
├── app/
│   ├── page.tsx                  # Landing page
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Global styles
│   └── (dashboard)/              # Authenticated-style app shell
│       ├── dashboard/            # Overview
│       ├── incidents/            # Incident management
│       ├── analysis/             # Aerial image analysis
│       ├── map/                  # Rescue map
│       ├── tasks/                # Task board / table
│       ├── reports/              # Reports and CSV export
│       └── settings/             # App settings
├── components/
│   ├── layout/                   # AppShell, Sidebar, TopNav
│   ├── map/                      # Leaflet map component
│   └── ui/                       # Modal, badges, StatCard, toasts, etc.
├── context/
│   └── AppContext.tsx            # Global state and actions
├── lib/
│   ├── types.ts                  # TypeScript data models
│   ├── storage.ts                # localStorage persistence helpers
│   ├── mockData.ts               # Seed data and sample detections
│   └── utils.ts                  # Shared helpers
└── public/                       # Static assets
```

---

## Architecture

### State management

All application state lives in a single React context (`context/AppContext.tsx`) exposing incidents, analyses, tasks, reports, notifications and settings, along with add/update/delete actions. Every mutation is written through to `localStorage` via `lib/storage.ts               .

### Data model

Defined in `lib/types.ts`. An `Incident` is the central record; `ImageAnalysis`, `RescueTask` and `Report` each reference it through `incidentId`.

```
Incident ──< ImageAnalysis ──< Detection
         ──< RescueTask
         ──< Report
```

- **Disaster types:** Flood, Earthquake, Fire, Landslide, Storm, Infrastructure Damage, Other Emergency
- **Priority:** Critical, High, Medium, Low
- **Incident status:** Reported, Under Investigation, Response In Progress, Resolved, Closed
- **Task status:** Pending, In Progress, Blocked, Completed
- **Detection classes:** Person, Vehicle, Obstacle

### Persistence

Data is stored under `lt_*` keys in `localStorage`. Use **Settings → Reset demo data** to restore the seed data, or clear site storage in your browser's dev tools.

---

## Current Limitations

- **Simulated AI.** Clicking *Analyze* waits briefly and attaches a random subset of hardcoded sample detections (`SAMPLE_DETECTIONS` in `lib/mockData.ts`). The uploaded image is not actually processed. Results are flagged with `isDemoResult: true` and labeled as demo output in the UI.
- **Local-only data.** Everything is stored per browser, so there is no sync between users or devices.
- **No authentication or roles.**
- **Map tiles** are loaded from public OpenStreetMap servers and need an internet connection.

---

## Roadmap Ideas

- Replace the simulated analysis with a real object-detection model (for example YOLO) behind a Next.js API route, drawing bounding boxes on the annotated image.
- Move persistence from `localStorage` to a database with a server API.
- Add authentication and role-based access for responders and coordinators.
- Real-time updates so multiple users see the same incidents and tasks.
- Optional alerts and notifications that integrate with external services.

---

## Notes for Contributors

`AGENTS.md` is generated by `next dev` and warns that this Next.js version has breaking changes compared with older releases. Check the docs in `node_modules/next/dist/docs/` before changing framework-level code.

---

## Team

Built by Logic_Shift!!!

## License

No license specified yet. Add one (for example MIT) before publishing or accepting contributions.
