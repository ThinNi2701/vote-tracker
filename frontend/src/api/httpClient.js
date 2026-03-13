export function requestJsonFactory(token) {
  return async function requestJson(url, options = {}) {
    const headers = {
      ...(options.headers || {}),
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(url, { ...options, headers })
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const error = new Error(data.message || 'Yêu cầu thất bại')
      error.status = response.status
      throw error
    }

    return data
  }
}
