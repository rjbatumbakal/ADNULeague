function AnnouncementCard({
  title,
  content,
  createdAt,
  postedBy,
  updatedBy,
  showAuthorMeta = true,
  compact = false,
  scrollableContent = false,
  className = "",
}) {
  const compactTitleStyle = compact
    ? {
        display: "-webkit-box",
        WebkitLineClamp: 3,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }
    : undefined;

  return (
    <article
      className={`flex flex-col rounded-2xl border border-theme-border bg-theme-surface p-5 shadow-panel ${className}`.trim()}
    >
      <div className="mb-3">
        <h3
          style={compactTitleStyle}
          className={
            compact
              ? "min-w-0 flex-1 text-base font-semibold leading-snug text-theme-text lg:text-lg"
              : "text-lg font-semibold text-theme-text"
          }
        >
          {title}
        </h3>
        {createdAt ? (
          <p className="mt-1 text-xs font-medium text-brand-blue">
            {createdAt}
          </p>
        ) : null}
      </div>
      <div
        className={
          scrollableContent ? "min-h-0 flex-1 overflow-y-auto pr-1" : ""
        }
      >
        <p
          className={
            compact
              ? "text-sm leading-6 text-theme-muted"
              : "text-sm leading-6 text-theme-muted"
          }
        >
          {content}
        </p>
      </div>
    </article>
  );
}

export default AnnouncementCard;
