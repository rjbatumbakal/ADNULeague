import { supabase } from './supabaseClient'

const scheduleTables = [
  'schedule_day_1',
  'schedule_day_2',
  'schedule_day_3',
  'schedule_day_4',
  'schedule_day_5',
]

export const scheduleCategoryOrder = [
  'Team Sports',
  'Individual Sports',
  'E-Sports',
  'Track & Field',
  'Board Games',
  'Swimming',
  'Dance',
  'Faculty Events',
  'Special Events',
]

const scheduleCategoryDefinitions = [
  {
    label: 'Team Sports',
    keywords: [
      'basketball',
      'volleyball',
      'football',
      'futsal',
      'softball',
      'baseball',
      'handball',
      'sepak',
      'kickball',
    ],
  },
  {
    label: 'Individual Sports',
    keywords: [
      'badminton',
      'table tennis',
      'lawn tennis',
      'tennis',
      'billiards',
      'taekwondo',
      'arnis',
      'karate',
    ],
  },
  {
    label: 'E-Sports',
    keywords: [
      'e-sports',
      'esports',
      'e sports',
      'mobile legends',
      'valorant',
      'call of duty',
      'codm',
      'league of legends',
      'dota',
      'tekken',
    ],
  },
  {
    label: 'Track & Field',
    keywords: [
      'track',
      'field',
      'relay',
      'sprint',
      'dash',
      'hurdles',
      'jump',
      'shot put',
      'javelin',
      'discus',
      'throw',
    ],
  },
  {
    label: 'Board Games',
    keywords: ['chess', 'scrabble', 'damath', 'checkers'],
  },
  {
    label: 'Swimming',
    keywords: [
      'swimming',
      'swim',
      'freestyle',
      'breaststroke',
      'backstroke',
      'butterfly',
      'medley',
    ],
  },
  {
    label: 'Dance',
    keywords: ['dance', 'cheerdance', 'cheer dance', 'hip hop', 'street dance'],
  },
  {
    label: 'Faculty Events',
    keywords: ['faculty'],
  },
  {
    label: 'Special Events',
    keywords: [
      'quiz',
      'bee',
      'spoken',
      'pageant',
      'talent',
      'special',
      'showcase',
    ],
  },
]

function getScheduleEntryId(row) {
  return row?.id ?? row?.identity ?? null
}

function normalizeScheduleActivityEntryId(value) {
  const normalizedValue = String(value ?? '').trim()
  return normalizedValue || null
}

function getScheduleIdentifierColumn(row) {
  if (row && row.identity !== undefined && row.identity !== null) {
    return 'identity'
  }

  return 'id'
}

function getScheduleTableName(day) {
  return scheduleTables[Math.max(Number(day) - 1, 0)] ?? scheduleTables[0]
}

function normalizeOptionalValue(value) {
  const normalizedValue = String(value ?? '').trim()
  return normalizedValue ? normalizedValue : null
}

function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9&]+/g, ' ')
    .trim()
}

function parseTimeValue(value) {
  if (!value) {
    return null
  }

  const normalizedValue = String(value).trim().toLowerCase()
  const match = normalizedValue.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/)

  if (match) {
    const hours = Number(match[1])
    const minutes = Number(match[2] ?? '0')
    const meridiem = match[3]
    const normalizedHours = (hours % 12) + (meridiem === 'pm' ? 12 : 0)

    return normalizedHours * 60 + minutes
  }

  const militaryMatch = normalizedValue.match(/^(\d{1,2}):(\d{2})$/)

  if (!militaryMatch) {
    return null
  }

  const hours = Number(militaryMatch[1])
  const minutes = Number(militaryMatch[2])

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null
  }

  return hours * 60 + minutes
}

function getTimeRangeMinutes(timeRange) {
  if (!timeRange) {
    return null
  }

  const [startValue, endValue] = String(timeRange)
    .split('-')
    .map((value) => value.trim())
  const startMinutes = parseTimeValue(startValue)

  if (startMinutes === null) {
    return null
  }

  const endMinutes = endValue ? parseTimeValue(endValue) : startMinutes

  if (endMinutes === null) {
    return null
  }

  return { startMinutes, endMinutes }
}

