'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../lib/api';
import { CheckCircle2, XCircle, RefreshCw, Flame, ArrowRight } from 'lucide-react';

export default function QAPage() {
  const [validations, setValidations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadValidations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/qa/validations');
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
          <h1 className="text-2xl font-bold text-white tracking-tight">QA Gate Dashboard</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated quality checks evaluated when Jira cards transition from DEVELOPMENT to QA
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
          <div className="text-xs text-slate-400 mt-2">Loading QA validations...</div>
        </div>
      ) : validations.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
          No QA validations run yet. Open any card (e.g.{' '}
          <Link href="/issues/BSB-2771" className="text-blue-400 hover:underline">
            BSB-2771
          </Link>
          ) and click &quot;Run QA Gate&quot;.
        </div>
      ) : (
        <div className="space-y-4">
          {validations.map((v) => {
            const isPass = v.overallResult === 'PASS';
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
                        isPass
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }`}
                    >
                      {isPass ? 'READY FOR QA' : 'NOT READY FOR QA'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(v.validatedAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 8 Requirements grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300">Git Commit</span>
                    <span className={v.gitCommitResult === 'PASS' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                      {v.gitCommitResult}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300">Pull Request</span>
                    <span className={v.pullRequestResult === 'PASS' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                      {v.pullRequestResult}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300">Code Review</span>
                    <span className={v.codeReviewResult === 'PASS' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                      {v.codeReviewResult}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300">Unit Test</span>
                    <span className={v.unitTestResult === 'PASS' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                      {v.unitTestResult}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300">Test Case</span>
                    <span className={v.testCaseResult === 'PASS' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                      {v.testCaseResult}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300">Documentation</span>
                    <span className={v.documentationResult === 'PASS' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                      {v.documentationResult}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300">Acceptance Criteria</span>
                    <span className={v.acceptanceCriteriaResult === 'PASS' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                      {v.acceptanceCriteriaResult}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-300">Dev Update</span>
                    <span className={v.developerUpdateResult === 'PASS' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                      {v.developerUpdateResult}
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
