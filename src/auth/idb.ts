// 极简 IndexedDB 键值封装（无第三方依赖），单 object store

const DB_NAME = 'medviz'
const STORE = 'kv'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const req = fn(t.objectStore(STORE))
        req.onsuccess = () => resolve(req.result as T)
        req.onerror = () => reject(req.error)
      }),
  )
}

export const idbGet = <T>(key: string) => tx<T | undefined>('readonly', (s) => s.get(key))
export const idbSet = (key: string, val: unknown) =>
  tx<void>('readwrite', (s) => s.put(val, key))
export const idbDel = (key: string) => tx<void>('readwrite', (s) => s.delete(key))

/** 列出所有以 prefix 开头的 key（用于汇总所有用户/工作区） */
export const idbKeys = (prefix = '') =>
  tx<IDBValidKey[]>('readonly', (s) => s.getAllKeys()).then((keys) =>
    (keys as string[]).filter((k) => typeof k === 'string' && k.startsWith(prefix)),
  )
