import { supabase } from './supabaseClient'

const concernsTable = 'forum_submissions'

export const concernCategoryOptions = [
  'General Inquiry',
  'Schedule Concern',
  'Announcement Concern',
  'Venue Concern',
  'Technical Issue',
  'Other',
]

export const concernStatusOptions = ['new', 'reviewed', 'resolved', 'archived']

function getConcernId(row) {
  return row?.id ?? row?.identity ?? null
}

function getConcernIdentifierColumn(row) {
  if (row && row.identity !== undefined && row.identity !== null) {
    return 'identity'
  }

  return 'id'
}

function normalizeReplyValue(value) {
  const normalizedValue = String(value ?? '').trim()
  return normalizedValue || null
}

function normalizeConcern(row) {
  if (!row) {
    return row
  }

  const adminReply = normalizeReplyValue(row.admin_reply)
  const isPubliclyVisible =
    Boolean(adminReply) && !Boolean(row.is_spam) && (row.status ?? 'new') !== 'archived'

  return {
    ...row,
    id: getConcernId(row),
    admin_reply: adminReply,
    status: row.status ?? 'new',
    is_spam: Boolean(row.is_spam),
    is_publicly_visible: isPubliclyVisible,
  }
}

export async function getConcernSubmissions(limit = 100) {
  const query = supabase
    .from(concernsTable)
    .select('*')
    .order('created_at', { ascending: false })

  const { data, error } = limit ? await query.limit(limit) : await query

  if (error) {
    throw error
  }

  return data.map((row) => normalizeConcern(row))
}

export async function getPublishedConcernReplies(limit = 100) {
  const query = supabase
    .from(concernsTable)
    .select('*')
    .not('admin_reply', 'is', null)
    .eq('is_spam', false)
    .neq('status', 'archived')
    .order('replied_at', { ascending: false })
    .order('created_at', { ascending: false })

  const { data, error } = limit ? await query.limit(limit) : await query

  if (error) {
    throw error
  }

  return data.map((row) => normalizeConcern(row))
}

export async function createConcernSubmission({ subject, message, category }) {
  const payload = {
    subject: String(subject ?? '').trim(),
    message: String(message ?? '').trim(),
    category: String(category ?? '').trim() || null,
  }

  const { error } = await supabase.from(concernsTable).insert(payload)

  if (error) {
    throw error
  }

  return normalizeConcern(payload)
}

export async function updateConcernSubmission(
  concern,
  { status, is_spam, admin_reply, actor }
) {
  const identifierColumn = getConcernIdentifierColumn(concern)
  const identifierValue = getConcernId(concern)
  const payload = {
    reviewed_at: new Date().toISOString(),
    reviewed_by_email: actor?.email ?? null,
  }

  if (status !== undefined) {
    payload.status = status
  }

  if (is_spam !== undefined) {
    payload.is_spam = Boolean(is_spam)
  }

  if (admin_reply !== undefined) {
    const normalizedReply = normalizeReplyValue(admin_reply)
    payload.admin_reply = normalizedReply
    payload.replied_at = normalizedReply ? new Date().toISOString() : null
    payload.replied_by_email = normalizedReply ? actor?.email ?? null : null
  }

  const { data, error } = await supabase
    .from(concernsTable)
    .update(payload)
    .eq(identifierColumn, identifierValue)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return normalizeConcern(data)
}

export async function deleteConcernSubmission(concern) {
  const identifierColumn = getConcernIdentifierColumn(concern)
  const identifierValue = getConcernId(concern)
  const { error } = await supabase
    .from(concernsTable)
    .delete()
    .eq(identifierColumn, identifierValue)

  if (error) {
    throw error
  }
}
