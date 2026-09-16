'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../lib/api';
import {
  Search,
  Filter,
  ArrowUpDown,
  ExternalLink,
  Flame,
  User,
  Clock,
  RefreshCw,
} from 'lucide-react';

export default function AllIssuesPage() {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadIssues = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.canonicalStatus = statusFilter;
      if (search) params.search = search;
      const res = await api.get('/issues', { params });
      setIssues(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadIssues();
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">All Jira Issues</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Synchronized Jira project cards with canonical status mappings
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search key, summary..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500 w-52"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="TODO">TODO</option>
            <option value="DEVELOPMENT">DEVELOPMENT</option>
            <option value="QA">QA</option>
            <option value="UAT">UAT</option>
            <option value="MASTER">MASTER</option>
            <option value="DONE">DONE</option>
          </select>

          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
          >
            Filter
          </button>
        </form>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
          <div className="text-xs text-slate-400 mt-2">Loading issues...</div>
        </div>
      ) : issues.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
          <p className="text-sm text-slate-300">No issues found in local database.</p>
          <p className="text-xs text-slate-400">
            Make sure Jira credentials are configured in Settings and sync has run.
          </p>
          <Link
            href="/settings"
            className="inline-block mt-3 px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold"
          >
            Configure Jira
          </Link>
        </div>
      ) : (
        <div className="rounded-xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Key</th>
                  <th className="px-4 py-3">Summary</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Assignee</th>
                  <th className="px-4 py-3">Risk</th>
                  <th className="px-4 py-3">Last Activity</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {issues.map((i) => {
                  const risk = i.riskScores?.[0];
                  return (
                    <tr key={i.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 font-mono font-bold text-blue-400 whitespace-nowrap">
                        <Link href={`/issues/${i.key}`} className="hover:underline flex items-center gap-1">
                          {i.key}
                          {i.isMonitoredPriority && (
                            <Flame className="w-3.5 h-3.5 text-amber-400" />
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-200 max-w-xs truncate">
                        {i.summary}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-medium">
                          {i.canonicalStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{i.priority}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{i.assigneeName || 'Unassigned'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {risk ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              risk.level === 'CRITICAL'
                                ? 'bg-red-500/20 text-red-400'
                                : risk.level === 'HIGH'
                                ? 'bg-orange-500/20 text-orange-400'
                                : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {risk.level} ({risk.score})
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-400">
                        {i.lastMeaningfulActivityAt
                          ? new Date(i.lastMeaningfulActivityAt).toLocaleDateString()
                          : 'None'}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Link
                          href={`/issues/${i.key}`}
                          className="text-blue-400 hover:text-blue-300 font-semibold"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
