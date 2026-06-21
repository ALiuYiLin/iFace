import { useCallback, useRef, useState } from 'react'

/**
 * Wrap an async function with loading state management.
 *
 * @example
 * ```ts
 * const [isLoading, load] = usePromise(async () => {
 *   const data = await getQuestions()
 *   setQuestions(data)
 * })
 *
 * // later, in an event handler:
 * await load()
 * ```
 *
 * @example with arguments
 * ```ts
 * const [isSaving, save] = usePromise(async (id: string, body: Payload) => {
 *   await api.put(`/items/${id}`, body)
 * })
 *
 * await save('abc', { name: 'new name' })
 * ```
 */
export function usePromise<T extends (...args: never[]) => Promise<void>>(
  fn: T,
): [boolean, (...args: Parameters<T>) => Promise<void>] {
  const [isLoading, setIsLoading] = useState(false)
  const fnRef = useRef(fn)
  fnRef.current = fn

  const load = useCallback(async (...args: Parameters<T>) => {
    setIsLoading(true)
    try {
      await fnRef.current(...args)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return [isLoading, load]
}
