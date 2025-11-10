import Vue from 'vue'
import VueI18n from 'vue-i18n'

Vue.use(VueI18n)

import en from './locales/en.json'
import ar from './locales/ar.json'

const STORAGE_KEY = 'madar_locale'
const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
const defaultLocale = saved || 'ar' // Arabic as default

const i18n = new VueI18n({
  locale: defaultLocale,
  fallbackLocale: 'en',
  silentTranslationWarn: true,
  messages: { en, ar }
})

function applyDirection(locale) {
  const dir = locale === 'ar' ? 'rtl' : 'ltr'
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.setAttribute('dir', dir)
    document.documentElement.setAttribute('lang', locale)
  }
  if (typeof document !== 'undefined' && document.body) {
    document.body.classList.remove('rtl', 'ltr')
    document.body.classList.add(dir)
  }
}

applyDirection(defaultLocale)

// Watch locale changes safely
i18n.vmWatcher = new Vue({
  i18n,
  watch: {
    '$i18n.locale'(newLocale) {
      try {
        localStorage.setItem(STORAGE_KEY, newLocale)
      } catch (e) {
        console.error('Failed to save locale to localStorage:', e)
      }
      applyDirection(newLocale)
    }
  }
})

export default i18n
