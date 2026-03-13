const configuredApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL ?? '').trim()
const productionApiDefault = 'https://vote-tracker-chyp.onrender.com/api'
const looksLikePlaceholder =
	configuredApiBaseUrl.includes('your-backend-service') ||
	configuredApiBaseUrl.includes('ten-service.onrender.com')

function normalizeApiBaseUrl(value) {
	const raw = String(value || '').trim().replace(/\/+$/, '')
	if (!raw) {
		return ''
	}

	if (raw.endsWith('/api')) {
		return raw
	}

	return `${raw}/api`
}

const fallbackApiBaseUrl = import.meta.env.DEV ? 'http://localhost:5000/api' : productionApiDefault

export const API_BASE_URL = normalizeApiBaseUrl(configuredApiBaseUrl || fallbackApiBaseUrl)

export const API_BASE_URL_WARNING =
	looksLikePlaceholder && import.meta.env.PROD
		? 'VITE_API_BASE_URL đang thiếu hoặc đang dùng domain mẫu. Vui lòng trỏ về backend Render thật của bạn.'
		: ''

export const SESSION_KEY = 'vote-tracker-session'
