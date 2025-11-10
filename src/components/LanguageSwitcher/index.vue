<template>
  <div class="lang-switcher" role="navigation" aria-label="Language switcher">
    <button
      :class="{ active: current === 'ar' }"
      aria-pressed="false"
      title="العربية"
      @click="switchTo('ar')"
    >ع</button>

    <button
      :class="{ active: current === 'en' }"
      aria-pressed="false"
      title="English"
      @click="switchTo('en')"
    >EN</button>
  </div>
</template>

<script>
export default {
  name: 'LanguageSwitcher',
  computed: {
    current() {
      return this.$i18n.locale
    }
  },
  methods: {
    switchTo(locale) {
      if (this.$i18n.locale === locale) return
      this.$i18n.locale = locale
      // i18n watcher handles localStorage and direction
    }
  }
}
</script>

<style scoped>
.lang-switcher {
  display: inline-flex;
  gap: 6px;
  align-items: center;
}
.lang-switcher button {
  border: 0;
  background: transparent;
  padding: 6px 10px;
  cursor: pointer;
  font-weight: 600;
  border-radius: 6px;
}
.lang-switcher button.active {
  text-decoration: underline;
  outline: none;
}
</style>
