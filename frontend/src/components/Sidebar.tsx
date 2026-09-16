'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import api from '../lib/api';
import {
  LayoutDashboard,
  Timer,
  ListTodo,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  FileText,
  Bot,
  Settings,
  Flame,
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Active Sprint', href: '/sprints', icon: Timer },
  { name: 'All Issues', href: '/issues', icon: ListTodo },
  { name: 'Developers', href: '/developers', icon: Users },
  { name: 'Activity', href: '/activity', icon: Activity },
  { name: 'Alerts', href: '/alerts', icon: AlertTriangle },
  { name: 'QA Gate', href: '/qa', icon: CheckCircle2 },
  { name: 'UAT Gate', href: '/uat', icon: ShieldCheck },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'AI Assistant', href: '/ai-assistant', icon: Bot },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [projectKey, setProjectKey] = useState('JIRA');
  const [monitoredKeys, setMonitoredKeys] = useState<string[]>([]);

  useEffect(() => {
    api.get('/jira/status').then((res) => {
      if (res.data?.projectKey) {
        setProjectKey(res.data.projectKey);
      }
    }).catch(() => {});

    api.get('/issues').then((res) => {
      if (Array.isArray(res.data) && res.data.length > 0) {
        setMonitoredKeys(res.data.map((i: any) => i.key).slice(0, 5));
      }
    }).catch(() => {});
  }, []);

  return (
    <aside className="w-64 bg-[#0d1322] border-r border-slate-800/80 flex flex-col fixed inset-y-0 left-0 z-30 select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800/80">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Flame className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-bold text-slate-100 tracking-tight text-sm">Jira AI Monitor</div>
          <div className="text-[11px] text-blue-400 font-medium">Project: {projectKey}</div>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Project Monitoring
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Target Monitored Badges */}
      <div className="p-3.5 mx-3 mb-4 rounded-xl bg-slate-900/90 border border-slate-800">
        <div className="text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
          <span>Priority Issues</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
            {monitoredKeys.length > 0 ? `${monitoredKeys.length} Monitored` : 'Monitored'}
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {monitoredKeys.length > 0 ? (
            monitoredKeys.map((key) => (
              <Link
                key={key}
                href={`/issues/${key}`}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-blue-600 hover:text-white transition"
              >
                {key}
              </Link>
            ))
          ) : (
            <span className="text-[10px] text-slate-400">No issues synced yet</span>
          )}
        </div>
      </div>
    </aside>
  );
}
