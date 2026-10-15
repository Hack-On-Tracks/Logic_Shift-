# live-Track
### AI-Assisted Disaster Intelligence & Rescue Prioritization

**Live-Track** is a disaster-response support platform designed to help emergency responders and analysts interpret aerial or drone imagery, identify visible objects, organize potential hazards, prioritize findings, and generate structured incident reports.

The project aims to turn raw disaster imagery into actionable information through computer vision, AI-assisted scene analysis, rule-based prioritization, human review, and PDF reporting.

> **Important :** Logic-Track is a decision-support tool, not an autonomous rescue system. All findings require human verification before being treated as confirmed information.

---

## Problem Statement

During floods, earthquakes, landslides, and other disasters, emergency responders may receive large volumes of aerial imagery. Manually reviewing these images can be time-consuming, and important visual evidence may be difficult to organize and prioritize.

Live-Track aims to streamline this process by providing a unified interface for image analysis, findings management, incident visualization, and report generation.

## Our Solution

Live-Track follows a structured workflow:

**Upload → Detect → Understand → Prioritize → Review → Map → Report**

- **Image Analysis:** Upload disaster imagery or select a demonstration sample.
- **Object Detection:** Use YOLO-based computer vision to detect supported object classes.
- **Scene Understanding:** Generate structured scene summaries and access assessments using an optional multimodal AI provider.
- **Finding Prioritization:** Apply a rule-based rubric to rank potential hazards and observations.
- **Human Verification:** Allow reviewers to confirm, reject, or update findings and review suggested tasks.
- **Incident Mapping:** Visualize findings when reliable geographic coordinates are available.
- **PDF Reports:** Generate structured reports for documentation and further review.

## Key Features

### 1. Overview Dashboard
- Summary cards for analyses, detections, priority levels, and pending reviews.
- Quick access to image analysis, findings, maps, and reports.
- Data-driven statistics rather than fabricated counts.

### 2. Disaster Image Analysis
- Upload images and select sample scenarios.
- Preview original and annotated images.
- Display detected objects, bounding boxes, classes, and confidence scores.
- Adjust the confidence threshold to filter visible detections.
- Validate uploaded image files.

### 3. AI-Assisted Scene Understanding
- Generate structured scene summaries.
- Assess visible access conditions cautiously.
- Separate computer-vision detections from AI-generated interpretations.
- Clearly identify live results, cached demonstration results, and unavailable components.

### 4. Incident Map
- Display findings with confirmed geographic coordinates.
- Use priority-based markers and informative popups.
- Handle missing location information without inventing coordinates.
- Use Leaflet and OpenStreetMap for map visualization.

### 5. PDF Report Generation
- Generate downloadable incident reports.
- Include image information, detections, ranked findings, review decisions, and approved tasks.
- Display coordinate sources or explicitly state when location is unknown.
- Include limitations, safety disclaimers, and a reviewer sign-off section.
- Handle missing images and empty findings gracefully.

---

## Technology Stack

The following is the intended project stack. Components marked as planned should not be considered implemented until backend integration and testing are complete.

| Component | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| UI and styling | Existing project UI and styling stack |
| Object detection | Python, Ultralytics YOLO |
| Backend API | Python, FastAPI — planned |
| Image processing | Pillow, OpenCV where required |
| AI scene analysis | Configurable multimodal AI provider — planned |
| Data persistence | Backend database — planned |
| Interactive maps | OpenStreetMap |
| Charts | Recharts |
| PDF generation | ReportLab — backend integration planned |
| API documentation | FastAPI Swagger UI — planned |
| Version control | Git and GitHub |

**Model choice:** YOLO is intended for object detection. The exact model variant and weights should be documented once selected and tested on the target hardware. Detection accuracy on aerial disaster imagery depends on the model, training data, image resolution, and object scale.

---

## System Architecture

The intended architecture separates the user interface, backend processing, and reporting responsibilities.

```text
                 USER
                   |
                   v
          React Frontend
                   |
          Upload / Select Sample
                   |
                   v
          FastAPI Backend
                   |
          Image Validation
                   |
                   v
           YOLO Detection
                   |
                   v
         AI Scene Analysis
                   |
                   v
        Rule-Based Prioritization
                   |
                   v
         Findings & Human Review
              /          \
             v            v
       Incident Map    PDF Reports
```

The backend is responsible for validating inputs, processing images, maintaining consistent analysis data, applying prioritization rules, and generating reports. The frontend displays this information and collects reviewer decisions.

---

## Intended Project Structure

The final repository is expected to follow a structure similar to this:

```text
Logic_Shift-/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── utils/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── rubric.yaml
│   │   ├── api/
│   │   ├── services/
│   │   ├── utils/
│   │   └── demo_data/
│   ├── samples/
│   ├── scripts/
│   └── tests/
│
├── .env.example
├── .gitignore
└── README.md
```

*This is the proposed structure, not a verified listing of the current repository files.*

---

## Getting Started

### Prerequisites

Install the following tools:

