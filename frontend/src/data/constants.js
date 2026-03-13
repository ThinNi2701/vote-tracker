const configuredApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL ?? '').trim()
const productionApiDefault = 'https://vote-tracker-chyp.onrender.com/api'
const looksLikePlaceholder =
	configuredApiBaseUrl.includes('your-backend-service') ||
	configuredApiBaseUrl.includes('ten-service.onrender.com')

export const API_BASE_URL = configuredApiBaseUrl || (import.meta.env.DEV ? 'http://localhost:5000/api' : productionApiDefault)

export const API_BASE_URL_WARNING =
	looksLikePlaceholder && import.meta.env.PROD
		? 'VITE_API_BASE_URL đang thiếu hoặc đang dùng domain mẫu. Vui lòng trỏ về backend Render thật của bạn.'
		: ''

export const SESSION_KEY = 'vote-tracker-session'
