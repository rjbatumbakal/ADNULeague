import { useCallback, useEffect, useState } from 'react'

export function useAsyncData(asyncFn, initialValue = []) {
  const [data, setData] = useState(initialValue)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const execute = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await asyncFn()
      setData(result)
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [asyncFn])

  useEffect(() => {
    execute().catch(() => {})
  }, [execute])

  return { data, loading, error, refetch: execute }
}
