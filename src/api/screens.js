// src/api/screens.js
import request from '@/utils/request'

export const listScreens = (params) =>
  request({ url: '/screens', method: 'get', params })

export const getScreen = (id) =>
  request({ url: `/screens/${id}`, method: 'get' })

export const setScreenPlaylist = (id, data) =>
  request({ url: `/screens/${id}/playlist`, method: 'patch', data })

export const refreshScreen = (id) =>
  request({ url: `/screens/${id}/refresh`, method: 'post' })
