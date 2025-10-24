// src/api/content.js
import request from '@/utils/request'

// Customers (admin scope)
export const listCustomers = (params) =>
  request({ url: '/customers', method: 'get', params })

// Screens (admin scope)
export const listScreens = (params) =>
  request({ url: '/screens', method: 'get', params })

export const assignScreenPlaylist = (screenId, playlist_id) =>
  request({ url: `/screens/${screenId}/playlist`, method: 'patch', data: { playlist_id }})

// Playlists
export const listPlaylists = (params) =>
  request({ url: '/playlists', method: 'get', params })

export const showPlaylist = (id) =>
  request({ url: `/playlists/${id}`, method: 'get' })

export const createPlaylist = (data) =>
  request({ url: '/playlists', method: 'post', data })

export const updatePlaylist = (id, data) =>
  request({ url: `/playlists/${id}`, method: 'patch', data })

export const deletePlaylist = (id) =>
  request({ url: `/playlists/${id}`, method: 'delete' })

export const publishPlaylist = (id) =>
  request({ url: `/playlists/${id}/publish`, method: 'post' })

export const setDefaultPlaylist = (id) =>
  request({ url: `/playlists/${id}/default`, method: 'post' })

export const refreshPlaylistVersion = (id) =>
  request({ url: `/playlists/${id}/refresh`, method: 'post' })

// Items
export const createItemFile = (playlistId, { file, type, duration, loop }) => {
  const fd = new FormData()
  fd.append('file', file)
  if (type) fd.append('type', type) // 'image' | 'video' (backend can infer too)
  if (duration != null) fd.append('duration', duration)
  if (loop != null) fd.append('loop', loop)
  return request({ url: `/playlists/${playlistId}/items`, method: 'post', data: fd })
}

export const createItemUrl = (playlistId, { src, type, duration, loop }) =>
  request({ url: `/playlists/${playlistId}/items`, method: 'post', data: { src, type, duration, loop }})

export const updateItem = (playlistId, itemId, data) =>
  request({ url: `/playlists/${playlistId}/items/${itemId}`, method: 'patch', data })

export const deleteItem = (playlistId, itemId) =>
  request({ url: `/playlists/${playlistId}/items/${itemId}`, method: 'delete' })

export const reorderItems = (playlistId, order) =>
  request({ url: `/playlists/${playlistId}/items/reorder`, method: 'patch', data: { order }})
