'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '../../../lib/api';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  GitCommit,
  GitPullRequest,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Paperclip,
  MessageSquare,
  ShieldCheck,
  ShieldAlert,
  Flame,
  ExternalLink,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export default function IssueDetailPage() {
  const params = useParams();
  const rawKey = params?.key as string;
  const issueKey = rawKey ? rawKey.toUpperCase() : '';

  const [issue, setIssue] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluatingQA, setEvaluatingQA] = useState(false);
  const [evaluatingUAT, setEvaluatingUAT] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIssueData = async () => {
    if (!issueKey) return;
    setLoading(true);
    setError(null);
    try {
      const [issueRes, timelineRes] = await Promise.all([
        api.get(`/issues/${issueKey}`),
        api.get(`/activity/timeline/${issueKey}`),
      ]);
      setIssue(issueRes.data);
      setTimeline(timelineRes.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          `Issue ${issueKey} was not found in the local database. Please trigger Jira synchronization or verify project access.`,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssueData();
  }, [issueKey]);

  const handleRunQAGate = async () => {
    setEvaluatingQA(true);
    try {
      await api.post(`/qa/evaluate/${issueKey}`);
      fetchIssueData();
    } catch (e) {
      console.error('QA evaluation failed', e);
    } finally {
      setEvaluatingQA(false);
    }
  };

  const handleRunUATGate = async () => {
    setEvaluatingUAT(true);
    try {
      await api.post(`/uat/evaluate/${issueKey}`);
      fetchIssueData();
    } catch (e) {
      console.error('UAT evaluation failed', e);
    } finally {
      setEvaluatingUAT(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
        <div className="text-sm text-slate-400">Fetching real Jira & Git data for {issueKey}...</div>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-4 max-w-xl mx-auto mt-10">
        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Integration Error: {issueKey}</h2>
        <p className="text-xs text-slate-400">{error}</p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition"
          >
            Return to Dashboard
          </Link>
          <Link
            href="/settings"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition"
          >
            Jira Settings & Sync
          </Link>
        </div>
      </div>
    );
  }

  const latestRisk = issue.riskScores?.[0];
  const latestQA = issue.qaValidations?.[0];
  const latestUAT = issue.uatValidations?.[0];

  return (
    <div className="space-y-6 pb-16">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-blue-400">{issue.key}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                {issue.issueType}
              </span>
              {issue.isMonitoredPriority && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-semibold uppercase tracking-wider">
                  Priority Monitored
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-white mt-1">{issue.summary}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunQAGate}
            disabled={evaluatingQA}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-medium transition"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{evaluatingQA ? 'Evaluating QA...' : 'Run QA Gate'}</span>
          </button>
          <button
            onClick={handleRunUATGate}
            disabled={evaluatingUAT}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium transition"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{evaluatingUAT ? 'Evaluating UAT...' : 'Run UAT Gate'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Details + Gates vs Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Issue Details & Gates */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata Cards Header */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[11px] text-slate-400">Canonical Status</div>
              <div className="text-sm font-bold text-blue-400 mt-1">{issue.canonicalStatus}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Jira: {issue.status?.name || 'N/A'}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[11px] text-slate-400">Priority</div>
              <div className="text-sm font-bold text-slate-200 mt-1">{issue.priority}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Story Points: {issue.storyPoints ?? 'N/A'}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[11px] text-slate-400">Assignee</div>
              <div className="text-sm font-bold text-slate-200 mt-1 truncate">
                {issue.assigneeName || 'Unassigned'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Reporter: {issue.reporterName || 'N/A'}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[11px] text-slate-400">Sprint</div>
              <div className="text-sm font-bold text-slate-200 mt-1 truncate">
                {issue.sprint?.name || 'No Sprint'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Due: {issue.dueDate ? new Date(issue.dueDate).toISOString().split('T')[0] : 'None'}
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</h3>
            <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
              {issue.description || 'No description provided in Jira.'}
            </div>
          </div>

          {/* Labels, Components & Linked Issues */}
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 mb-1.5">Labels</div>
              <div className="flex flex-wrap gap-1">
                {issue.labels?.length > 0 ? (
                  issue.labels.map((l: string) => (
                    <span key={l} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {l}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">None</span>
                )}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-slate-400 mb-1.5">Components</div>
              <div className="flex flex-wrap gap-1">
                {issue.components?.length > 0 ? (
                  issue.components.map((c: string) => (
                    <span key={c} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {c}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">None</span>
                )}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-slate-400 mb-1.5">Linked Issues</div>
              <div className="flex flex-wrap gap-1">
                {issue.linkedIssueKeys?.length > 0 ? (
                  issue.linkedIssueKeys.map((k: string) => (
                    <Link
                      key={k}
                      href={`/issues/${k}`}
                      className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 hover:underline"
                    >
                      {k}
                    </Link>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">None</span>
                )}
              </div>
            </div>
          </div>

          {/* QA Gate Result Card */}
          <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  QA Gate Readiness Verification
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automated gate triggered on move from DEVELOPMENT → QA
                </p>
              </div>

              {latestQA ? (
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                    latestQA.overallResult === 'PASS'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-red-500/20 text-red-400 border-red-500/30'
                  }`}
                >
                  {latestQA.overallResult === 'PASS' ? 'READY FOR QA' : 'NOT READY FOR QA'}
                </span>
              ) : (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-slate-800 text-slate-400">
                  NOT YET EVALUATED
                </span>
              )}
            </div>

            {latestQA && (
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                    <span className="text-slate-300">Git Commit</span>
                    <span className={latestQA.gitCommitResult === 'PASS' ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                      {latestQA.gitCommitResult}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                    <span className="text-slate-300">Pull Request</span>
                    <span className={latestQA.pullRequestResult === 'PASS' ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                      {latestQA.pullRequestResult}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                    <span className="text-slate-300">Code Review</span>
                    <span className={latestQA.codeReviewResult === 'PASS' ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                      {latestQA.codeReviewResult}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                    <span className="text-slate-300">Unit Test</span>
                    <span className={latestQA.unitTestResult === 'PASS' ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                      {latestQA.unitTestResult}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                    <span className="text-slate-300">Test Case</span>
                    <span className={latestQA.testCaseResult === 'PASS' ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                      {latestQA.testCaseResult}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                    <span className="text-slate-300">Documentation</span>
                    <span className={latestQA.documentationResult === 'PASS' ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                      {latestQA.documentationResult}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                    <span className="text-slate-300">Acceptance Criteria</span>
                    <span className={latestQA.acceptanceCriteriaResult === 'PASS' ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                      {latestQA.acceptanceCriteriaResult}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                    <span className="text-slate-300">Developer Update</span>
                    <span className={latestQA.developerUpdateResult === 'PASS' ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                      {latestQA.developerUpdateResult}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-800 text-xs text-slate-400">
                  <strong>Summary:</strong> {latestQA.summary}
                </div>
              </div>
            )}
          </div>

          {/* UAT Monitoring Result Card */}
          <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  UAT Gate Acceptance Verification
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Validates QA signoff, evidence, bug resolution & attachments
                </p>
              </div>

              {latestUAT ? (
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                    latestUAT.overallResult === 'PASS'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {latestUAT.overallResult === 'PASS' ? 'UAT READY' : 'UAT BLOCKED'}
                </span>
              ) : (
                <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-slate-800 text-slate-400">
                  NOT YET EVALUATED
                </span>
              )}
            </div>

            {latestUAT && (
              <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-800 text-xs text-slate-400">
                <strong>Status:</strong> {latestUAT.summary}
              </div>
            )}
          </div>

          {/* Git Commits & Pull Requests */}
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <GitCommit className="w-4 h-4 text-blue-400" />
              Linked Git Commits & Pull Requests
            </h3>

            <div className="space-y-2">
              {issue.gitCommits?.length === 0 && issue.pullRequests?.length === 0 ? (
                <div className="text-xs text-slate-400 py-3 text-center">
                  No Git commits or PRs matching key &quot;{issue.key}&quot; found yet.
                </div>
              ) : (
                <>
                  {issue.pullRequests?.map((pr: any) => (
                    <div
                      key={pr.id}
                      className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <GitPullRequest className="w-4 h-4 text-purple-400" />
                        <span className="font-semibold text-slate-200">
                          PR #{pr.prNumber}: {pr.title}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                          {pr.status}
                        </span>
                      </div>
                      <span className="text-slate-400">
                        {pr.sourceBranch} → {pr.targetBranch}
                      </span>
                    </div>
                  ))}

                  {issue.gitCommits?.map((c: any) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-blue-400">{c.shortHash}</span>
                        <span className="text-slate-300">{c.message}</span>
                      </div>
                      <span className="text-slate-400">{c.authorName}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Unified Activity Timeline & Risk Breakdown */}
        <div className="space-y-6">
          {/* Risk Score Card */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Risk Engine Assessment
              </h3>
              {latestRisk && (
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    latestRisk.level === 'CRITICAL'
                      ? 'bg-red-500/20 text-red-400'
                      : latestRisk.level === 'HIGH'
                      ? 'bg-orange-500/20 text-orange-400'
                      : latestRisk.level === 'MEDIUM'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {latestRisk.level}
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{latestRisk?.score ?? 0}</span>
              <span className="text-xs text-slate-400">/ 100</span>
            </div>

            {latestRisk?.factors && Array.isArray(latestRisk.factors) && latestRisk.factors.length > 0 ? (
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <div className="text-[11px] font-semibold text-slate-400">Contributing Risk Factors:</div>
                {latestRisk.factors.map((f: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-slate-800/40 text-[11px] text-slate-300 flex items-center justify-between"
                  >
                    <span>{f.description}</span>
                    <span className="text-red-400 font-bold ml-2">+{f.points}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 pt-2 border-t border-slate-800">
                No elevated risk factors detected for this card.
              </div>
            )}
          </div>

          {/* Unified Activity Timeline */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Unified Chronological Timeline
              </h3>
              <span className="text-[11px] text-slate-400">{timeline.length} events</span>
            </div>

            {timeline.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No events recorded for this issue.
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {timeline.map((event) => (
                  <div key={event.id} className="relative text-xs space-y-1">
                    <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-[#090d16]" />
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{event.title}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(event.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        {event.description}
                      </p>
                    )}
                    {event.actorName && (
                      <div className="text-[10px] text-slate-400">By: {event.actorName}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
