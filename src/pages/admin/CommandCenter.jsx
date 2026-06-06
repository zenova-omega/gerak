import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import PulseDashboard from '../../components/admin/pulse/PulseDashboard';
import ComingSoon from '../../components/admin/ComingSoon';

const MODULES = [
  { key: 'pulse', label: 'Pulse', sub: 'Social Listening', path: 'pulse', enabled: true },
  { key: 'studio', label: 'Studio', sub: 'AI Content', path: 'studio', enabled: false },
  { key: 'scheduler', label: 'Scheduler', sub: 'Distribusi', path: 'scheduler', enabled: false },
  { key: 'rally', label: 'Rally', sub: 'Engagement', path: 'rally', enabled: false },
  { key: 'campaigns', label: 'Campaigns', sub: 'Orkestrasi', path: 'campaigns', enabled: false },
];

export default function CommandCenter() {
  return (
    <div className="flex min-h-screen bg-[#F5F3EE] text-[#2B2B2B]">
      <aside className="w-60 shrink-0 bg-[#1B4332] p-4 text-white">
        <div className="mb-6 text-lg font-black text-[#D4A843]">SINAR Command</div>
        <nav className="space-y-1">
          {MODULES.map((m) => (
            <NavLink
              key={m.key}
              to={m.path}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 transition ${isActive ? 'bg-[#2D6A4F]' : 'hover:bg-[#234F3B]'} ${m.enabled ? '' : 'pointer-events-none opacity-40'}`
              }
            >
              <div className="text-sm font-semibold">{m.label}</div>
              <div className="text-[11px] text-white/60">{m.sub}{!m.enabled && ' · segera'}</div>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Routes>
          <Route index element={<Navigate to="pulse" replace />} />
          <Route path="pulse" element={<PulseDashboard />} />
          <Route path="studio" element={<ComingSoon name="Studio" />} />
          <Route path="scheduler" element={<ComingSoon name="Scheduler" />} />
          <Route path="rally" element={<ComingSoon name="Rally" />} />
          <Route path="campaigns" element={<ComingSoon name="Campaigns" />} />
        </Routes>
      </main>
    </div>
  );
}
