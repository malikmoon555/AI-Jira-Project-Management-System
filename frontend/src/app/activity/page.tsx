'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../lib/api';
import { Activity as ActivityIcon, Filter, RefreshCw } from 'lucide-react';

export default function ActivityPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const loadActivity = async () => {
    setLoading(true);
    try {
      const res = await api.get('/activity', {
        params: { type: typeFilter || undefined, limit: 100 },
      });
      setActivities(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivity();
  }, [typeFilter]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Real-Time Activity Feed</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Unified telemetry stream connecting Jira Cloud events, Git commits, and PR reviews
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Event Types</option>
            <option value="STATUS_CHANGE">Status Changes</option>
            <option value="COMMENT">Comments</option>
            <option value="COMMIT">Git Commits</option>
            <option value="PR">Pull Requests</option>
            <option value="REVIEW">Code Reviews</option>
            <option value="WORKLOG">Worklogs</option>
            <option value="ATTACHMENT">Attachments</option>
          </select>

          <button
            onClick={loadActivity}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
          <div className="text-xs text-slate-400 mt-2">Loading activity feed...</div>
        </div>
      ) : activities.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
          No activities recorded for this filter.
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((act) => (
            <div
              key={act.id}
              className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-start justify-between gap-4 hover:border-slate-700 transition"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <ActivityIcon className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {act.issue && (
                      <Link
                        href={`/issues/${act.issue.key}`}
                        className="font-mono text-xs font-bold text-blue-400 hover:underline"
                      >
                        {act.issue.key}
                      </Link>
                    )}
                    <span className="text-xs font-semibold text-slate-200">{act.title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                      {act.type}
                    </span>
                  </div>

                  {act.description && (
                    <p className="text-xs text-slate-300 leading-relaxed">{act.description}</p>
                  )}

                  {act.actorName && (
                    <div className="text-[11px] text-slate-400">Actor: {act.actorName}</div>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-400 whitespace-nowrap">
                {new Date(act.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
