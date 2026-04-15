import { Clock3, History, RefreshCw } from "lucide-react";
import { useMemo } from "react";
import {
  buildScoringActivityEntries,
  formatRankLabel,
  formatRankingDateTime,
} from "../../services/rankingService";

function formatRankPreview(ranks) {
  if (!ranks.length) {
    return "No rank data";
  }

  if (ranks.length <= 4) {
    return ranks.map((rank) => formatRankLabel(rank)).join(" • ");
  }

  return `${ranks
    .slice(0, 3)
    .map((rank) => formatRankLabel(rank))
    .join(" • ")} • +${ranks.length - 3} more`;
}

function ScoringActivityLog({
  eventResults,
  loading = false,
  error = null,
  onRefresh,
}) {
  const activityEntries = useMemo(
    () => buildScoringActivityEntries(eventResults),
    [eventResults],
  );

  return (
    <section className="mt-8 rounded-3xl border border-theme-border bg-theme-surface-soft p-6 shadow-panel lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gold-soft text-brand-gold">
            <History className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-gold">
              Activity Log
            </p>
            <h3 className="mt-1 text-2xl font-bold text-theme-text">
              Global scoring save history
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-theme-muted">
              Every scoring save is grouped into a single activity entry using
              the shared audit timestamp stored in `event_results`.
            </p>
          </div>
        </div>

        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-theme-border-soft px-4 py-2 text-xs font-semibold uppercase tracking-wide text-theme-text transition hover:bg-theme-surface-hover"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((placeholder) => (
            <div
              key={placeholder}
              className="animate-pulse rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-4"
            >
              <div className="h-4 w-28 rounded-full bg-theme-surface" />
              <div className="mt-4 h-5 w-3/5 rounded-full bg-theme-surface" />
              <div className="mt-3 h-4 w-2/5 rounded-full bg-theme-surface" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-[#F43F5E4D] bg-[#450A0A]/25 px-4 py-4 text-sm text-[#FDA4AF]">
          {error.message || "Unable to load the scoring activity log right now."}
        </div>
      ) : !activityEntries.length ? (
        <div className="mt-6 rounded-3xl border border-dashed border-theme-border-soft bg-theme-bg px-6 py-10 text-center shadow-inner">
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-gold-soft text-brand-gold">
            <History className="h-8 w-8" />
          </div>
          <h4 className="mt-5 text-xl font-semibold text-theme-text">
            No scoring activity yet
          </h4>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-theme-muted">
            No scores have been recorded yet. Select an event to start scoring!
          </p>
          <div className="mt-5 inline-flex rounded-full border border-theme-border-soft bg-theme-surface px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-theme-subtle">
            Waiting for the first official save
          </div>
        </div>
      ) : (
        <div className="mt-6 max-h-[30rem] overflow-y-auto pr-2 [scrollbar-color:rgba(212,175,55,0.55)_transparent] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-brand-gold/60 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-2">
          <div className="space-y-3">
            {activityEntries.map((entry) => (
              <article
                key={entry.id}
                className="rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-brand-gold-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold">
                        {entry.event_category}
                      </span>
                      <span className="rounded-full border border-theme-border-soft px-3 py-1 text-xs font-semibold text-theme-muted">
                        {entry.result_count} saved row{entry.result_count === 1 ? "" : "s"}
                      </span>
                    </div>
                    <h4 className="mt-3 truncate text-lg font-semibold text-theme-text">
                      {entry.event_name}
                    </h4>
                    <p className="mt-2 break-all text-sm leading-6 text-theme-muted">
                      Saved by <span className="font-semibold text-theme-text">{entry.admin_email}</span>
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-theme-subtle">
                      {formatRankPreview(entry.ranks)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-theme-border-soft bg-theme-surface px-4 py-3 lg:min-w-[16rem]">
                    <div className="inline-flex items-center gap-2 text-sm font-semibold text-theme-text">
                      <Clock3 className="h-4 w-4 text-brand-gold" />
                      {formatRankingDateTime(entry.updated_at)}
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-theme-subtle">
                      Official scoring save
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default ScoringActivityLog;
