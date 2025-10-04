import request from '@/utils/request'

// GET /api/admin/v1/users
export const listUsers = (params) => request.get('/users', { params })
