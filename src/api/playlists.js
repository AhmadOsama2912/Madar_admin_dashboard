// src/api/playlists.js
import request from '@/utils/request'

// List playlists
export function listPlaylists(params) {
  return request({
    url: '/playlists',
    method: 'get',
    params
  })
}

// Show one playlist (includes items)
export function showPlaylist(id) {
  return request({
    url: `/playlists/${id}`,
    method: 'get'
  })
}

// Create playlist
export function createPlaylist(data) {
  return request({
    url: '/playlists',
    method: 'post',
    data
  })
}

// Update playlist (rename, etc.)
export function updatePlaylist(id, data) {
  return request({
    url: `/playlists/${id}`,
    method: 'patch',
    data
  })
}

// Delete playlist
export function deletePlaylist(id) {
  return request({
    url: `/playlists/${id}`,
    method: 'delete'
  })
}

// Publish playlist
export function publishPlaylist(id) {
  return request({
    url: `/playlists/${id}/publish`,
    method: 'post'
  })
}

// Refresh content_version
export function refreshPlaylistVersion(id) {
  return request({
    url: `/playlists/${id}/refresh`,
    method: 'post'
  })
}

// -------- Items --------

// Add item (file or URL)
// Accepts FormData with fields: type (image|video), file? or src, duration? (for images)
export function createPlaylistItem(playlistId, formData) {
  return request({
    url: `/playlists/${playlistId}/items`,
    method: 'post',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// Update item (e.g., duration)
export function updatePlaylistItem(playlistId, itemId, data) {
  return request({
    url: `/playlists/${playlistId}/items/${itemId}`,
    method: 'patch',
    data
  })
}

// Delete item
export function deletePlaylistItem(playlistId, itemId) {
  return request({
    url: `/playlists/${playlistId}/items/${itemId}`,
    method: 'delete'
  })
}

// Reorder items
export function reorderPlaylistItems(playlistId, data) {
  // data = { order: [ids...] }
  return request({
    url: `/playlists/${playlistId}/items/reorder`,
    method: 'patch',
    data
  })
}

// (Optional) If another view imported this by mistake:
export function listPlaylistItems(playlistId, params) {
  // Not required by this page, but included to silence imports elsewhere.
  // Prefer showPlaylist(playlistId) instead, which returns items.
  return request({
    url: `/playlists/${playlistId}`,
    method: 'get',
    params
  })
}
