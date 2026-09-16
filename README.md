# AI-Powered Jira Project Management Monitoring System

A production-ready AI-powered PM monitoring system built on top of Jira Cloud and Git (GitHub / GitLab / Bitbucket).

Jira remains the single source of truth. The application connects directly to Jira Cloud via the REST API v3 to actively monitor Project **BSB** and initial priority issues:

- **BSB-2771**
- **BSB-2652**
- **BSB-2559**
- **BSB-2606**
- **BSB-2690**

> [!IMPORTANT]
> These are real working Jira issues. No fake or mock data is fabricated. If Jira credentials are not configured or issues cannot be accessed, explicit integration status warnings are displayed.

---

## Architecture & Technology Stack

- **Backend**: NestJS, TypeScript, Prisma ORM, PostgreSQL, `@nestjs/schedule` (Cron jobs), OpenAI API, REST API & Webhooks.
- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS, Lucide Icons.
- **Database**: PostgreSQL 16.
- **Infrastructure**: Docker & Docker Compose (`docker-compose.yml`).

---

## Core Capabilities

1. **Jira Cloud Synchronization**:
   - Active telemetry for project `BSB` and target issues (`BSB-2771`, `BSB-2652`, `BSB-2559`, `BSB-2606`, `BSB-2690`).
   - Synchronizes summary, description, assignee, reporter, canonical status, priority, sprint, story points, due date, comments, attachments, worklogs, changelog, and linked issues.
2. **Canonical Workflow Mapping**:
   - Allows administrators to map actual Jira status names into canonical states: `TODO` → `DEVELOPMENT` → `QA` → `UAT` → `MASTER` → `DONE`.
3. **Unified Activity Timeline**:
   - Merges Jira comments, status changes, assignment changes, worklogs, attachments, Git commits, PRs, and reviews into a single chronological stream.
4. **Developer Monitoring & Inactivity Engine**:
   - Computes `lastMeaningfulActivityAt` from commits, comments, worklogs, and status transitions.
   - **Inactivity Rule**: Raises **HIGH severity alert** if a card in `DEVELOPMENT` has had no meaningful activity for **> 48 hours** (and **CRITICAL** if **> 72 hours**).
5. **QA & UAT Quality Gates**:
   - Evaluates 8 QA gate requirements: Git commit, Pull request, Code review, Unit tests, Test cases, Documentation, Acceptance criteria, Developer update.
   - Evaluates UAT acceptance checklist: QA signoff, test evidence, bugs resolved, QA comment, acceptance criteria, attachments.
6. **Risk Score Engine**:
   - Computes 0–100 risk score and categorizes cards as `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` with full explanations of contributing risk factors.
7. **AI PM Assistant**:
   - Uses OpenAI API with structured database retrieval to answer questions regarding cards, sprint health, developer workload, and inactive items without hallucinating.
8. **Daily AI PM Report**:
   - Automated daily briefing summarizing sprint progress, active/completed/in-dev/QA cards, top 5 project risks, and actionable PM recommendations.

---

## Quick Start Guide

### 1. Configure Environment Variables
Copy `.env.example` to `backend/.env` and update your Jira credentials:
```bash
JIRA_HOST="your-domain.atlassian.net"
JIRA_EMAIL="your-email@example.com"
JIRA_API_TOKEN="your-atlassian-api-token"
JIRA_PROJECT_KEY="BSB"
OPENAI_API_KEY="your-openai-api-key"
```

### 2. Run with Docker Compose
```bash
docker compose up -d
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:4000/api`
- Swagger Docs: `http://localhost:4000/api/docs`

### 3. Or Run Locally Without Docker
**Backend**:
```bash
cd backend
npm install
npx prisma db push
npm run seed
npm run start:dev
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

---

## Frontend Routes

- `/dashboard`: Executive PM monitoring dashboard with KPI cards and Priority Monitored Issues.
- `/issues/BSB-2771`: Detailed telemetry, QA gate, UAT gate, risk breakdown, and unified timeline.
- `/issues/BSB-2652`: Card telemetry and activity timeline.
- `/issues/BSB-2559`: Card telemetry and activity timeline.
- `/issues/BSB-2606`: Card telemetry and activity timeline.
- `/issues/BSB-2690`: Card telemetry and activity timeline.
- `/issues/[key]`: Dynamic telemetry page for any synchronized Jira issue.
- `/sprints`: Active sprint board and velocity.
- `/developers`: Developer workload and activity analysis.
- `/activity`: Real-time telemetry feed.
- `/alerts`: Automated inactivity alerts and resolution center.
- `/qa`: QA Gate dashboard.
- `/uat`: UAT Gate dashboard.
- `/reports`: AI-generated Daily Project Reports.
- `/ai-assistant`: Tool-grounded AI PM chat assistant.
- `/settings`: Jira credentials, status mapping, and Git webhook configurations.