function getCurrentMinutes() {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

function parseGameNumber(value) {
  const parsedValue = Number.parseInt(String(value ?? '').replace(/\D/g, ''), 10)
  return Number.isNaN(parsedValue) ? Number.POSITIVE_INFINITY : parsedValue
}

function normalizeBracketForSort(value) {
  const normalizedValue = String(value ?? '').trim().toUpperCase()
  return normalizedValue || 'ZZZ'
}

function deriveScheduleCategory(row) {
  const explicitCategory = row.category ?? row.event_category ?? row.group ?? ''

  if (explicitCategory) {
    const normalizedCategory = normalizeText(explicitCategory)
    const matchedCategory = scheduleCategoryOrder.find(
      (label) => normalizeText(label) === normalizedCategory
    )

    if (matchedCategory) {
      return matchedCategory
    }
  }

  const searchText = normalizeText(
    [
      row.event,
      row.event_name,
      row.sport,
      row.category,
      row.teams_involved,
    ]
      .filter(Boolean)
      .join(' ')
  )

  const matchedDefinition = scheduleCategoryDefinitions.find(({ keywords }) =>
    keywords.some((keyword) => searchText.includes(normalizeText(keyword)))
  )

  return matchedDefinition?.label ?? 'Special Events'
}

function buildSchedulePayload(values) {
  const payload = {
    day: Number(values.day) || 1,
    event: normalizeOptionalValue(values.event) ?? 'Upcoming Event',
    teams_involved: normalizeOptionalValue(values.teams_involved),
    time: normalizeOptionalValue(values.time),
    venue: normalizeOptionalValue(values.venue),
    game_no: normalizeOptionalValue(values.game_no),
    bracket: normalizeOptionalValue(values.bracket),
  }

  const category = normalizeOptionalValue(values.category)

  if (category) {
    payload.category = category
  }

  return payload
}

function normalizeScheduleRow(tableName, row) {
  const dayFromTableName = Number(tableName.split('_').at(-1))
  const eventName = row.event_name ?? row.event ?? 'Upcoming Event'
  const entryId = getScheduleEntryId(row)

  return {
    id: `${tableName}-${entryId}`,
    entry_id: entryId,
    identifier_column: getScheduleIdentifierColumn(row),
    source_table: tableName,
    day: dayFromTableName,
    category: deriveScheduleCategory(row),
    event_name: eventName,
    event: row.event ?? row.event_name ?? eventName,
    time: row.time,
    venue: row.venue,
    created_at: row.created_at,
    updated_at: row.updated_at ?? null,
    teams_involved: row.teams_involved ?? '',
    game_no: row.game_no ?? '',
    bracket: row.bracket ?? '',
    posted_by_email: row.posted_by_email ?? null,
    updated_by_email: row.updated_by_email ?? null,
  }
}

function applyScheduleActivity(rows, activityLogs) {
  const activityBySchedule = new Map()

  activityLogs.forEach((log) => {
    const key = `${log.schedule_table}-${log.schedule_entry_id}`
    const logs = activityBySchedule.get(key) ?? []
    logs.push(log)
    activityBySchedule.set(key, logs)
  })

  return rows.map((row) => {
    const key = `${row.source_table}-${row.entry_id}`
    const logs = activityBySchedule.get(key) ?? []
    const createdLog = logs.find((log) => log.action === 'created')
    const updatedLogs = logs.filter((log) => log.action === 'updated')
    const latestUpdatedLog = updatedLogs.at(-1) ?? null

    return {
      ...row,
      posted_by_email: createdLog?.actor_email ?? row.posted_by_email ?? null,
      updated_by_email:
        latestUpdatedLog?.actor_email ?? row.updated_by_email ?? null,
    }
  })
}

function isOptionalScheduleTrackingTableError(error) {
  if (!error) {
    return false
  }

  const normalizedMessage = error.message?.toLowerCase() ?? ''

  return (
    error.code === 'PGRST205' ||
    error.code === '42501' ||
    error.code === '42P01' ||
    (normalizedMessage.includes('schedule_activity_logs') &&
      normalizedMessage.includes('does not exist'))
  )
}

function isMissingRelationError(error, tableName) {
  if (!error) {
    return false
  }

  const message = String(error.message ?? '').toLowerCase()
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    message.includes(`relation \"${tableName}\"`) ||
    message.includes(tableName)
  )
}

