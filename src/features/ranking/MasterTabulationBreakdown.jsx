import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "../../utils/cn";
import { formatPoints } from "../../services/rankingService";

function MasterTabulationBreakdown({
  breakdownByCategory,
  formatRankLabel,
  getRankBadgeClassName,
  emptyMessage = "No event breakdown available.",
  headerLabel = "Event Breakdown",
  className,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categoryEntries = useMemo(
    () => Object.entries(breakdownByCategory ?? {}),
    [breakdownByCategory],
  );

  const categoryOptions = useMemo(
    () => categoryEntries.map(([category]) => category),
    [categoryEntries],
  );

  const filteredCategoryEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return categoryEntries
      .filter(
        ([category]) =>
          selectedCategory === "all" || category === selectedCategory,
      )
      .map(([category, events]) => {
        const filteredEvents = events.filter((event) => {
          if (!query) {
            return true;
          }

          return (
            String(event?.event_name ?? "").toLowerCase().includes(query) ||
            String(event?.event_category ?? "").toLowerCase().includes(query)
          );
        });

        return [category, filteredEvents];
      })
      .filter(([, events]) => events.length > 0);
  }, [categoryEntries, searchQuery, selectedCategory]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-theme-subtle">
          {headerLabel}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1 sm:min-w-[16rem]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-subtle" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search events..."
              className="w-full rounded-2xl border border-theme-border-soft bg-theme-bg py-2.5 pl-10 pr-3 text-sm text-theme-text outline-none transition placeholder:text-theme-subtle focus:border-brand-gold"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className="rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-2.5 text-sm text-theme-text outline-none transition focus:border-brand-gold"
          >
            <option value="all">All Categories</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredCategoryEntries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-theme-border-soft bg-theme-bg px-4 py-6 text-sm text-theme-muted">
          {emptyMessage}
        </div>
      ) : (
        <div className="custom-scrollbar max-h-[500px] overflow-y-auto rounded-2xl border border-theme-border-soft bg-theme-bg/70 p-2 sm:p-3">
          <div className="space-y-4">
            {filteredCategoryEntries.map(([category, events]) => (
              <section key={category} className="space-y-2">
                <div className="sticky top-0 z-10 overflow-hidden rounded-xl border border-slate-800 bg-slate-800 px-4 py-2 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-white">
                      {category}
                    </p>
                    <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80">
                      {events.length} {events.length === 1 ? "Event" : "Events"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {events.map((event) => (
                    <div
                      key={event.event_id ?? `${category}-${event.event_name}`}
                      className={cn(
                        "flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm",
                        event.isDefault && "bg-slate-50",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-theme-text">
                          {event.event_name}
                        </p>
                        <p className="mt-0.5 text-xs text-theme-subtle">
                          {event.isDefault ? "Default / no recorded score" : "Recorded result"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div
                          className={cn(
                            "rounded-full px-3 py-1 text-xs font-semibold",
                            getRankBadgeClassName(event.rank),
                          )}
                        >
                          {event.isDefault ? "D" : formatRankLabel(event.rank)}
                        </div>
                        <div className="w-16 text-right text-sm font-bold text-theme-text">
                          {formatPoints(event.points_awarded ?? 0)} pts
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MasterTabulationBreakdown;
