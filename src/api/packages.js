import request from '@/utils/request'

// GET /api/admin/v1/packages?page=1&per_page=10  (proxied)
export const listPackages = (params) => request.get('/packages', { params })
