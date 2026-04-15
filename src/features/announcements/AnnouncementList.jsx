import AnnouncementCard from "../../components/cards/AnnouncementCard";
import { useCallback, useMemo } from "react";
import { useAsyncData } from "../../hooks/useAsyncData";
import { getAnnouncements } from "../../services/announcementService";

function AnnouncementList({
  limit = 3,
  cardProps = {},
  className = "",
  formatCreatedAt,
  recentWithinHours = null,
  expandSingleCard = false,
}) {
  const loadAnnouncements = useCallback(() => getAnnouncements(limit), [limit]);
  const { data, loading, error } = useAsyncData(loadAnnouncements, []);

  const visibleAnnouncements = useMemo(() => {
    if (!data.length || !recentWithinHours) {
      return data;
    }

    const newestTimestamp = new Date(data[0].created_at).getTime();

    if (Number.isNaN(newestTimestamp)) {
      return data;
    }

    const cutoffTimestamp = newestTimestamp - recentWithinHours * 60 * 60 * 1000;

    return data.filter((announcement) => {
      const createdTimestamp = new Date(announcement.created_at).getTime();
      return !Number.isNaN(createdTimestamp) && createdTimestamp >= cutoffTimestamp;
    });
  }, [data, recentWithinHours]);

  if (loading) {
    return <p className="text-sm text-theme-muted">Loading announcements...</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-[#FDA4AF]">
        Unable to load announcements right now.
      </p>
    );
  }

  if (!visibleAnnouncements.length) {
    return (
      <p className="text-sm text-theme-muted">
        No announcements have been published yet.
      </p>
    );
  }

  return (
    <div className={`grid gap-4 ${className}`.trim()}>
      {visibleAnnouncements.map((announcement) => (
        <AnnouncementCard
          key={announcement.id}
          title={announcement.title}
          content={announcement.content}
          postedBy={announcement.posted_by_email}
          updatedBy={announcement.updated_by_email}
          createdAt={
            typeof formatCreatedAt === "function"
              ? formatCreatedAt(announcement.created_at)
              : new Date(announcement.created_at).toLocaleString("en-PH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })
          }
          {...cardProps}
          className={
            expandSingleCard && visibleAnnouncements.length === 1
              ? `${cardProps.className ?? ""} h-full`.trim()
              : cardProps.className ?? ""
          }
        />
      ))}
    </div>
  );
}

export default AnnouncementList;
