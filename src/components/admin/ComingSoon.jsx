import React from 'react';

export default function ComingSoon({ name }) {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="mb-2 text-2xl font-black text-[#1B4332]">{name}</div>
        <p className="text-sm text-[#6B6555]">Modul ini akan hadir di fase berikutnya.</p>
      </div>
    </div>
  );
}
