'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../lib/api';
import { Users, Clock, GitCommit, ShieldAlert, CheckCircle, RefreshCw } from 'lucide-react';

export default function DevelopersPage() {
  const [developers, setDevelopers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDevelopers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/developers');
      setDevelopers(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevelopers();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
        <div className="text-xs text-slate-400 mt-2">Analyzing developer activity...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">Developer Activity & Workload</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Real-time workload metrics, meaningful activity tracking, and risk exposure
        </p>
      </div>

      {developers.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
          No assignees found yet. Please run Jira synchronization.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {developers.map((dev) => (
            <div
              key={dev.name}
              className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold text-sm">
                    {dev.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{dev.name}</h3>
                    <p className="text-[11px] text-slate-400">{dev.email || 'Jira Team Member'}</p>
                  </div>
                </div>

                {dev.highRiskCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 font-semibold flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    {dev.highRiskCount} At Risk
                  </span>
                )}
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-4 gap-2 text-center pt-2 border-t border-slate-800/80">
                <div className="p-2 rounded-lg bg-slate-800/40">
                  <div className="text-[10px] text-slate-400">Active</div>
                  <div className="text-sm font-bold text-white mt-0.5">{dev.activeIssues}</div>
                </div>
                <div className="p-2 rounded-lg bg-blue-950/20 border border-blue-900/30">
                  <div className="text-[10px] text-blue-400">In Dev</div>
                  <div className="text-sm font-bold text-blue-300 mt-0.5">{dev.inDevelopment}</div>
                </div>
                <div className="p-2 rounded-lg bg-purple-950/20 border border-purple-900/30">
                  <div className="text-[10px] text-purple-400">In QA</div>
                  <div className="text-sm font-bold text-purple-300 mt-0.5">{dev.inQA}</div>
                </div>
                <div className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-900/30">
                  <div className="text-[10px] text-emerald-400">Done</div>
                  <div className="text-sm font-bold text-emerald-300 mt-0.5">{dev.done}</div>
                </div>
              </div>

              {/* Activity Timestamps */}
              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Last Activity:
                  </span>
                  <span className="text-slate-300">
                    {dev.lastActivityAt
                      ? new Date(dev.lastActivityAt).toLocaleString()
                      : 'No activity recorded'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <GitCommit className="w-3.5 h-3.5" />
                    Last Commit:
                  </span>
                  <span className="text-slate-300">
                    {dev.lastCommitAt
                      ? new Date(dev.lastCommitAt).toLocaleDateString()
                      : 'None recorded'}
                  </span>
                </div>
              </div>

              {/* Assigned Cards */}
              <div className="pt-2 border-t border-slate-800">
                <div className="text-[11px] font-semibold text-slate-400 mb-1.5">Assigned Cards:</div>
                <div className="flex flex-wrap gap-1">
                  {dev.issues?.map((iss: any) => (
                    <Link
                      key={iss.key}
                      href={`/issues/${iss.key}`}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition"
                    >
                      {iss.key}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
