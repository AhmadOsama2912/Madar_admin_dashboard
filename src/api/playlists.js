// src/api/playlists.js
import request from '@/utils/request'

/* ------------------------------- Helpers ------------------------------- */
const pluckList = (resp) => {
  const root = resp && resp.data ? resp.data : resp
  if (Array.isArray(root)) return root
  if (root && Array.isArray(root.data)) return root.data
  if (root && root.data && Array.isArray(root.data.data)) return root.data.data
  return []
}

/* --------------------------- Playlists (CRUD) --------------------------- */
export const listPlaylists = (params) =>
  request({ url: '/playlists', method: 'get', params })

export async function listPlaylistsForCustomer(customer_id) {
  try {
    const r1 = await listPlaylists({ customer_id, per_page: 500 })
    const a1 = pluckList(r1)
    if (a1.length) return a1
  } catch (_) {
    console.warn('Failed to list playlists for customer, falling back to all playlists')
  }

  const r2 = await listPlaylists({ per_page: 500 })
  const a2 = pluckList(r2)

  const isSameOrGlobal = (p) =>
    p == null ||
    p.customer_id == null ||
    p.customer_id === customer_id ||
    p.scope === 'global' ||
    p.is_global === true

  return a2.filter(isSameOrGlobal)
}

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

/* ------------------------------- Items API ------------------------------ */
export const createPlaylistItem = (playlistId, formOrData) => {
  let data = formOrData
  if (!(formOrData instanceof FormData)) {
    const fd = new FormData()
    Object.entries(formOrData || {}).forEach(([k, v]) => v != null && fd.append(k, v))
    data = fd
  }
  return request({ url: `/playlists/${playlistId}/items`, method: 'post', data })
}

export const updatePlaylistItem = (playlistId, itemId, data) =>
  request({ url: `/playlists/${playlistId}/items/${itemId}`, method: 'patch', data })

export const deletePlaylistItem = (playlistId, itemId) =>
  request({ url: `/playlists/${playlistId}/items/${itemId}`, method: 'delete' })

export const reorderPlaylistItems = (playlistId, data) =>
  request({ url: `/playlists/${playlistId}/items/reorder`, method: 'patch', data })

export const listPlaylistItems = (playlistId, params) =>
  request({ url: `/playlists/${playlistId}`, method: 'get', params })

/* --------------------------- Bulk screen assignment (Admin) --------------------------- */

/**
 * Assign playlist to selected screens
 * body: { playlist_id, screen_ids: [] }
 */
export const assignPlaylistToScreensAdmin = (data) =>
  request({ url: '/screens/playlist', method: 'patch', data })

/**
 * Assign playlist to all screens of a company
 * body: { playlist_id }
 */
export const assignPlaylistToCompanyScreensAdmin = (customerId, data) =>
  request({ url: `/companies/${customerId}/screens/playlist`, method: 'patch', data })

/**
 * Assign playlist to all screens globally
 * body: { playlist_id }
 */
export const assignPlaylistToAllScreensAdmin = (data) =>
  request({ url: '/screens/playlist/all', method: 'patch', data })

/**
 * Broadcast updated config to selected screens
 * body: { screen_ids: [] } OR { all: true }
 */
export const broadcastScreensConfigAdmin = (data) =>
  request({ url: '/screens/broadcast-config', method: 'post', data })

/**
 * Broadcast updated config to all screens in a company
 */
export const broadcastCompanyConfigAdmin = (customerId) =>
  request({ url: `/companies/${customerId}/broadcast-config`, method: 'post' })
