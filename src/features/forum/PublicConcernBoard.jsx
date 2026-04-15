import { MessageSquareReply } from 'lucide-react'
import { useCallback } from 'react'
import { useAsyncData } from '../../hooks/useAsyncData'
import { getPublishedConcernReplies } from '../../services/concernService'

function formatDateTime(value) {
  if (!value) {
    return 'Unknown time'
  }

  return new Date(value).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function PublicConcernBoard() {
  const loadReplies = useCallback(() => getPublishedConcernReplies(50), [])
  const { data, loading, error } = useAsyncData(loadReplies, [])

  return (
    <section className="rounded-3xl border border-theme-border bg-theme-surface p-4 shadow-panel sm:p-6 lg:p-8">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-gold">
            Published Concerns
          </p>
          <h2 className="mt-2 text-2xl font-bold text-theme-text sm:text-3xl">
            Admin responses to community concerns
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-5 text-theme-muted sm:text-base sm:leading-6">
            Only concerns that already have an official admin reply are shown here.
            New anonymous submissions stay hidden until the admin team responds.
          </p>
        </div>
        <div className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-gold-soft text-brand-gold sm:h-12 sm:w-12">
          <MessageSquareReply className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-theme-muted">Loading published concerns...</p>
      ) : error ? (
        <p className="mt-6 text-sm text-[#FDA4AF]">
          Unable to load published concerns right now.
        </p>
      ) : !data.length ? (
        <div className="mt-5 rounded-2xl border border-dashed border-theme-border-soft bg-theme-surface-soft p-4 text-sm text-theme-muted sm:mt-6 sm:p-6">
          No admin replies have been published yet.
        </div>
      ) : (
        <div className="mt-5 max-h-[58rem] space-y-3 overflow-y-auto pr-1 sm:mt-6 sm:max-h-[64rem] sm:space-y-4 sm:pr-2">
          {data.map((concern) => (
            <article
              key={concern.id}
              className="rounded-2xl border border-theme-border-soft bg-theme-bg p-3.5 sm:p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-brand-gold-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-gold">
                  {concern.category || 'General Inquiry'}
                </span>
                <span className="rounded-full border border-theme-border-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-theme-subtle">
                  {concern.status || 'reviewed'}
                </span>
              </div>

              <h3 className="mt-3 text-lg font-semibold text-theme-text sm:mt-4 sm:text-xl">
                {concern.subject}
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-theme-muted sm:mt-3 sm:leading-6">
                {concern.message}
              </p>

              <div className="mt-3 rounded-2xl border border-theme-border-soft bg-theme-surface px-4 py-3 sm:mt-4 sm:py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-gold">
                  Official reply
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-theme-text sm:mt-3 sm:leading-6">
                  {concern.admin_reply}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-theme-subtle sm:mt-4">
                  {concern.replied_at ? (
                    <span>Replied: {formatDateTime(concern.replied_at)}</span>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default PublicConcernBoard
