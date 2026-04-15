function StatCard({ label, value, helper }) {
  return (
    <div className="rounded-2xl border border-theme-border bg-theme-surface-soft p-5 shadow-panel">
      <p className="text-sm uppercase tracking-wide text-theme-subtle">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold text-theme-text">{value}</p>
      <p className="mt-2 text-sm text-theme-muted">{helper}</p>
    </div>
  );
}

export default StatCard;
