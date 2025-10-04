import request from '@/utils/request'

export const listPlaylists = (params) => request.get('/playlists', { params })
export const createPlaylist = (data) => request.post('/playlists', data)
export const updatePlaylist = (id, data) => request.patch(`/playlists/${id}`, data)
export const deletePlaylist = (id) => request.delete(`/playlists/${id}`)

// Actions
export const publishPlaylist = (id) => request.post(`/playlists/${id}/publish`)
export const setDefaultPlaylist = (id) => request.post(`/playlists/${id}/default`)
export const refreshPlaylist = (id) => request.post(`/playlists/${id}/refresh`)

// Items
export const addPlaylistItem = (pid, data) => request.post(`/playlists/${pid}/items`, data)
export const updatePlaylistItem = (pid, iid, data) => request.patch(`/playlists/${pid}/items/${iid}`, data)
export const deletePlaylistItem = (pid, iid) => request.delete(`/playlists/${pid}/items/${iid}`)
export const reorderPlaylistItems = (pid, data) => request.patch(`/playlists/${pid}/items/reorder`, data)
