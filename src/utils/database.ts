import Dexie, { type EntityTable } from 'dexie'
import { databaseId } from '@/store/main'
import type { Slide, SlideTheme, CompatibilityReport } from '@/types/slides'
import { LOCALSTORAGE_KEY_DISCARDED_DB } from '@/configs/storage'

import { nanoid } from 'nanoid'

export interface writingBoardImg {
  id: string
  dataURL: string
}

export interface Snapshot {
  id: number
  index: number
  slides: Slide[]
}

export interface ProjectVersionCheckpoint {
  id: string
  timestamp: number
  label?: string
  slideCount: number
  slides: Slide[]
  theme: SlideTheme
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
  versions?: ProjectVersionCheckpoint[]
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
  try {
    const existing = await projectsDb.projects.get(project.id)
    if (existing?.versions && !cleanProject.versions) {
      cleanProject.versions = existing.versions
    }
  }
  catch {
    // ignore query failure if store is cold
  }
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

export const createProjectCheckpoint = async (
  projectId: string,
  label?: string,
  currentData?: { slides: Slide[]; theme: SlideTheme }
): Promise<ProjectVersionCheckpoint | null> => {
  const project = await projectsDb.projects.get(projectId)
  if (!project && !currentData) return null

  const slides = currentData?.slides || project?.slides || []
  const theme = currentData?.theme || project?.theme || {
    backgroundColor: '#ffffff',
    themeColors: ['#007aff'],
    fontColor: '#000000',
    fontName: 'Helvetica Neue',
  }

  const dateStr = new Date().toLocaleString()
  const checkpoint: ProjectVersionCheckpoint = {
    id: `ver-${nanoid(8)}`,
    timestamp: Date.now(),
    label: label || `Snapshot (${dateStr})`,
    slideCount: slides.length,
    slides: JSON.parse(JSON.stringify(slides)),
    theme: JSON.parse(JSON.stringify(theme)),
  }

  if (project) {
    const versions = project.versions ? [...project.versions] : []
    versions.unshift(checkpoint)
    if (versions.length > 30) versions.pop()
    project.versions = versions
    await projectsDb.projects.put(project)
  }
  return checkpoint
}

export const listProjectCheckpoints = async (projectId: string): Promise<ProjectVersionCheckpoint[]> => {
  const project = await projectsDb.projects.get(projectId)
  return project?.versions || []
}

export const restoreProjectCheckpoint = async (projectId: string, versionId: string): Promise<ProjectVersionCheckpoint | null> => {
  const project = await projectsDb.projects.get(projectId)
  if (!project || !project.versions) return null
  const target = project.versions.find(v => v.id === versionId)
  if (!target) return null
  project.slides = JSON.parse(JSON.stringify(target.slides))
  project.theme = JSON.parse(JSON.stringify(target.theme))
  project.updatedAt = Date.now()
  await projectsDb.projects.put(project)
  return target
}

export const deleteProjectCheckpoint = async (projectId: string, versionId: string): Promise<void> => {
  const project = await projectsDb.projects.get(projectId)
  if (!project || !project.versions) return
  project.versions = project.versions.filter(v => v.id !== versionId)
  await projectsDb.projects.put(project)
}

export { db, projectsDb }