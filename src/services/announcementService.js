import { supabase } from './supabaseClient'

function getAnnouncementId(row) {
  return row?.id ?? row?.identity ?? null
}

function getAnnouncementIdentifierColumn(row) {
  if (row && row.identity !== undefined && row.identity !== null) {
    return 'identity'
  }

  return 'id'
}

function normalizeAnnouncement(row) {
  if (!row) {
    return row
  }

  return {
    ...row,
    id: getAnnouncementId(row),
  }
}

function applyAnnouncementActivity(announcements, activityLogs) {
  const activityByAnnouncementId = new Map()

  activityLogs.forEach((log) => {
    const logs = activityByAnnouncementId.get(log.announcement_id) ?? []
    logs.push(log)
    activityByAnnouncementId.set(log.announcement_id, logs)
  })

  return announcements.map((announcement) => {
    const logs = activityByAnnouncementId.get(announcement.id) ?? []
    const createdLog = logs.find((log) => log.action === 'created')
    const updatedLogs = logs.filter((log) => log.action === 'updated')
    const latestUpdatedLog = updatedLogs.at(-1) ?? null

    return {
      ...announcement,
      posted_by_email: createdLog?.actor_email ?? announcement.posted_by_email ?? null,
      updated_by_email:
        latestUpdatedLog?.actor_email ?? announcement.updated_by_email ?? null,
    }
  })
}

function isOptionalTrackingTableError(error) {
  if (!error) {
    return false
  }

  return (
    error.code === 'PGRST205' ||
    error.code === '42501' ||
    error.code === 'PGRST204' ||
    error.message?.toLowerCase().includes('announcement_activity_logs')
  )
}

async function writeAnnouncementActivityLog({
  action,
  actor,
  announcementId,
  title,
  content,
}) {
  const { error } = await supabase.from('announcement_activity_logs').insert({
    announcement_id: announcementId,
    action,
    actor_id: actor?.id ?? null,
    actor_email: actor?.email ?? null,
    title_snapshot: title,
    content_snapshot: content,
  })

  if (error && !isOptionalTrackingTableError(error)) {
    throw error
  }
}

async function getAnnouncementActivityMap(announcementIds) {
  if (!announcementIds.length) {
    return []
  }

  const { data, error } = await supabase
    .from('announcement_activity_logs')
    .select('*')
    .in('announcement_id', announcementIds)
    .order('created_at', { ascending: true })

  if (error) {
    if (isOptionalTrackingTableError(error) || error.code === '42501') {
      return []
    }

    throw error
  }

  return data
}

export async function getAnnouncements(limit = 5) {
  const query = supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })

  const { data, error } = limit ? await query.limit(limit) : await query

  if (error) {
    throw error
  }

  const announcements = data.map((row) => normalizeAnnouncement(row))
  const activityLogs = await getAnnouncementActivityMap(
    announcements.map((announcement) => announcement.id),
  )

  return applyAnnouncementActivity(announcements, activityLogs)
}

export async function createAnnouncement({ title, content, actor }) {
  const { data, error } = await supabase
    .from('announcements')
    .insert({ title, content })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  const announcement = normalizeAnnouncement(data)

  await writeAnnouncementActivityLog({
    action: 'created',
    actor,
    announcementId: announcement.id,
    title: announcement.title,
    content: announcement.content,
  })

  return {
    ...announcement,
    posted_by_email: actor?.email ?? null,
    updated_by_email: null,
  }
}

export async function updateAnnouncement(announcement, { title, content, actor }) {
  const identifierColumn = getAnnouncementIdentifierColumn(announcement)
  const identifierValue = getAnnouncementId(announcement)
  const { data, error } = await supabase
    .from('announcements')
    .update({ title, content, updated_at: new Date().toISOString() })
    .eq(identifierColumn, identifierValue)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  const updatedAnnouncement = normalizeAnnouncement(data)

  await writeAnnouncementActivityLog({
    action: 'updated',
    actor,
    announcementId: updatedAnnouncement.id,
    title: updatedAnnouncement.title,
    content: updatedAnnouncement.content,
  })

  return {
    ...updatedAnnouncement,
    posted_by_email: announcement?.posted_by_email ?? null,
    updated_by_email: actor?.email ?? null,
  }
}

export async function deleteAnnouncement(announcement, actor) {
  const identifierColumn = getAnnouncementIdentifierColumn(announcement)
  const identifierValue = getAnnouncementId(announcement)
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq(identifierColumn, identifierValue)

  if (error) {
    throw error
  }

  await writeAnnouncementActivityLog({
    action: 'deleted',
    actor,
    announcementId: announcement.id,
    title: announcement.title,
    content: announcement.content,
  })
}

export async function getAnnouncementActivityLogs(limit = 25) {
  const query = supabase
    .from('announcement_activity_logs')
    .select('*')
    .order('created_at', { ascending: false })

  const { data, error } = limit ? await query.limit(limit) : await query

  if (error) {
    if (isOptionalTrackingTableError(error)) {
      return []
    }

    throw error
  }

  return data
}
