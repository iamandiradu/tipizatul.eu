import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'devMode'
const listeners = new Set<() => void>()

function read(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function useDevMode() {
  const dev = useSyncExternalStore(subscribe, read, () => false)

  function toggle() {
    localStorage.setItem(STORAGE_KEY, String(!read()))
    listeners.forEach((cb) => cb())
  }

  return { dev, toggle }
}
