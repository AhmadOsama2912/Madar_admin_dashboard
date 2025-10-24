import request from '@/utils/request'

// GET /api/admin/v1/enrollment-codes
export const listEnrollmentCodes = (params) => request.get('/enrollment-codes', { params })
// POST /api/admin/v1/enrollment-codes
export const createEnrollmentCode = (data) => request.post('/enrollment-codes', data)
