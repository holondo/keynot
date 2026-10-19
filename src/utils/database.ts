import Dexie, { type EntityTable } from 'dexie'
import { databaseId } from '@/store/main'
import type { Slide, SlideTheme, CompatibilityReport } from '@/types/slides'
import { LOCALSTORAGE_KEY_DISCARDED_DB } from '@/configs/storage'

export interface writingBoardImg {
  id: string
  dataURL: string
}

export interface Snapshot {
  id: number
  index: number
  slides: Slide[]
}

export interface LocalProjectRecord {
  id: string
  title: string
  slides: Slide[]
  theme: SlideTheme
  viewportSize: number
  viewportRatio: number
  updatedAt: number
  backedUpAt?: number
  compatibilityReport?: CompatibilityReport | null
  keynoteSourceBase64?: string | null
}

const databaseNamePrefix = 'PPTist'
const persistentDbName = 'SlateStudioProjectsDB'

export const deleteDiscardedDB = async () => {
  const now = new Date().getTime()

  const localStorageDiscardedDB = localStorage.getItem(LOCALSTORAGE_KEY_DISCARDED_DB)
  const localStorageDiscardedDBList: string[] = localStorageDiscardedDB ? JSON.parse(localStorageDiscardedDB) : []

  const databaseNames = await Dexie.getDatabaseNames()
  const discardedDBNames = databaseNames.filter(name => {
    if (name === persistentDbName) return false
    if (name.indexOf(databaseNamePrefix) === -1) return false
    
    const [prefix, id, time] = name.split('_')
    if (prefix !== databaseNamePrefix || !id || !time) return true
    if (localStorageDiscardedDBList.includes(id)) return true
    if (now - (+time) >= 1000 * 60 * 60 * 12) return true

    return false
  })

  for (const name of discardedDBNames) Dexie.delete(name)
  localStorage.removeItem(LOCALSTORAGE_KEY_DISCARDED_DB)
}

const db = new Dexie(`${databaseNamePrefix}_${databaseId}_${new Date().getTime()}`) as Dexie & {
  snapshots: EntityTable<Snapshot, 'id'>,
  writingBoardImgs: EntityTable<writingBoardImg, 'id'>,
}

db.version(1).stores({
  snapshots: '++id',
  writingBoardImgs: 'id',
})

const projectsDb = new Dexie(persistentDbName) as Dexie & {
  projects: EntityTable<LocalProjectRecord, 'id'>
}

projectsDb.version(1).stores({
  projects: 'id, updatedAt, title',
})

export const saveLocalProject = async (project: LocalProjectRecord): Promise<void> => {
  const cleanProject: LocalProjectRecord = JSON.parse(JSON.stringify(project))
  await projectsDb.projects.put(cleanProject)
}

export const getLocalProject = async (id: string): Promise<LocalProjectRecord | undefined> => {
  return await projectsDb.projects.get(id)
}

export const listLocalProjects = async (): Promise<LocalProjectRecord[]> => {
  const list = await projectsDb.projects.orderBy('updatedAt').reverse().toArray()
  return list
}

export const deleteLocalProject = async (id: string): Promise<void> => {
  await projectsDb.projects.delete(id)
}

export { db, projectsDb }