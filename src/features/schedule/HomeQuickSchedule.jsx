import { CalendarDays, Clock3, MapPin, Search, Sun, Sunset, Trophy } from "lucide-react";
import { useAsyncData } from "../../hooks/useAsyncData";
import { getHomeQuickSchedules } from "../../services/scheduleService";

function getHalfDayTitle(halfDay) {
  return halfDay === "morning" ? "Morning schedule" : "Afternoon schedule";
}

function getHalfDayDescription(halfDay) {
  return halfDay === "morning"
    ? "Showing Football, Basketball, and Volleyball matches scheduled before 12:00 PM."
    : "Showing Football, Basketball, and Volleyball matches scheduled from 12:00 PM onward.";
}

function getScheduleHeadline(schedule) {
  return schedule.teams_involved || schedule.event_name || schedule.event || "Upcoming matchup";
}

function getScheduleLabel(schedule) {
  return schedule.event || schedule.event_name || schedule.sport || "Team Sports";
}

function HomeQuickSchedule() {
  const { data, loading, error } = useAsyncData(() => getHomeQuickSchedules(6), {
    halfDay: "morning",
    schedules: [],
  });

  if (loading) {
    return <p className="text-sm text-theme-muted">Loading featured schedule...</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-[#FDA4AF]">
        Unable to load the featured team sports schedule right now.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-theme-text">
            {data.halfDay === "morning" ? (
              <Sun className="h-4 w-4 text-brand-gold" />
            ) : (
              <Sunset className="h-4 w-4 text-brand-gold" />
            )}
            {getHalfDayTitle(data.halfDay)}
          </div>
          <p className="mt-2 text-sm leading-6 text-theme-muted">
            {getHalfDayDescription(data.halfDay)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-theme-surface-strong px-4 py-2 text-sm font-medium text-theme-muted">
            <Search className="h-4 w-4" />
            Team sports spotlight
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-gold-soft px-4 py-2 text-sm font-medium text-brand-gold">
            <Trophy className="h-4 w-4" />
            Football, Basketball, Volleyball
          </span>
        </div>
      </div>

      {!data.schedules.length ? (
        <div className="rounded-2xl border border-dashed border-theme-border-soft bg-theme-surface-soft p-6 text-sm text-theme-muted">
          No Football, Basketball, or Volleyball schedules are available for this{" "}
          {data.halfDay}.
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {data.schedules.map((schedule, index) => (
            <article
              key={schedule.id ?? `${schedule.event_name}-${schedule.day}-${index}`}
              className="rounded-2xl border border-theme-border-soft bg-theme-surface-soft p-4 transition hover:bg-theme-surface-hover"
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-lime-400 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#111827]">
                    <Clock3 className="h-4 w-4" />
                    {schedule.time || "TBA"}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-theme-surface-strong px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-theme-muted">
                    <CalendarDays className="h-4 w-4" />
                    Day {schedule.day || "TBA"}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-theme-text">
                    {getScheduleHeadline(schedule)}
                  </h3>
                  <p className="mt-1 text-sm text-theme-muted">
                    {getScheduleLabel(schedule)}
                  </p>
                </div>

                <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-theme-border-soft bg-theme-surface px-4 py-3 text-sm text-theme-muted">
                  <MapPin className="h-4 w-4 text-brand-gold" />
                  <span>
                    <span className="font-semibold text-theme-text">Venue:</span>{" "}
                    {schedule.venue || "To be announced"}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default HomeQuickSchedule;
