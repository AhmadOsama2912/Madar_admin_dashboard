import request from '@/utils/request'

// List: GET /api/admin/v1/admins?page=1&per_page=10
export const listAdmins = (params) => request.get('/admins', { params })

// Show: GET /api/admin/v1/admins/:id
export const getAdmin = (id) => request.get(`/admins/${id}`)

// Create: POST /api/admin/v1/admins
export const createAdmin = (data) => request.post('/admins', data)

// Update: PATCH /api/admin/v1/admins/:id
export const updateAdmin = (id, data) => request.patch(`/admins/${id}`, data)

// Delete: DELETE /api/admin/v1/admins/:id
export const deleteAdmin = (id) => request.delete(`/admins/${id}`)
