function SectionHeading({ eyebrow, title, description, action, descriptionClassName = "" }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.24em] text-brand-gold">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-3xl font-bold text-theme-text md:text-4xl">
          {title}
        </h2>
        {description
          ? typeof description === "string"
            ? (
              <p className={`mt-3 max-w-2xl text-sm text-theme-muted md:text-base ${descriptionClassName}`}>
                {description}
              </p>
            )
            : (
              <div className={`mt-3 max-w-2xl text-sm text-theme-muted md:text-base ${descriptionClassName}`}>
                {description}
              </div>
            )
          : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export default SectionHeading;
