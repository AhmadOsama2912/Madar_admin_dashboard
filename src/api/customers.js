import request from '@/utils/request'

export const listCustomers = (params) => request.get('/customers', { params })
export const getCustomer = (id) => request.get(`/customers/${id}`)
export const createCustomer = (data) => request.post('/customers', data)
export const updateCustomer = (id, data) => request.patch(`/customers/${id}`, data)
export const deleteCustomer = (id) => request.delete(`/customers/${id}`)
