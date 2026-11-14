// Inbox page transitions are guarded while acknowledgement/config writes run.
export function canChangeAlertPage(page,total,busy,delta) {
  const next=page+delta;
  return !busy && next>=0 && next<Math.max(1,Math.ceil(total/50));
}

export function latestManualProviderRun(runs, provider) {
  return runs.filter(run=>run.manual === true && run.providers?.[provider])
    .sort((a,b)=>String(b.started_at||'').localeCompare(String(a.started_at||'')))[0] || null;
}
