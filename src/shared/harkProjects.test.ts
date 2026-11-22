import { expect, it } from 'vitest'
import { harkProjects } from './harkProjects'

it('keeps the untitled main conversation distinct from archived projects', () => {
  expect(harkProjects({ conversations: [
    { id: 'main', title: null, archivedAt: null }, { id: 'project', title: 'Draft', archivedAt: 1 }
  ] })).toEqual([
    { id: 'main', title: '主会话', main: true, archived: false },
    { id: 'project', title: 'Draft', main: false, archived: true }
  ])
})
