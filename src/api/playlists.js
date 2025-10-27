// src/api/playlists.js
import request from '@/utils/request'

/* ------------------------------- Helpers ------------------------------- */

// Normalize common API response shapes to a flat array:
//   [ ... ]  OR  { data:[ ... ] }  OR  { data:{ data:[ ... ] } }
const pluckList = (resp) => {
  const root = resp && resp.data ? resp.data : resp
  if (Array.isArray(root)) return root
  if (root && Array.isArray(root.data)) return root.data
  if (root && root.data && Array.isArray(root.data.data)) return root.data.data
  return []
}

/* --------------------------- Playlists (CRUD) --------------------------- */

// List playlists (accepts params like customer_id, page/per_page, etc.)
export const listPlaylists = (params) =>
  request({ url: '/playlists', method: 'get', params })

// Try by customer; if backend ignores/errs, fallback to all; then filter client-side.
export async function listPlaylistsForCustomer(customer_id) {
  try {
    const r1 = await listPlaylists({ customer_id, per_page: 500 })
    const a1 = pluckList(r1)
    if (a1.length) return a1
  } catch (_) {
    // ignore and try fallback
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

// Show one playlist (includes items)
export const showPlaylist = (id) =>
  request({ url: `/playlists/${id}`, method: 'get' })

// Create playlist
export const createPlaylist = (data) =>
  request({ url: '/playlists', method: 'post', data })

// Update playlist
export const updatePlaylist = (id, data) =>
  request({ url: `/playlists/${id}`, method: 'patch', data })

// Delete playlist
export const deletePlaylist = (id) =>
  request({ url: `/playlists/${id}`, method: 'delete' })

// Publish playlist
export const publishPlaylist = (id) =>
  request({ url: `/playlists/${id}/publish`, method: 'post' })

// Set as default
export const setDefaultPlaylist = (id) =>
  request({ url: `/playlists/${id}/default`, method: 'post' })

// Refresh content_version
export const refreshPlaylistVersion = (id) =>
  request({ url: `/playlists/${id}/refresh`, method: 'post' })

/* ------------------------------- Items API ------------------------------ */

// Add item (file or URL). You can pass a FormData directly, or a POJO and we’ll wrap it.
export const createPlaylistItem = (playlistId, formOrData) => {
  let data = formOrData
  let headers
  if (!(formOrData instanceof FormData)) {
    const fd = new FormData()
    Object.entries(formOrData || {}).forEach(([k, v]) => v != null && fd.append(k, v))
    data = fd
    headers = { 'Content-Type': 'multipart/form-data' }
  }
  return request({ url: `/playlists/${playlistId}/items`, method: 'post', data, headers })
}

// Update item
export const updatePlaylistItem = (playlistId, itemId, data) =>
  request({ url: `/playlists/${playlistId}/items/${itemId}`, method: 'patch', data })

// Delete item
export const deletePlaylistItem = (playlistId, itemId) =>
  request({ url: `/playlists/${playlistId}/items/${itemId}`, method: 'delete' })

// Reorder items: data = { order: [id1, id2, ...] }
export const reorderPlaylistItems = (playlistId, data) =>
  request({ url: `/playlists/${playlistId}/items/reorder`, method: 'patch', data })

/* -------------- Optional alias used by some views ----------------------- */

// Harmless alias to showPlaylist (kept for compatibility)
export const listPlaylistItems = (playlistId, params) =>
  request({ url: `/playlists/${playlistId}`, method: 'get', params })