- [Node.js](https://nodejs.org/) — a compatible version for the frontend.
- [Python](https://www.python.org/downloads/) 3.10 or later — for the planned backend.
- [Git](https://git-scm.com/downloads).
- [Visual Studio Code](https://code.visualstudio.com/) or another code editor.

### 1. Clone the Repository

```bash
git clone https://github.com/Hack-On-Tracks/Logic_Shift-.git
cd Logic_Shift!!!-
```

### 2. Run the Frontend

Open the frontend directory containing `package.json`:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed in the terminal, commonly `http://localhost:5173`.

**Note:** These commands assume the repository contains a Vite frontend and a `frontend/` directory. If the existing `package.json` is at the repository root, run the commands from that location instead.

### 3. Backend Setup — When Implemented

From the repository root, create and activate a Python virtual environment.

**Windows PowerShell**

```powershell
cd backend
py -3.12 -m venv venv
.\venv\Scripts\Activate.ps1
```

Install the backend dependencies once `requirements.txt` is available:

```powershell
pip install -r requirements.txt
```

Start the FastAPI application using its configured entry point. For example, if the entry point is `app.main:app`:

```powershell
uvicorn app.main:app --reload
```

The planned API documentation will be available at:

`http://127.0.0.1:8000/docs`

These backend instructions become usable once the backend files and dependencies have been added.

---

## Environment Configuration

Use a `.env` file for secrets and configurable settings. Never commit actual API keys or credentials.

An example configuration for the planned backend:

```dotenv
APP_ENV=development
API_HOST=127.0.0.1
API_PORT=8000

FRONTEND_ORIGIN=http://localhost:5173

DATABASE_URL=sqlite:///./rescuevision.db

SCENE_ANALYSIS_PROVIDER=
SCENE_ANALYSIS_API_KEY=

YOLO_MODEL_PATH=
DETECTION_CONFIDENCE=0.25
DETECTION_TILING=false
```

These variables are proposed configuration names; they must match the implementation before use.

- Keep `.env` out of version control.
- Provide safe example values in `.env.example`.
- Do not expose provider API keys in frontend code.
- Ensure cached demonstration results are clearly distinguished from live AI processing.

---

## Planned API Endpoints

The backend is intended to expose the following REST API endpoints.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Check backend and component status |
| `GET` | `/api/samples` | Retrieve demonstration samples |
| `POST` | `/api/analyze` | Analyze an uploaded image or sample |
| `GET` | `/api/analyses` | List saved analyses |
| `GET` | `/api/analyses/{id}` | Retrieve an analysis |
| `GET` | `/api/analyses/{id}/image` | Retrieve the original or annotated image |
| `PATCH` | `/api/findings/{id}` | Edit finding details |
| `POST` | `/api/findings/{id}/review` | Record a review decision |
| `POST` | `/api/findings/{id}/task` | Review a suggested response task |
| `GET` | `/api/analyses/{id}/map` | Retrieve map marker data |
| `POST` | `/api/analyses/{id}/report` | Generate a PDF report |

**Implementation status:** These are planned interface contracts, not a claim that the endpoints currently exist.

---

## Demonstration Workflow

The intended demonstration for Live-Track is:

1. Open the dashboard.
2. Select a disaster imagery sample or upload an image.
3. Review object detections and annotated imagery.
4. Inspect the scene summary and ranked findings.
5. Confirm or reject findings as a human reviewer.
6. Review suggested response tasks.
7. Open the incident map when valid coordinates are available.
8. Generate and download the PDF report.
9. Inspect the report's findings, review decisions, and limitations.

Cached sample results can support a reliable demonstration when external AI services or network access are unavailable, provided they are explicitly labelled as cached.

---

## Safety, Privacy & Limitations

Live-Track is intended to assist trained human reviewers. It does not replace professional emergency-response judgment.

- Confidence scores are model-specific estimates and do not directly represent hazard severity.
- A missing GPS location must remain unknown unless supported by reliable evidence.
- A visually accessible path must not be described as definitively safe.
- AI-generated summaries may be incomplete or incorrect.
- Aerial imagery can contain small, obscured, or partially visible objects that models may miss.
- External AI providers may process uploaded images. Users must be informed when this occurs.
- Sample images must have documented sources and appropriate usage permissions.
- Uploaded imagery and associated metadata should be handled responsibly.

This project is a prototype and is not validated for autonomous dispatch or other life-critical decisions.

---

## Roadmap

The following are potential future extensions, not current features.

- Batch image processing and job queues.
- Live drone-feed integration.
- Specialized models trained for aerial disaster imagery.
- Terrain and regional damage classification.
- Resource-aware task recommendations.
- Route optimization for response teams.
- Offline map support.
- Detailed audit history and incident search.
- Authentication, roles, and task-assignment tracking.
- Emergency dispatch integrations.
- Shareable reports and before/after image comparisons.
- Multilingual reports and image-enhancement tools.

---

## Team

**Team Name:** Logic_Shift!!!

**Project:** Live-Track

**Repository:** [Hack-On-Tracks/Logic_Shift-](https://github.com/Hack-On-Tracks/Logic_Shift-)


## License

This project does not specify a confirmed repository license in this document. Add a `LICENSE` file and update this section after the team chooses an appropriate license.

If Ultralytics YOLO is used, review its applicable licensing terms before distributing the application. The licensing requirements for the model, dependencies, and application should be checked separately.

---

## Acknowledgements

We acknowledge the open-source tools and libraries that support this project, including React, Vite, Python, FastAPI, Ultralytics, Leaflet, OpenStreetMap, and ReportLab, where used in the final implementation.

---

**Live-track — Turning disaster imagery into structured, human-reviewed intelligence.**
