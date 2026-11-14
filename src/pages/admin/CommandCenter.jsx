import React, { useState } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import PulseDashboard from '../../components/admin/pulse/PulseDashboard';
import SurveyModule from '../../components/admin/survey/SurveyModule';
import StudioModule from '../../components/admin/studio/StudioModule';
import ComingSoon from '../../components/admin/ComingSoon';
import SchedulerModule from '../../components/admin/scheduler/SchedulerModule';
import RallyModule from '../../components/admin/rally/RallyModule';
import CampaignsModule from '../../components/admin/campaigns/CampaignsModule';
import { OPERASI_ITEMS, COMMAND_CENTER_ITEMS, adminTabHref } from '../../lib/adminNav';

export default function CommandCenter() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="flex min-h-screen flex-col bg-[#F5F3EE] text-[#2B2B2B] md:flex-row">
      <div className="flex items-center justify-between bg-[#1B4332] px-4 py-3 text-white md:hidden">
        <span className="text-sm font-bold">SCOUT · Command Center</span>
        <button onClick={() => setMenuOpen(open => !open)} aria-expanded={menuOpen} aria-controls="command-navigation" className="rounded-lg border border-white/40 px-3 py-2 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">{menuOpen ? 'Tutup menu' : 'Menu'}</button>
      </div>
      <aside id="command-navigation" className={`${menuOpen ? 'flex' : 'hidden'} w-full shrink-0 flex-col bg-[#1B4332] p-4 text-white md:flex md:w-60`}>
        <div className="mb-6">
          <div className="text-base font-black tracking-[0.2em] text-white">SCOUT</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#D4A843]">Command Center</div>
        </div>

        {/* Operasi — links back into the legacy SCOUT admin shell */}
        <p className="mb-2 px-2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">Operasi</p>
        <nav className="space-y-1">
          {OPERASI_ITEMS.map((o) => (
            <a
              key={o.id}
              href={adminTabHref(o.id)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-white/60 transition hover:bg-[#234F3B] hover:text-white"
            >
              {o.label}
            </a>
          ))}
        </nav>

        {/* Command Center — modules in this shell */}
        <p className="mb-2 mt-5 px-2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">Command Center</p>
        <nav className="space-y-1">
          {COMMAND_CENTER_ITEMS.map((m) => (
            <NavLink
              key={m.id}
              to={`/command-center/${m.id}`}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 transition ${isActive ? 'bg-[#2D6A4F]' : 'hover:bg-[#234F3B]'} ${m.enabled ? '' : 'pointer-events-none opacity-40'}`
              }
            >
              <div className="text-sm font-semibold">{m.label}</div>
              <div className="text-[11px] text-white/60">{m.sub}{!m.enabled && ' · segera'}</div>
            </NavLink>
          ))}
        </nav>

        {/* Back to member app */}
        <a
          href="/"
          className="mt-auto flex items-center justify-center gap-2 rounded-lg border border-white/10 py-2 text-[11px] font-semibold text-white/45 transition hover:bg-white/5"
        >
          ← Member View
        </a>
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-6">
        <Routes>
          <Route index element={<Navigate to="pulse" replace />} />
          <Route path="pulse" element={<PulseDashboard />} />
          <Route path="survey" element={<SurveyModule />} />
          <Route path="studio" element={<StudioModule />} />
          <Route path="scheduler" element={<SchedulerModule />} />
          <Route path="rally" element={<RallyModule />} />
          <Route path="campaigns" element={<CampaignsModule />} />
          {/* Any unmatched / accumulated path falls back to Pulse instead of a blank screen */}
          <Route path="*" element={<Navigate to="/command-center/pulse" replace />} />
        </Routes>
      </main>
    </div>
  );
}
