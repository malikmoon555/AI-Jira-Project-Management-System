'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../lib/api';
import { Timer, CheckCircle, Clock, Flame, ArrowRight, RefreshCw } from 'lucide-react';

export default function SprintsPage() {
  const [sprintData, setSprintData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadSprint = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sprints/active');
      setSprintData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSprint();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
        <div className="text-xs text-slate-400 mt-2">Loading active sprint...</div>
      </div>
    );
  }

  if (!sprintData) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
        <Timer className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">No Active Sprint Detected</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Ensure Jira credentials are saved and Jira has an active sprint on the project board.
        </p>
      </div>
    );
  }

  const issues = sprintData.issues || [];
  const metrics = sprintData.metrics || {
    totalCards: issues.length,
    completedCards: 0,
    progressPercent: 0,
  };

  const columns = ['TODO', 'DEVELOPMENT', 'QA', 'UAT', 'MASTER', 'DONE'];

  return (
    <div className="space-y-6 pb-12">
      {/* Sprint Header */}
      <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 uppercase">
                Active Sprint
              </span>
              <span className="text-xs text-slate-400 font-medium">State: {sprintData.state}</span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-1">{sprintData.name}</h1>
            {sprintData.goal && (
              <p className="text-xs text-slate-400 mt-0.5">Goal: {sprintData.goal}</p>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <div>
              <span className="block text-slate-400">Start Date</span>
              <span className="font-semibold text-slate-200">
                {sprintData.startDate ? new Date(sprintData.startDate).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div>
              <span className="block text-slate-400">End Date</span>
              <span className="font-semibold text-slate-200">
                {sprintData.endDate ? new Date(sprintData.endDate).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5 pt-3 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Sprint Completion</span>
            <span className="text-blue-400 font-bold">{metrics.progressPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${metrics.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {columns.map((col) => {
          const colIssues = issues.filter((i: any) => i.canonicalStatus === col);
          return (
            <div key={col} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-300">{col}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  {colIssues.length}
                </span>
              </div>

              <div className="space-y-2">
                {colIssues.map((issue: any) => (
                  <Link
                    key={issue.id}
                    href={`/issues/${issue.key}`}
                    className="block p-3 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/70 space-y-1.5 transition group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-blue-400 group-hover:text-blue-300">
                        {issue.key}
                      </span>
                      {issue.isMonitoredPriority && (
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                      )}
                    </div>
                    <p className="text-xs text-slate-200 line-clamp-2">{issue.summary}</p>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-700/50">
                      <span>{issue.assigneeName || 'Unassigned'}</span>
                      <span>{issue.priority}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
