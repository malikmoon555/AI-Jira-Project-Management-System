'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../lib/api';
import {
  FileText,
  Sparkles,
  ShieldAlert,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Download,
} from 'lucide-react';

export default function ReportsPage() {
  const [report, setReport] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadLatestReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/latest');
      setReport(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLatestReport();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/reports/generate');
      setReport(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
        <div className="text-xs text-slate-400 mt-2">Loading Daily PM Report...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 uppercase">
              AI Intelligence
            </span>
            <span className="text-xs text-slate-400 font-medium">Daily Project Synthesis</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{report?.title || 'Daily PM Report'}</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF Report</span>
          </button>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            <span>{generating ? 'Generating Report...' : 'Generate New Report'}</span>
          </button>
        </div>
      </div>

      {report && (
        <div className="space-y-6">
          {/* Executive AI Summary Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/30 to-indigo-950/20 border border-blue-500/30 space-y-3">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              Executive AI Project Briefing
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">{report.aiSummary}</p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[11px] text-slate-400">Active Cards</div>
              <div className="text-xl font-bold text-white mt-1">{report.activeCardsCount}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="text-[11px] text-slate-400">Completed</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">{report.completedCardsCount}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-900/30">
              <div className="text-[11px] text-blue-400">Development</div>
              <div className="text-xl font-bold text-blue-300 mt-1">{report.devCardsCount}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-900/30">
              <div className="text-[11px] text-purple-400">QA</div>
              <div className="text-xl font-bold text-purple-300 mt-1">{report.qaCardsCount}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-900/30">
              <div className="text-[11px] text-amber-400">Inactive (&gt;48h)</div>
              <div className="text-xl font-bold text-amber-300 mt-1">{report.inactiveCardsCount}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-900/30">
              <div className="text-[11px] text-red-400">High Risk</div>
              <div className="text-xl font-bold text-red-300 mt-1">{report.highRiskCardsCount}</div>
            </div>
          </div>

          {/* Top 5 Risks & Recommended PM Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 5 Risks */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                Top Project Risks Requiring Attention
              </h3>

              <div className="space-y-3">
                {report.topRisks && Array.isArray(report.topRisks) && report.topRisks.length > 0 ? (
                  report.topRisks.map((risk: any) => (
                    <div
                      key={risk.key}
                      className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/issues/${risk.key}`}
                          className="font-mono text-xs font-bold text-blue-400 hover:underline"
                        >
                          {risk.key}
                        </Link>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                          Score: {risk.score}/100
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 font-medium">{risk.summary}</p>
                      <div className="text-[11px] text-slate-400">Assignee: {risk.assignee}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 py-4 text-center">
                    No critical risk issues detected in the project.
                  </div>
                )}
              </div>
            </div>

            {/* Recommended Actions */}
            <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                Recommended PM Actions
              </h3>

              <div className="space-y-3">
                {report.recommendedActions && Array.isArray(report.recommendedActions) ? (
                  report.recommendedActions.map((rec: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            rec.priority === 'CRITICAL'
                              ? 'bg-red-500/20 text-red-400'
                              : rec.priority === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}
                        >
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed pt-1">{rec.action}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 py-4 text-center">
                    No specific actions pending.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
