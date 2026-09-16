'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../lib/api';
import {
  AlertTriangle,
  ShieldAlert,
  Clock,
  Ban,
  CheckCircle,
  RefreshCw,
  Play,
} from 'lucide-react';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('');

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/alerts', {
        params: {
          severity: filterSeverity || undefined,
          isResolved: false,
        },
      });
      setAlerts(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [filterSeverity]);

  const handleRunInactivityCheck = async () => {
    setChecking(true);
    try {
      await api.post('/alerts/check-inactivity');
      loadAlerts();
    } catch (e) {
      console.error(e);
    } finally {
      setChecking(false);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await api.post(`/alerts/${id}/resolve`);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Active Alerts & Inactivity Engine</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated alerts for cards with &gt;48h/72h inactivity in DEVELOPMENT, blockers, and overdue cards
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <button
            onClick={handleRunInactivityCheck}
            disabled={checking}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Evaluating...' : 'Run Inactivity Check'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
          <div className="text-xs text-slate-400 mt-2">Loading alerts...</div>
        </div>
      ) : alerts.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-200">No Active Alerts</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            All cards in DEVELOPMENT have recent developer activity (&lt;48h) and no open blockers are detected.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => {
            const isCritical = a.severity === 'CRITICAL';
            const isHigh = a.severity === 'HIGH';

            return (
              <div
                key={a.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                  isCritical
                    ? 'bg-red-950/20 border-red-900/50'
                    : isHigh
                    ? 'bg-amber-950/20 border-amber-900/50'
                    : 'bg-slate-900/70 border-slate-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isCritical
                        ? 'bg-red-500/20 text-red-400'
                        : isHigh
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {isCritical || isHigh ? (
                      <ShieldAlert className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          isCritical
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : isHigh
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {a.severity}
                      </span>
                      {a.issue && (
                        <Link
                          href={`/issues/${a.issue.key}`}
                          className="font-mono text-xs font-bold text-blue-400 hover:underline"
                        >
                          {a.issue.key}
                        </Link>
                      )}
                      <h4 className="text-xs font-bold text-white">{a.title}</h4>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">{a.message}</p>
                    <div className="text-[11px] text-slate-400">
                      Source: {a.source} &bull; Created:{' '}
                      {new Date(a.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {a.issue && (
                    <Link
                      href={`/issues/${a.issue.key}`}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
                    >
                      View Card
                    </Link>
                  )}
                  <button
                    onClick={() => handleResolve(a.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition"
                  >
                    Mark Resolved
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
