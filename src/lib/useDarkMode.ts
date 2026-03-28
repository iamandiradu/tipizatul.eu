import { useEffect, useState } from 'react'

const STORAGE_KEY = 'darkMode'
const mq = window.matchMedia('(prefers-color-scheme: dark)')

function getInitial(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY)
  // Explicit user choice takes priority; otherwise follow the OS
  return stored !== null ? stored === 'true' : mq.matches
}

export function useDarkMode() {
  const [dark, setDark] = useState(getInitial)

  // Apply the class and persist whenever the value changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem(STORAGE_KEY, String(dark))
  }, [dark])

  // Follow OS-level changes — but only when the user hasn't set an explicit preference
  useEffect(() => {
    function onOsChange(e: MediaQueryListEvent) {
      if (localStorage.getItem(STORAGE_KEY) === null) {
        setDark(e.matches)
      }
    }
    mq.addEventListener('change', onOsChange)
    return () => mq.removeEventListener('change', onOsChange)
  }, [])

  function toggle() {
    setDark((d) => {
      // Toggling always sets an explicit preference
      localStorage.setItem(STORAGE_KEY, String(!d))
      return !d
    })
  }

  return { dark, toggle }
}
