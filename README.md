# Job Hunter — AI-Powered Job Discovery & ATS CV Engine

An MVP web app that helps job seekers discover relevant jobs (geo-radius, active-only), get AI-powered match scores, and optimize their resumes for ATS systems using a Ralph-style iterative improvement loop.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| Auth | Firebase Authentication (Email/Password + Google) |
| Database | Cloud Firestore (13 collections) |
| Storage | Firebase Storage (resume uploads) |
| AI | Google Gemini (match rationale, CV generation, loop improvements) |
| Job Sources | Adzuna API, Remotive API |
| Email | SendGrid (daily digest) |
| Functions | Firebase Cloud Functions (digest scheduler) |

## Local Setup

### Prerequisites

- Node.js 20+
- npm
- A Firebase project with Auth, Firestore, and Storage enabled
- API keys for Adzuna, Gemini, and (optionally) SendGrid

### Install & Run

```bash
cd app
cp .env.example .env.local   # fill in your keys
npm install
npm run dev                   # http://localhost:3000
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Required | Source |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_*` | Yes | Firebase Console > Project Settings > Web app |
| `FIREBASE_PROJECT_ID` | Yes | Firebase Console |
| `FIREBASE_CLIENT_EMAIL` | Yes | Service account JSON |
| `FIREBASE_PRIVATE_KEY` | Yes | Service account JSON |
| `GEMINI_API_KEY` | Yes | Google AI Studio |
| `ADZUNA_APP_ID` | Yes | developer.adzuna.com |
| `ADZUNA_APP_KEY` | Yes | developer.adzuna.com |
| `REMOTIVE_API_KEY` | No | remotive.com (free, no key needed) |
| `SENDGRID_API_KEY` | No | SendGrid (digest emails skip if unconfigured) |
| `SENDGRID_FROM_EMAIL` | No | Your verified sender address |

### Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

## Architecture

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Login, Onboarding
│   ├── (dashboard)/        # Dashboard, Jobs, CV Lab, Loop, Settings
│   └── api/                # API routes (jobs, resume, ats, loop, digest)
├── lib/
│   ├── firebase/           # Client SDK, Admin SDK, Firestore helpers
│   ├── adapters/           # Job source adapters (Adzuna, Remotive)
│   ├── matching/           # Match engine (local + AI-enriched)
│   ├── ats/                # ATS simulator (heuristic-based)
│   ├── resume/             # Parser (PDF/DOCX) + Generator (Gemini)
│   ├── loop/               # Ralph-style loop controller
│   ├── digest/             # Daily digest pipeline
│   ├── ai/                 # Gemini wrapper
│   └── email/              # SendGrid interface
├── components/             # AuthProvider, ProtectedRoute, useProfile
└── types/                  # All 13 Firestore collection types
```

## Features

### Job Discovery
- Search by keywords, location, radius
- Fetches from Adzuna + Remotive in parallel
- Deduplicates by external ID, filters by freshness (default 14 days)
- Saves search configurations for reuse

### Match Scoring
- Deterministic base score (skills overlap, seniority match, location)
- Optional Gemini-enriched rationale (fit reasons, gaps)
- Recommendations: APPLY / MAYBE / SKIP
- Bulk scoring for search results, ranked by score

### CV Lab
- Upload PDF, DOCX, or TXT resumes
- Auto-parse into sections + skill extraction
- ATS simulator: scores section integrity, keyword coverage, formatting risks
- Gemini-powered job-specific CV generation (truthful, single-column, ATS-safe)

### ATS Optimization Loop
- Ralph-style iterative improvement: propose, apply, re-score, decide
- Configurable: max iterations, target score, minimum improvement threshold
- Pause / resume / terminate controls
- Full iteration history with diffs and score progress chart

### Daily Digest
- Runs all saved searches, dedupes, scores, ranks top N
- Sends styled HTML email via SendGrid
- Idempotent by user + date
- Manual trigger from Settings, or scheduled via Cloud Function

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/jobs/search` | POST | Fetch + normalize jobs from adapters |
| `/api/jobs/match` | POST | Single job match (local or AI) |
| `/api/jobs/match-bulk` | POST | Bulk local scoring |
| `/api/ats/score` | POST | ATS simulation |
| `/api/resume/upload` | POST | Parse uploaded resume |
| `/api/resume/generate` | POST | Generate job-specific CV |
| `/api/loop` | POST | Loop actions (start/iterate/pause/resume/terminate/get) |
| `/api/digest` | POST | Run digest for a user |

## Firestore Collections

users, profiles, job_searches, job_sources, job_posts, job_matches,
resumes_original, resumes_parsed, resume_versions, ats_scores,
feedback, loop_state, digest_runs

All documents include `createdAt`, `updatedAt`, `version` fields.
Owned documents include `userId` for security rules.

## MVP Assumptions

- Single job-seeker flow only (no teams/orgs)
- Adzuna and Remotive as sole job sources
- ATS simulator is heuristic + keyword-based, not a real ATS
- Digest sent once per day; no in-app real-time push for new jobs
- Loop runs via API route (synchronous per iteration), not a long-running worker;
  "resumable" means the next call reads state and continues
- Loop state is in-memory for MVP; production would use Firestore loop_state

## Acceptance Tests (Manual)

### Auth
- **Happy**: Sign up with email -> redirected to onboarding -> fill profile -> dashboard
- **Failure**: Sign in with wrong password -> error message shown
- **Edge**: Refresh on dashboard when not logged in -> redirected to login

### Job Ingestion
- **Happy**: Search "React London" -> results returned with skills tags
- **Failure**: Search with invalid location -> graceful error or empty results
- **Edge**: No Adzuna key -> Remotive results only, no crash

### Matching
- **Happy**: Search returns jobs ranked by score, APPLY/MAYBE/SKIP labels correct
- **Failure**: Profile with no skills -> all scores neutral (~40)
- **Edge**: Job with no skills listed -> partial scoring still works

### Resume Upload/Parse
- **Happy**: Upload PDF -> sections + skills extracted -> displayed in Parsed tab
- **Failure**: Upload .exe -> "Unsupported file type" error
- **Edge**: Upload empty PDF -> no sections, risk flagged

### ATS Simulation
- **Happy**: Well-formatted CV -> score 60+ with few risks
- **Failure**: CV with tables/graphics markers -> low score, risks listed
- **Edge**: Very short CV -> "under 100 words" risk

### CV Generation
- **Happy**: Fill job details + generate -> new CV text, ATS score improves
- **Failure**: No Gemini key -> error message
- **Edge**: Generate without job description -> still produces output using title/skills

### Loop Controller
- **Happy**: Start loop -> run 3 iterations -> score improves -> terminate at target
- **Failure**: Start loop with no job keywords -> runs but keyword coverage stays 100%
- **Edge**: Max iterations reached -> auto-terminates with reason

### Digest
- **Happy**: Run digest -> matches list returned
- **Failure**: No saved searches -> button disabled
- **Edge**: No SendGrid key -> digest runs, email skipped gracefully
