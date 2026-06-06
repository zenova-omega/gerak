import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import PulseDashboard from '../../components/admin/pulse/PulseDashboard';
import SurveyModule from '../../components/admin/survey/SurveyModule';
import StudioModule from '../../components/admin/studio/StudioModule';
import ComingSoon from '../../components/admin/ComingSoon';
import SchedulerModule from '../../components/admin/scheduler/SchedulerModule';
import RallyModule from '../../components/admin/rally/RallyModule';
import { OPERASI_ITEMS, COMMAND_CENTER_ITEMS, adminTabHref } from '../../lib/adminNav';

export default function CommandCenter() {
  return (
    <div className="flex min-h-screen bg-[#F5F3EE] text-[#2B2B2B]">
      <aside className="flex w-60 shrink-0 flex-col bg-[#1B4332] p-4 text-white">
        <div className="mb-6">
          <div className="text-base font-black tracking-[0.2em] text-white">SINAR</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#D4A843]">Command Center</div>
        </div>

        {/* Operasi — links back into the legacy SINAR admin shell */}
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
              to={m.id}
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

      <main className="flex-1 overflow-auto p-6">
        <Routes>
          <Route index element={<Navigate to="pulse" replace />} />
          <Route path="pulse" element={<PulseDashboard />} />
          <Route path="survey" element={<SurveyModule />} />
          <Route path="studio" element={<StudioModule />} />
          <Route path="scheduler" element={<SchedulerModule />} />
          <Route path="rally" element={<RallyModule />} />
          <Route path="campaigns" element={<ComingSoon name="Campaigns" />} />
        </Routes>
      </main>
    </div>
  );
}
