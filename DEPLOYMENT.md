# Deployment Guide: Vercel & Netlify

This guide explains how to deploy the **AI Jira Project Management Monitoring System** to **Vercel** and **Netlify**.

---

## 1. Deploying to Vercel (Recommended)

### Quick One-Click / Git Deployment:
1. Push your repository to GitHub / GitLab / Bitbucket.
2. Log into your [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New" -> "Project"**.
3. Import your repository.
4. Set the **Root Directory** to `./` (or leave default).
5. In **Environment Variables**, configure the following keys:
   - `NEXT_PUBLIC_API_URL`: URL of your deployed NestJS API (or `/api` if using Vercel Serverless Function).
   - `DATABASE_URL`: PostgreSQL connection string (e.g. Supabase, Neon, Railway Postgres).
   - `JIRA_HOST`: `your-company.atlassian.net`
   - `JIRA_EMAIL`: `your-email@example.com`
   - `JIRA_API_TOKEN`: `your-atlassian-api-token`
   - `JIRA_PROJECT_KEY`: `BSB`
   - `OPENAI_API_KEY`: `sk-proj-...` (Optional for GPT-4o AI Assistant)
   - `JWT_SECRET`: `super-secret-token-key-2025`
6. Click **Deploy**. Vercel will build Next.js and provision serverless functions automatically using `vercel.json`.

---

## 2. Deploying to Netlify

### Git Deployment:
1. Log into your [Netlify Dashboard](https://app.netlify.com/) and click **"Add new site" -> "Import an existing project"**.
2. Select your repository.
3. Netlify automatically detects `netlify.toml`:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/.next`
4. In **Site Configuration -> Environment Variables**, add:
   - `NEXT_PUBLIC_API_URL`: Your deployed NestJS API URL (e.g., `https://your-backend.onrender.com/api`).
   - `JIRA_HOST`: `your-company.atlassian.net`
   - `JIRA_EMAIL`: `your-email@example.com`
   - `JIRA_API_TOKEN`: `your-atlassian-api-token`
   - `JIRA_PROJECT_KEY`: `BSB`
5. Click **Deploy Site**.

---

## 3. Backend Deployment (Render / Railway / Fly.io / Heroku)

If running NestJS as a separate service with PostgreSQL:

1. **Build command**: `npm run build`
2. **Start command**: `npm run start:prod`
3. **Database Migration**: `npm run prisma:push` (or `npx prisma db push`)
4. **Seed Database**: `npm run seed`

---

## Summary of Health Checks

| Check | Status | Note |
|---|---|---|
| Frontend Build | ✅ PASS | Next.js 14 static & dynamic pages generated |
| Backend Build | ✅ PASS | NestJS bundle compiled with Prisma v5 |
| Type Safety | ✅ PASS | 0 TypeScript errors across codebase |
| Database Fallback | ✅ PASS | Safe fallback when DB is unreachable |
