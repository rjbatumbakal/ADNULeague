import { MessageSquare } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  concernCategoryOptions,
  createConcernSubmission,
} from '../../services/concernService'

const submissionWindowMs = 60 * 60 * 1000
const cooldownWindowMs = 90 * 1000
const maxSubmissionsPerWindow = 3
const localStorageKey = 'adnuleague-concern-submissions'

function createInitialFormState() {
  return {
    category: concernCategoryOptions[0],
    subject: '',
    message: '',
    website: '',
  }
}

function getSubmissionHistory() {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const storedValue = window.localStorage.getItem(localStorageKey)
    const parsedValue = storedValue ? JSON.parse(storedValue) : []

    if (!Array.isArray(parsedValue)) {
      return []
    }

    return parsedValue.filter((timestamp) => Number.isFinite(timestamp))
  } catch {
    return []
  }
}

function saveSubmissionHistory(timestamps) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(localStorageKey, JSON.stringify(timestamps))
}

function getRemainingCooldown(now, history) {
  const latestSubmission = history.at(-1)

  if (!latestSubmission) {
    return 0
  }

  return Math.max(cooldownWindowMs - (now - latestSubmission), 0)
}

function formatRemainingTime(milliseconds) {
  const totalSeconds = Math.ceil(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes <= 0) {
    return `${seconds} seconds`
  }

  return `${minutes} minute${minutes === 1 ? '' : 's'} ${seconds
    .toString()
    .padStart(2, '0')} seconds`
}

function AnonymousConcernForm() {
  const [formState, setFormState] = useState(createInitialFormState)
  const [formError, setFormError] = useState('')
  const [formStatus, setFormStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fieldCharacterCount = useMemo(
    () => formState.message.trim().length,
    [formState.message]
  )

  function handleFieldChange(event) {
    const { name, value } = event.target
    setFormState((currentState) => ({
      ...currentState,
      [name]: value,
    }))
  }

  function resetForm() {
    setFormState(createInitialFormState())
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setFormError('')
    setFormStatus('')

    try {
      if (formState.website.trim()) {
        throw new Error('Unable to submit your concern right now.')
      }

      const subject = formState.subject.trim()
      const message = formState.message.trim()
      const now = Date.now()
      const recentHistory = getSubmissionHistory().filter(
        (timestamp) => now - timestamp < submissionWindowMs
      )
      const remainingCooldown = getRemainingCooldown(now, recentHistory)

      if (remainingCooldown > 0) {
        throw new Error(
          `Please wait ${formatRemainingTime(remainingCooldown)} before sending another concern.`
        )
      }

      if (recentHistory.length >= maxSubmissionsPerWindow) {
        throw new Error(
          'You have reached the anonymous submission limit for this hour. Please try again later.'
        )
      }

      if (subject.length < 6 || subject.length > 120) {
        throw new Error('Subject must be between 6 and 120 characters long.')
      }

      if (message.length < 20 || message.length > 1200) {
        throw new Error('Message must be between 20 and 1200 characters long.')
      }

      await createConcernSubmission({
        category: formState.category,
        subject,
        message,
      })

      saveSubmissionHistory([...recentHistory, now])
      resetForm()
      setFormStatus(
        'Your concern has been sent anonymously. It will only appear on the concerns page if an admin replies to it.'
      )
    } catch (error) {
      setFormError(error.message || 'Unable to send your concern right now.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="rounded-3xl border border-theme-border bg-theme-surface p-4 shadow-panel sm:p-6 lg:p-8">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-brand-blue">
            Concerns and Queries
          </p>
          <h2 className="mt-2 text-2xl font-bold text-theme-text sm:text-3xl">
            Send an anonymous message to the admin team
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-5 text-theme-muted sm:text-base sm:leading-6">
            Use this form for questions, concerns, or reports. Your submission stays
            private at first and will only appear on the concerns page if an admin
            posts an official reply.
          </p>
        </div>
        <div className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-gold text-white sm:h-12 sm:w-12">
          <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>

      <form className="mt-4 space-y-3 sm:mt-5 sm:space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 md:grid-cols-[0.8fr_1.2fr] md:gap-4">
          <div>
            <label
              htmlFor="concern-category"
              className="mb-2 block text-sm font-medium text-theme-muted"
            >
              Category
            </label>
            <select
              id="concern-category"
              name="category"
              value={formState.category}
              onChange={handleFieldChange}
              className="w-full rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-2.5 text-theme-text outline-none transition focus:border-brand-blue sm:py-3"
            >
              {concernCategoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="concern-subject"
              className="mb-2 block text-sm font-medium text-theme-muted"
            >
              Subject
            </label>
            <input
              id="concern-subject"
              name="subject"
              type="text"
              value={formState.subject}
              onChange={handleFieldChange}
              className="w-full rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-2.5 text-theme-text outline-none transition focus:border-brand-blue sm:py-3"
              placeholder="Describe your concern briefly"
              maxLength={120}
              required
            />
          </div>
        </div>

        <div className="hidden" aria-hidden="true">
          <label htmlFor="concern-website">Website</label>
          <input
            id="concern-website"
            name="website"
            type="text"
            value={formState.website}
            onChange={handleFieldChange}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label
              htmlFor="concern-message"
              className="block text-sm font-medium text-theme-muted"
            >
              Message
            </label>
            <span className="text-xs text-theme-subtle">
              {fieldCharacterCount}/1200 characters
            </span>
          </div>
          <textarea
            id="concern-message"
            name="message"
            value={formState.message}
            onChange={handleFieldChange}
            className="min-h-32 w-full rounded-2xl border border-theme-border-soft bg-theme-bg px-4 py-3 text-theme-text outline-none transition focus:border-brand-blue sm:min-h-40"
            placeholder="Write your concern or query here. Please avoid sending repeated submissions."
            maxLength={1200}
            required
          />
        </div>

        {formError ? (
          <div className="rounded-2xl border border-theme-border-soft bg-theme-surface-soft px-4 py-3 text-sm text-theme-muted">
            {formError}
          </div>
        ) : null}
        {formStatus ? (
          <div className="rounded-2xl border border-theme-border-soft bg-theme-surface-soft px-4 py-3 text-sm text-theme-text">
            {formStatus}
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <p className="text-xs leading-4 text-theme-subtle sm:leading-5">
            Anonymous submissions are limited per browser to reduce spam. For urgent
            concerns, contact the organizers directly as well.
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-brand-gold px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? 'Sending message...' : 'Send anonymous message'}
          </button>
        </div>
      </form>
    </section>
  )
}

export default AnonymousConcernForm
