import request from '@/utils/request'

// List
export const listPackages = (params) => request.get('/packages', { params })
// Create
export const createPackage = (data) => request.post('/packages', data)
// Update
export const updatePackage = (id, data) => request.patch(`/packages/${id}`, data)
// Delete
export const deletePackage = (id) => request.delete(`/packages/${id}`)
