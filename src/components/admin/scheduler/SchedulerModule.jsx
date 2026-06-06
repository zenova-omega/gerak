import React, { useState } from 'react';
import { CalendarClock, UserCircle2 } from 'lucide-react';
import PostScheduler from './PostScheduler';
import AccountManager from './AccountManager';

const TABS = [
  { key: 'jadwal', label: 'Jadwal', Icon: CalendarClock },
  { key: 'akun', label: 'Akun', Icon: UserCircle2 },
];

function TabChip({ active, onClick, Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
        active ? 'bg-[#1B4332] text-white' : 'bg-white text-[#6B6555] hover:bg-[#EDEBE3]'
      }`}
    >
      <Icon size={12} />
      {label}
    </button>
  );
}

export default function SchedulerModule() {
  const [tab, setTab] = useState('jadwal');

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-black text-[#1B4332]">Scheduler · Distribusi</h1>
        <p className="text-sm text-[#6B6555]">Jadwalkan posting ke akun resmi.</p>
      </header>

      <div className="mb-5 flex items-center gap-2">
        {TABS.map(({ key, label, Icon }) => (
          <TabChip
            key={key}
            active={tab === key}
            onClick={() => setTab(key)}
            Icon={Icon}
            label={label}
          />
        ))}
      </div>

      {tab === 'jadwal' && <PostScheduler />}
      {tab === 'akun' && <AccountManager />}
    </div>
  );
}
