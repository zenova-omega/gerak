import React from 'react';
// AppPage shell — will replace the mobile section of App.jsx in Phase 1.6
// For now this is a placeholder showing the planned structure.
//
// The actual mobile app shell (bottom nav, screen routing, state management)
// still lives in App.jsx. This file will become the entry point when
// React Router is added.
//
// Structure:
// <AppPage>
//   <StatusBar />
//   <ScrollContainer>
//     <Outlet /> ← renders Beranda, PapanMisi, etc.
//   </ScrollContainer>
//   <BottomNav />
// </AppPage>

export default function AppPage() {
  return (
    <div>
      <p>AppPage shell — will be wired in Phase 1.6</p>
    </div>
  );
}
