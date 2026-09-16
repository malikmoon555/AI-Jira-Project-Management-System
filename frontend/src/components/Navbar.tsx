'use client';

import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { RefreshCw, CheckCircle, AlertCircle, Sparkles, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function Navbar() {
  const [jiraStatus, setJiraStatus] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/jira/status');
      setJiraStatus(res.data);
    } catch (e) {
      setJiraStatus({ configured: false, message: 'Backend unreachable' });
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await api.post('/jira/sync');
      if (res.data.success) {
        setSyncMessage('Sync complete! Real Jira data updated.');
      } else {
        setSyncMessage(res.data.error || 'Sync warning');
      }
      fetchStatus();
    } catch (err: any) {
      setSyncMessage(err.response?.data?.message || 'Sync failed');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 5000);
    }
  };

  return (
    <header className="h-16 bg-[#090d16]/80 backdrop-blur-md border-b border-slate-800/80 fixed top-0 right-0 left-64 z-20 flex items-center justify-between px-8">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Jira Status:</span>
          {jiraStatus?.configured ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle className="w-3.5 h-3.5" />
              {jiraStatus.domain} ({jiraStatus.projectKey || 'JIRA'})
            </span>
          ) : (
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Jira integration not configured (Click to setup)
            </Link>
          )}
        </div>

        {syncMessage && (
          <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-md animate-pulse">
            {syncMessage}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/ai-assistant"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/30 text-blue-300 hover:text-white text-xs font-medium transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>Ask AI PM</span>
        </Link>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition shadow-sm shadow-blue-500/20 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Syncing Jira...' : 'Sync Jira'}</span>
        </button>

        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
          PM
        </div>
      </div>
    </header>
  );
}
