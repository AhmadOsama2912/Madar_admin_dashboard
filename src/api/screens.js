import request from '@/utils/request'

// If you don't have this endpoint yet, this will 404 and your page will show a note.
export const listScreens = (params) => request.get('/screens', { params })
