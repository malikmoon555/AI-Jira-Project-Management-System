'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../lib/api';
import {
  Flame,
  AlertTriangle,
  Clock,
  Ban,
  Calendar,
  CheckCircle2,
  GitCommit,
  ExternalLink,
  ShieldAlert,
  Activity as ActivityIcon,
  RefreshCw,
  User,
  ArrowRight,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

const REQUIRED_PRIORITY_KEYS = ['BSB-2771', 'BSB-2652', 'BSB-2559', 'BSB-2606', 'BSB-2690'];

export default function DashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [priorityIssues, setPriorityIssues] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [jiraStatus, setJiraStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, prioRes, actRes, statusRes] = await Promise.allSettled([
        api.get('/issues/summary'),
        api.get('/issues/priority-monitored'),
        api.get('/activity?limit=8'),
        api.get('/jira/status'),
      ]);
      if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data);
      if (prioRes.status === 'fulfilled') setPriorityIssues(prioRes.value.data || []);
      if (actRes.status === 'fulfilled') setRecentActivities(actRes.value.data || []);
      if (statusRes.status === 'fulfilled') setJiraStatus(statusRes.value.data);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const counts = summary?.counts || {
    totalActive: 0,
    todo: 0,
    development: 0,
    qa: 0,
    uat: 0,
    master: 0,
    done: 0,
    highRisk: 0,
    inactive: 0,
    blocked: 0,
    overdue: 0,
  };

  const activeSprint = summary?.activeSprint;

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 uppercase tracking-wider">
              Real-Time Tracking
            </span>
            <span className="text-xs text-slate-400">Project Key: {jiraStatus?.projectKey || 'JIRA'}</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            {jiraStatus?.projectKey || 'PROJECT'} MONITOR
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Active Jira Cloud synchronization & Git traceability engine
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            href="/settings"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
          >
            Jira Config
          </Link>
        </div>
      </div>

      {/* Integration Warning Banner if Not Configured */}
      {!jiraStatus?.configured && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-amber-300">Jira integration is not configured</h4>
            <p className="text-xs text-amber-400/90 mt-0.5">
              The application connects directly to your Jira Cloud instance to monitor real data for your active project cards. Please configure your Jira credentials to begin monitoring.
            </p>
          </div>
          <Link
            href="/settings"
            className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-semibold text-xs hover:bg-amber-400 transition shrink-0"
          >
            Configure Jira
          </Link>
        </div>
      )}

      {/* Primary KPI Status Cards */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
          <span>Workflow Canonical States</span>
          {activeSprint && (
            <span className="text-blue-400 font-medium normal-case">
              Active Sprint: <strong className="text-slate-200">{activeSprint.name}</strong>
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs font-medium text-slate-400">Total Active</div>
            <div className="text-2xl font-bold text-white mt-1">{counts.totalActive}</div>
            <div className="text-[11px] text-slate-400 mt-1">Cards in progress</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs font-medium text-slate-400">TODO</div>
            <div className="text-2xl font-bold text-slate-300 mt-1">{counts.todo}</div>
            <div className="text-[11px] text-slate-400 mt-1">Backlog / Open</div>
          </div>

          <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-900/40">
            <div className="text-xs font-medium text-blue-400">DEVELOPMENT</div>
            <div className="text-2xl font-bold text-blue-300 mt-1">{counts.development}</div>
            <div className="text-[11px] text-blue-400 mt-1">WIP / In Dev</div>
          </div>

          <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-900/40">
            <div className="text-xs font-medium text-purple-400">QA</div>
            <div className="text-2xl font-bold text-purple-300 mt-1">{counts.qa}</div>
            <div className="text-[11px] text-purple-400 mt-1">Testing & Gates</div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-900/40">
            <div className="text-xs font-medium text-indigo-400">UAT</div>
            <div className="text-2xl font-bold text-indigo-300 mt-1">{counts.uat}</div>
            <div className="text-[11px] text-indigo-400 mt-1">Acceptance</div>
          </div>

          <div className="p-4 rounded-xl bg-teal-950/20 border border-teal-900/40">
            <div className="text-xs font-medium text-teal-400">MASTER</div>
            <div className="text-2xl font-bold text-teal-300 mt-1">{counts.master}</div>
            <div className="text-[11px] text-teal-400 mt-1">Release ready</div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/40">
            <div className="text-xs font-medium text-emerald-400">DONE</div>
            <div className="text-2xl font-bold text-emerald-300 mt-1">{counts.done}</div>
            <div className="text-[11px] text-emerald-400 mt-1">Closed / Verified</div>
          </div>
        </div>
      </div>

      {/* Exception & Risk Counters */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Risk & Exception Watch
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-900/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="text-xs font-semibold text-red-400">HIGH RISK</div>
              <div className="text-xl font-bold text-white mt-0.5">{counts.highRisk}</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-900/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-xs font-semibold text-amber-400">INACTIVE</div>
              <div className="text-xl font-bold text-white mt-0.5">{counts.inactive}</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
              <Ban className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="text-xs font-semibold text-rose-400">BLOCKED</div>
              <div className="text-xl font-bold text-white mt-0.5">{counts.blocked}</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-orange-950/20 border border-orange-900/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <div className="text-xs font-semibold text-orange-400">OVERDUE</div>
              <div className="text-xl font-bold text-white mt-0.5">{counts.overdue}</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-900/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-xs font-semibold text-blue-400">QA READY</div>
              <div className="text-xl font-bold text-white mt-0.5">
                {priorityIssues.filter((i) => i.qaValidations?.[0]?.overallResult === 'PASS').length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PRIORITY MONITORED ISSUES SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Flame className="w-5 h-5 text-blue-400" />
              Priority Monitored Issues
            </h2>
            <p className="text-xs text-slate-400">
              Direct real-time Jira telemetry for the five core initial project cards
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {priorityIssues.length} Monitored Priority Cards
          </span>
        </div>

        {priorityIssues.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div className="text-base font-semibold text-slate-200">
              Initial Monitored Issues Awaiting Jira Sync
            </div>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              Your Jira project cards are ready to be fetched directly from Jira Cloud. Click below to synchronize with your Jira Cloud credentials.
            </p>
            <div className="pt-2">
              <Link
                href="/settings"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition"
              >
                Go to Settings & Trigger Sync
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {priorityIssues.map((issue) => {
              const latestCommit = issue.gitCommits?.[0];
              const risk = issue.riskScores?.[0];
              const qa = issue.qaValidations?.[0];

              const riskBadgeColor =
                risk?.level === 'CRITICAL'
                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                  : risk?.level === 'HIGH'
                  ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                  : risk?.level === 'MEDIUM'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';

              const qaBadgeColor =
                qa?.overallResult === 'PASS'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : qa?.overallResult === 'FAIL'
                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                  : 'bg-slate-700/50 text-slate-400 border-slate-700';

              return (
                <Link
                  key={issue.id}
                  href={`/issues/${issue.key}`}
                  className="p-5 rounded-2xl bg-[#0f172a]/90 hover:bg-[#131d35] border border-slate-800/80 hover:border-blue-500/40 transition-all duration-200 flex flex-col justify-between group shadow-sm hover:shadow-lg hover:shadow-blue-500/5"
                >
                  <div className="space-y-3">
                    {/* Header: Key & Canonical Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-blue-400 group-hover:text-blue-300 transition">
                          {issue.key}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                          {issue.priority}
                        </span>
                      </div>
                      <span className="text-xs px-2.5 py-0.5 rounded-md font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                        {issue.canonicalStatus}
                      </span>
                    </div>

                    {/* Summary */}
                    <h3 className="text-sm font-semibold text-slate-200 group-hover:text-white line-clamp-2">
                      {issue.summary}
                    </h3>

                    {/* Assignee & Sprint */}
                    <div className="space-y-1.5 text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          Assignee:
                        </span>
                        <span className="text-slate-200 font-medium">
                          {issue.assigneeName || 'Unassigned'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Last Activity:
                        </span>
                        <span className="text-slate-300">
                          {issue.lastMeaningfulActivityAt
                            ? new Date(issue.lastMeaningfulActivityAt).toLocaleDateString()
                            : 'No activity logged'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <GitCommit className="w-3.5 h-3.5 text-slate-400" />
                          Last Commit:
                        </span>
                        <span className="font-mono text-slate-300">
                          {latestCommit ? latestCommit.shortHash : 'None linked'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span>Time Logged:</span>
                        <span className="text-slate-200 font-medium">
                          {issue.timeSpentSec
                            ? `${(issue.timeSpentSec / 3600).toFixed(1)}h`
                            : '0h'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badges footer: Risk & QA Readiness */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${riskBadgeColor}`}
                      >
                        Risk: {risk ? `${risk.level} (${risk.score})` : 'LOW'}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${qaBadgeColor}`}
                      >
                        QA: {qa?.overallResult || 'PENDING'}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Real-time Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ActivityIcon className="w-4 h-4 text-blue-400" />
              Live Telemetry & Activity Feed
            </h3>
            <Link href="/activity" className="text-xs text-blue-400 hover:underline">
              View all activities
            </Link>
          </div>

          {recentActivities.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No recent activity recorded yet. Ingest commits or trigger Jira sync to view live telemetry.
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      <ActivityIcon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        {act.issue && (
                          <Link
                            href={`/issues/${act.issue.key}`}
                            className="font-mono text-xs font-bold text-blue-400 hover:underline"
                          >
                            {act.issue.key}
                          </Link>
                        )}
                        <span className="text-xs font-medium text-slate-200">{act.title}</span>
                      </div>
                      {act.description && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                          {act.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400 whitespace-nowrap">
                    {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Assistant PM Launcher */}
        <div className="p-6 rounded-2xl bg-gradient-to-b from-blue-950/20 to-slate-900 border border-blue-500/20 flex flex-col justify-between space-y-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
              AI PM Assistant
            </span>
            <h3 className="text-lg font-bold text-white mt-2">Instant Project Queries</h3>
            <p className="text-xs text-slate-400 mt-1">
              Ask natural language questions grounded in real Jira and Git data.
            </p>

            <div className="mt-4 space-y-2">
              <Link
                href="/ai-assistant?prompt=Show me current sprint progress"
                className="block p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-300 hover:text-white transition"
              >
                &quot;Show me current sprint progress&quot;
              </Link>
              <Link
                href="/ai-assistant?prompt=Which cards are currently at high risk?"
                className="block p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-300 hover:text-white transition"
              >
                &quot;Which cards are currently at high risk?&quot;
              </Link>
              <Link
                href="/ai-assistant?prompt=Give me today's sprint summary"
                className="block p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs text-slate-300 hover:text-white transition"
              >
                &quot;Give me today&apos;s sprint summary&quot;
              </Link>
            </div>
          </div>

          <Link
            href="/ai-assistant"
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold text-center transition shadow-md shadow-blue-500/20"
          >
            Launch Full AI Assistant
          </Link>
        </div>
      </div>
    </div>
  );
}
