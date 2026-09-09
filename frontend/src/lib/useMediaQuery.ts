import { useEffect, useState } from 'react'

/**
 * Подписка на media-запрос. Нужна там, где на телефоне меняется не оформление,
 * а сама структура интерфейса — CSS такое не покрывает.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const list = window.matchMedia(query)
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches)

    setMatches(list.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Телефоны и узкие планшеты: ниже этой границы интерфейс перестраивается. */
export const MOBILE_QUERY = '(max-width: 900px)'
