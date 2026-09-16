'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../lib/api';
import { ShieldCheck, ShieldAlert, RefreshCw, Flame, ArrowRight } from 'lucide-react';

export default function UATPage() {
  const [validations, setValidations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadValidations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/uat/validations');
      setValidations(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadValidations();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">UAT Gate Dashboard</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Acceptance readiness checks verifying QA completion, evidence, resolved bugs, and attachments
          </p>
        </div>

        <button
          onClick={loadValidations}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
          <div className="text-xs text-slate-400 mt-2">Loading UAT validations...</div>
        </div>
      ) : validations.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
          No UAT validations evaluated yet. Open any card (e.g.{' '}
          <Link href="/issues/BSB-2771" className="text-blue-400 hover:underline">
            BSB-2771
          </Link>
          ) and click &quot;Run UAT Gate&quot;.
        </div>
      ) : (
        <div className="space-y-4">
          {validations.map((v) => {
            const isReady = v.overallResult === 'PASS';
            return (
              <div
                key={v.id}
                className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/70 pb-3">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/issues/${v.issue?.key}`}
                      className="font-mono text-sm font-bold text-blue-400 hover:underline flex items-center gap-1.5"
                    >
                      {v.issue?.key}
                      {v.issue?.isMonitoredPriority && (
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                      )}
                    </Link>
                    <span className="text-xs text-slate-200 font-medium">
                      {v.issue?.summary}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                        isReady
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {isReady ? 'UAT READY' : 'UAT BLOCKED'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(v.validatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Requirements check */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300">QA Completed</span>
                    <span className={v.qaCompletedResult === 'PASS' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                      {v.qaCompletedResult}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300">Test Evidence</span>
                    <span className={v.testEvidenceResult === 'PASS' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                      {v.testEvidenceResult}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300">Bugs Resolved</span>
                    <span className={v.bugsResolvedResult === 'PASS' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                      {v.bugsResolvedResult}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300">QA Comment</span>
                    <span className={v.qaCommentResult === 'PASS' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                      {v.qaCommentResult}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300">Acceptance Criteria</span>
                    <span className={v.acResult === 'PASS' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                      {v.acResult}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300">Required Attachments</span>
                    <span className={v.attachmentsResult === 'PASS' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                      {v.attachmentsResult}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-800/40 text-xs text-slate-300 flex items-center justify-between">
                  <span>{v.summary}</span>
                  <Link
                    href={`/issues/${v.issue?.key}`}
                    className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                  >
                    Inspect Card <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
