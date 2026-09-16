'use client';

import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import {
  Settings,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Flame,
  Shield,
} from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState('');

  // Form states
  const [jiraDomain, setJiraDomain] = useState('');
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraToken, setJiraToken] = useState('');
  const [jiraProjectKey, setJiraProjectKey] = useState('SPM');

  const [savingJira, setSavingJira] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [syncing, setSyncing] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settRes, statusRes] = await Promise.all([
        api.get('/settings'),
        api.get('/project/statuses'),
      ]);
      setSettings(settRes.data);
      setStatuses(statusRes.data);

      if (settRes.data.jira) {
        setJiraDomain(settRes.data.jira.domain || '');
        setJiraEmail(settRes.data.jira.email || '');
        setJiraProjectKey(settRes.data.jira.projectKey || 'SPM');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveJira = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingJira(true);
    setSaveMessage(null);
    try {
      const res = await api.post('/jira/connect', {
        domain: jiraDomain,
        email: jiraEmail,
        apiToken: jiraToken,
        projectKey: jiraProjectKey,
      });
      if (res.data.testResult?.success) {
        setSaveMessage({
          type: 'success',
          text: `Authenticated successfully with Jira Cloud! Connected to project ${jiraProjectKey}.`,
        });
      } else {
        setSaveMessage({
          type: 'error',
          text: res.data.testResult?.error || 'Authentication failed. Check credentials.',
        });
      }
      loadData();
    } catch (err: any) {
      setSaveMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to save Jira configuration.',
      });
    } finally {
      setSavingJira(false);
    }
  };

  const handleTriggerSync = async () => {
    setSyncing(true);
    setSyncStatusText(null);
    try {
      const res = await api.post('/jira/sync');
      if (res.data.success) {
        setSyncStatusText('Jira synchronization complete! Target issues and active sprint updated.');
      } else {
        setSyncStatusText(`Sync warning: ${res.data.error || 'Check Jira logs'}`);
      }
      loadData();
    } catch (err: any) {
      setSyncStatusText(`Sync failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdateStatusMapping = async (statusId: string, canonicalStatus: string) => {
    try {
      await api.patch(`/project/statuses/${statusId}/mapping`, { canonicalStatus });
      setStatuses((prev) =>
        prev.map((s) => (s.id === statusId ? { ...s, canonicalStatus } : s)),
      );
    } catch (e) {
      console.error('Failed to update status mapping', e);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(id);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  return (
    <div className="space-y-8 max-w-5xl pb-16">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">System Settings & Integrations</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure Jira Cloud credentials, canonical workflow mapping, and Git webhooks
        </p>
      </div>

      {/* JIRA CONFIGURATION SECTION */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-blue-400" />
              Jira Cloud Connection (Project: {jiraProjectKey || 'Configured Project'})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Connect to your Jira Cloud workspace to monitor active issues and sprint progress.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {settings?.jira?.configured ? (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Configured ({settings.jira.status})
              </span>
            ) : (
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Not Configured
              </span>
            )}
          </div>
        </div>

        {saveMessage && (
          <div
            className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
              saveMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            {saveMessage.text}
          </div>
        )}

        <form onSubmit={handleSaveJira} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Jira Cloud Domain
              </label>
              <input
                type="text"
                placeholder="company.atlassian.net"
                value={jiraDomain}
                onChange={(e) => {
                  const raw = e.target.value;
                  const cleaned = raw.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
                  setJiraDomain(cleaned);
                }}
                required
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Do not include https://, e.g. company.atlassian.net
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Jira User Email
              </label>
              <input
                type="email"
                placeholder="pm@company.com"
                value={jiraEmail}
                onChange={(e) => setJiraEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Email address associated with your Jira Cloud account
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Jira API Token
              </label>
              <input
                type="password"
                placeholder="Atlassian API Token"
                value={jiraToken}
                onChange={(e) => setJiraToken(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Generate at id.atlassian.com/manage-profile/security/api-tokens
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Project Key
              </label>
              <input
                type="text"
                placeholder="e.g. SPM, BSB, PROJ"
                value={jiraProjectKey}
                onChange={(e) => setJiraProjectKey(e.target.value.toUpperCase())}
                required
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-blue-500 uppercase font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Target Project Key in your Jira Cloud instance (e.g. SPM, BSB)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={savingJira}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition disabled:opacity-50"
            >
              {savingJira ? 'Validating Connection...' : 'Save & Test Jira Connection'}
            </button>

            <button
              type="button"
              onClick={handleTriggerSync}
              disabled={syncing || !settings?.jira?.configured}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? `Synchronizing ${jiraProjectKey}...` : 'Synchronize Jira Data Now'}</span>
            </button>
          </div>

          {syncStatusText && (
            <div className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg">
              {syncStatusText}
            </div>
          )}
        </form>
      </div>

      {/* WORKFLOW STATUS MAPPING */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div>
          <h2 className="text-base font-bold text-white">Workflow Canonical Status Mapping</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Map actual Jira statuses discovered from Project {jiraProjectKey || 'JIRA'} to canonical lifecycle states (TODO → DEVELOPMENT → QA → UAT → MASTER → DONE)
          </p>
        </div>

        {statuses.length === 0 ? (
          <div className="text-xs text-slate-400 py-4 text-center">
            No Jira statuses discovered yet. Run Jira Sync above to pull actual statuses from Jira Project {jiraProjectKey || 'JIRA'}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Actual Jira Status</th>
                  <th className="py-2.5 px-3">Canonical State Mapping</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {statuses.map((st) => (
                  <tr key={st.id}>
                    <td className="py-2.5 px-3 font-medium text-white">{st.name}</td>
                    <td className="py-2.5 px-3">
                      <select
                        value={st.canonicalStatus}
                        onChange={(e) => handleUpdateStatusMapping(st.id, e.target.value)}
                        className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-blue-400 font-semibold focus:outline-none focus:border-blue-500"
                      >
                        <option value="TODO">TODO</option>
                        <option value="DEVELOPMENT">DEVELOPMENT</option>
                        <option value="QA">QA</option>
                        <option value="UAT">UAT</option>
                        <option value="MASTER">MASTER</option>
                        <option value="DONE">DONE</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* GIT & WEBHOOK INTEGRATION INFO */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div>
          <h2 className="text-base font-bold text-white">Git & Webhooks Integration</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure webhooks in Jira Cloud and GitHub/GitLab to receive instantaneous push and issue events
          </p>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-200">Jira Cloud Webhook URL:</div>
              <div className="font-mono text-slate-400 text-[11px]" suppressHydrationWarning>
                {origin ? `${origin}/api/webhooks/jira` : '/api/webhooks/jira'}
              </div>
            </div>
            <button
              onClick={() =>
                copyToClipboard(
                  `${origin || (typeof window !== 'undefined' ? window.location.origin : '')}/api/webhooks/jira`,
                  'jira',
                )
              }
              className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200"
            >
              {copiedUrl === 'jira' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-200">GitHub Webhook URL:</div>
              <div className="font-mono text-slate-400 text-[11px]" suppressHydrationWarning>
                {origin ? `${origin}/api/webhooks/git/github` : '/api/webhooks/git/github'}
              </div>
            </div>
            <button
              onClick={() =>
                copyToClipboard(
                  `${origin || (typeof window !== 'undefined' ? window.location.origin : '')}/api/webhooks/git/github`,
                  'github',
                )
              }
              className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200"
            >
              {copiedUrl === 'github' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