function normalizeTeamOption(row) {
  const rawAcronym = String(row?.acronym ?? row?.team_code ?? row?.short_name ?? '').trim().toUpperCase()
  const rawName = String(row?.team_name ?? row?.name ?? row?.department_name ?? '').trim()
  const value = rawAcronym || rawName

  if (!value) {
    return null
  }

  const label = rawAcronym && rawName ? `${rawAcronym} - ${rawName}` : value

  return {
    value,
    label,
    acronym: rawAcronym || value,
    name: rawName || value,
    category: String(
      row?.category ?? row?.team_category ?? row?.sport_category ?? row?.event_category ?? ''
    ).trim(),
  }
}

async function writeScheduleActivityLog({ action, actor, schedule }) {
  const scheduleEntryId = normalizeScheduleActivityEntryId(schedule.entry_id)

  if (!schedule.source_table || !scheduleEntryId) {
    return
  }

  const { error } = await supabase.from('schedule_activity_logs').insert({
    schedule_table: schedule.source_table,
    schedule_entry_id: scheduleEntryId,
    day: schedule.day,
    action,
    actor_id: actor?.id ?? null,
    actor_email: actor?.email ?? null,
    category_snapshot: schedule.category,
    event_snapshot: schedule.event,
    teams_involved_snapshot: schedule.teams_involved,
    time_snapshot: schedule.time,
    venue_snapshot: schedule.venue,
  })

  if (error && !isOptionalScheduleTrackingTableError(error)) {
    throw error
  }
}

async function getSchedulesFromTable(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')

  if (error) {
    throw error
  }

  return data.map((row) => normalizeScheduleRow(tableName, row))
}

async function getScheduleActivityForRows(rows) {
  if (!rows.length) {
    return []
  }

  const { data, error } = await supabase
    .from('schedule_activity_logs')
    .select('*')
    .in('schedule_table', scheduleTables)
    .order('created_at', { ascending: true })

  if (error) {
    if (isOptionalScheduleTrackingTableError(error)) {
      return []
    }

    throw error
  }

  const validKeys = new Set(
    rows.map(
      (row) =>
        `${row.source_table}-${normalizeScheduleActivityEntryId(row.entry_id)}`
    )
  )

  return data.filter((log) =>
    validKeys.has(
      `${log.schedule_table}-${normalizeScheduleActivityEntryId(log.schedule_entry_id)}`
    )
  )
}

function sortSchedules(rows) {
  return rows.sort((firstRow, secondRow) => {
    if (firstRow.day !== secondRow.day) {
      return firstRow.day - secondRow.day
    }

    const firstGameNumber = parseGameNumber(firstRow.game_number ?? firstRow.game_no)
    const secondGameNumber = parseGameNumber(secondRow.game_number ?? secondRow.game_no)

    if (firstGameNumber !== secondGameNumber) {
      return firstGameNumber - secondGameNumber
    }

    const firstBracket = normalizeBracketForSort(firstRow.bracket)
    const secondBracket = normalizeBracketForSort(secondRow.bracket)

    if (firstBracket !== secondBracket) {
      return firstBracket.localeCompare(secondBracket)
    }

    const firstRange = getTimeRangeMinutes(firstRow.time)
    const secondRange = getTimeRangeMinutes(secondRow.time)

    if (!firstRange || !secondRange) {
      return String(firstRow.time ?? '').localeCompare(String(secondRow.time ?? ''))
    }

    if (firstRange.startMinutes !== secondRange.startMinutes) {
      return firstRange.startMinutes - secondRange.startMinutes
    }

    return firstRow.event_name.localeCompare(secondRow.event_name)
  })
}

export async function getSchedules() {
  const scheduleGroups = await Promise.all(
    scheduleTables.map((tableName) => getSchedulesFromTable(tableName))
  )

  const schedules = sortSchedules(scheduleGroups.flat())
  const activityLogs = await getScheduleActivityForRows(schedules)

  return applyScheduleActivity(schedules, activityLogs)
}

export async function getSchedulesByDay(day) {
  const schedules = await getSchedules()
  return schedules.filter((row) => Number(row.day) === Number(day))
}

