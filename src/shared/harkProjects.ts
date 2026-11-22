export interface HarkProject {
  id: string
  title: string
  archived: boolean
  main: boolean
}

export function harkProjects(payload: unknown): HarkProject[] {
  const rows = Array.isArray(payload) ? payload : (payload as { conversations?: unknown } | null)?.conversations
  if (!Array.isArray(rows)) throw new Error('Hark returned an invalid conversation list')
  return rows.flatMap((row) => typeof row?.id === 'string' ? [{
    id: row.id,
    title: row.title ?? '主会话',
    main: row.title == null,
    archived: row.archivedAt != null
  }] : [])
}
