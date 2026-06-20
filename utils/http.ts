export async function fetchWithRetry(
  input: string | URL | Request,
  init?: RequestInit,
  retries = 2,
  backoffMs = 1000,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(input, {
        ...init,
        signal: init?.signal ?? AbortSignal.timeout(30000),
      })
      if (response.status >= 500 && attempt < retries) {
        await Bun.sleep(backoffMs * (attempt + 1))
        continue
      }
      return response
    } catch (err) {
      if (attempt >= retries) throw err
      await Bun.sleep(backoffMs * (attempt + 1))
    }
  }
  throw new Error('Request failed after retries')
}