export async function getScheduleTeams() {
  const { data: teamsData, error: teamsError } = await supabase
    .from('teams')
    .select('*')
    .order('acronym', { ascending: true })

  if (teamsError) {
    if (!isMissingRelationError(teamsError, 'teams')) {
      throw teamsError
    }

    const { data: departmentsData, error: departmentsError } = await supabase
      .from('departments')
      .select('*')
      .order('acronym', { ascending: true })

    if (departmentsError) {
      throw departmentsError
    }

    return departmentsData
      .map((row) => normalizeTeamOption(row))
      .filter(Boolean)
  }

  return teamsData
    .map((row) => normalizeTeamOption(row))
    .filter(Boolean)
}

export async function getCurrentSchedules() {
  const schedules = await getSchedules()
  const currentMinutes = getCurrentMinutes()

  return schedules.filter((row) => {
    const range = getTimeRangeMinutes(row.time)

    if (!range) {
      return false
    }

    return (
      currentMinutes >= range.startMinutes &&
      currentMinutes <= range.endMinutes
    )
  })
}

export async function createSchedule({ actor, ...values }) {
  const tableName = getScheduleTableName(values.day)
  const payload = buildSchedulePayload(values)
  const { data, error } = await supabase
    .from(tableName)
    .insert(payload)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  const schedule = normalizeScheduleRow(tableName, data)

  await writeScheduleActivityLog({
    action: 'created',
    actor,
    schedule,
  })

  return {
    ...schedule,
    posted_by_email: actor?.email ?? null,
    updated_by_email: null,
  }
}

export async function updateSchedule(schedule, { actor, ...values }) {
  const currentTableName = schedule.source_table ?? getScheduleTableName(schedule.day)
  const nextTableName = getScheduleTableName(values.day ?? schedule.day)
  const identifierColumn = schedule.identifier_column ?? getScheduleIdentifierColumn(schedule)
  const identifierValue = schedule.entry_id ?? getScheduleEntryId(schedule)
  const payload = buildSchedulePayload(values)

  if (nextTableName !== currentTableName) {
    const { data: insertedRow, error: insertError } = await supabase
      .from(nextTableName)
      .insert(payload)
      .select('*')
      .single()

    if (insertError) {
      throw insertError
    }

    const { error: deleteError } = await supabase
      .from(currentTableName)
      .delete()
      .eq(identifierColumn, identifierValue)

    if (deleteError) {
      throw deleteError
    }

    const updatedSchedule = normalizeScheduleRow(nextTableName, insertedRow)

    await writeScheduleActivityLog({
      action: 'updated',
      actor,
      schedule: updatedSchedule,
    })

    return {
      ...updatedSchedule,
      posted_by_email: schedule.posted_by_email ?? null,
      updated_by_email: actor?.email ?? null,
    }
  }

  const { data, error } = await supabase
    .from(currentTableName)
    .update(payload)
    .eq(identifierColumn, identifierValue)
    .select('*')
    .single()

  if (error) {
    throw error
  }

  const updatedSchedule = normalizeScheduleRow(currentTableName, data)

  await writeScheduleActivityLog({
    action: 'updated',
    actor,
    schedule: updatedSchedule,
  })

  return {
    ...updatedSchedule,
    posted_by_email: schedule.posted_by_email ?? null,
    updated_by_email: actor?.email ?? null,
  }
}

export async function deleteSchedule(schedule, actor) {
  const tableName = schedule.source_table ?? getScheduleTableName(schedule.day)
  const identifierColumn = schedule.identifier_column ?? getScheduleIdentifierColumn(schedule)
  const identifierValue = schedule.entry_id ?? getScheduleEntryId(schedule)
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq(identifierColumn, identifierValue)

  if (error) {
    throw error
  }

  await writeScheduleActivityLog({
    action: 'deleted',
    actor,
    schedule,
  })
}

export async function getScheduleActivityLogs(limit = 50) {
  const query = supabase
    .from('schedule_activity_logs')
    .select('*')
    .order('created_at', { ascending: false })

  const { data, error } = limit ? await query.limit(limit) : await query

  if (error) {
    if (isOptionalScheduleTrackingTableError(error)) {
      return []
    }

    throw error
  }

  return data
}
