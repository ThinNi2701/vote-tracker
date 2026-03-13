export function requestJsonFactory(token) {
  return async function requestJson(url, options = {}) {
    const normalizedUrl = String(url || '').trim()
    const isRelativeApiPath = normalizedUrl.startsWith('/')

    if (import.meta.env.PROD && isRelativeApiPath) {
      throw new Error('Thiếu cấu hình VITE_API_BASE_URL. Vui lòng cấu hình URL backend trên môi trường deploy.')
    }

    const headers = {
      ...(options.headers || {}),
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const response = await fetch(normalizedUrl, { ...options, headers })
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const error = new Error(data.message || 'Yêu cầu thất bại')
      error.status = response.status
      throw error
    }

    return data
  }
}
