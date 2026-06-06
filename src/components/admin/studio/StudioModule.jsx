import React, { useState } from 'react';
import { Sparkles, Type } from 'lucide-react';
import CaptionStudio from './CaptionStudio';
import MemeStudio from './MemeStudio';

const TABS = [
  { key: 'caption', label: 'Caption', Icon: Type },
  { key: 'meme', label: 'Meme', Icon: Sparkles },
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

export default function StudioModule() {
  const [tab, setTab] = useState('caption');

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-black text-[#1B4332]">Studio · Konten AI</h1>
        <p className="text-sm text-[#6B6555]">Buat caption &amp; meme dengan AI.</p>
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

      {tab === 'caption' && <CaptionStudio />}
      {tab === 'meme' && <MemeStudio />}
    </div>
  );
}
