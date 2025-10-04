import axios from 'axios'
import { Message } from 'element-ui' // ⬅ remove MessageBox import

const TOKEN_KEY = 'madar_admin_token'

const service = axios.create({
  baseURL: process.env.VUE_APP_BASE_API,
  timeout: 15000,
  headers: { Accept: 'application/json' }
})

service.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

service.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error?.response?.status
    const data = error?.response?.data
    const msg = data?.message || data?.error || error.message || 'Request failed'

    if (status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      Message({ message: 'Your session expired. Please sign in again.', type: 'warning', duration: 3000 })
      setTimeout(() => {
        if (window.location.pathname !== '/login') window.location.href = '/login'
      }, 350)
      return Promise.reject({ status, ...data, message: msg })
    }

    if (status === 403) {
      Message({ message: 'You do not have permission to perform this action.', type: 'error', duration: 4000 })
      return Promise.reject({ status, ...data, message: msg })
    }

    if (status === 422) {
      return Promise.reject({ status, ...data, __isValidationError: true })
    }

    Message({ message: msg, type: 'error', duration: 5000 })
    return Promise.reject({ status, ...data, message: msg })
  }
)

export default service
export { TOKEN_KEY }
