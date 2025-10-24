import request from '@/utils/request'

// existing ones you already had:
export const getDashboardSummary = (params) => request.get('/dashboard/summary', { params })
export const getDashboardScreens = (params) => request.get('/dashboard/screens', { params })
export const getDashboardCustomers = (params) => request.get('/dashboard/customers', { params })

// NEW endpoints below:
export const getDashboardMetrics = (params) => request.get('/dashboard/metrics', { params }) // {days}
export const getDashboardLicensesExpiring = (params) => request.get('/dashboard/licenses/expiring', { params }) // {days, per_page}
