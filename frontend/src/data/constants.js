const configuredApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL ?? '').trim()

export const API_BASE_URL = configuredApiBaseUrl || (import.meta.env.DEV ? 'http://localhost:5000/api' : '')

export const API_BASE_URL_WARNING =
	!configuredApiBaseUrl && import.meta.env.PROD
		? 'Thiếu biến môi trường VITE_API_BASE_URL trên môi trường deploy.'
		: ''

export const SESSION_KEY = 'vote-tracker-session'
