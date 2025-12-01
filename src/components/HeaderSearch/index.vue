<template>
  <div class="header-search">
    <!-- Language dropdown -->
    <el-dropdown trigger="click" @command="switchTo">
      <span class="lang-trigger">
        <span class="lang-icon">🌐</span>
        <span class="lang-text">{{ currentLocaleLabel }}</span>
        <i class="el-icon-arrow-down lang-caret" />
      </span>
      <el-dropdown-menu slot="dropdown">
        <el-dropdown-item
          v-for="item in langOptions"
          :key="item.value"
          :command="item.value"
          :disabled="item.value === currentLocale"
        >
          <div class="lang-option">
            <span class="lang-option-native">{{ item.native }}</span>
            <span class="lang-option-code">{{ item.code }}</span>
          </div>
        </el-dropdown-item>
      </el-dropdown-menu>
    </el-dropdown>
  </div>
</template>

<script>
// fuse is a lightweight fuzzy-search module
// make search results more in line with expectations
import Fuse from 'fuse.js'
import path from 'path'

const STORAGE_KEY = 'madar_locale'

export default {
  name: 'HeaderSearch',
  data() {
    return {
      search: '',
      options: [],
      searchPool: [],
      show: false,
      fuse: undefined
    }
  },
  computed: {
    routes() {
      return this.$store.getters.permission_routes
    },
    currentLocale() {
      // fallback to 'ar' if i18n isn't available for some reason
      return (this.$i18n && this.$i18n.locale)
        ? this.$i18n.locale
        : (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) || 'ar'
    },
    // اللغات المتاحة
    langOptions() {
      return [
        { value: 'ar', native: 'العربية', code: 'AR' },
        { value: 'en', native: 'English', code: 'EN' }
      ]
    },
    // النص اللي بيظهر في الـ trigger (حسب اللغة الحالية)
    currentLocaleLabel() {
      const found = this.langOptions.find(l => l.value === this.currentLocale)
      return found ? found.native : this.currentLocale
    }
  },
  watch: {
    routes() {
      this.searchPool = this.generateRoutes(this.routes)
    },
    searchPool(list) {
      this.initFuse(list)
    },
    show(value) {
      if (value) {
        document.body.addEventListener('click', this.close)
      } else {
        document.body.removeEventListener('click', this.close)
      }
    }
  },
  mounted() {
    this.searchPool = this.generateRoutes(this.routes)
  },
  methods: {
    click() {
      this.show = !this.show
      if (this.show) {
        this.$refs.headerSearchSelect && this.$refs.headerSearchSelect.focus()
      }
    },
    close() {
      this.$refs.headerSearchSelect && this.$refs.headerSearchSelect.blur()
      this.options = []
      this.show = false
    },
    change(val) {
      this.$router.push(val.path)
      this.search = ''
      this.options = []
      this.$nextTick(() => {
        this.show = false
      })
    },
    initFuse(list) {
      this.fuse = new Fuse(list, {
        shouldSort: true,
        threshold: 0.4,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 1,
        keys: [{
          name: 'title',
          weight: 0.7
        }, {
          name: 'path',
          weight: 0.3
        }]
      })
    },
    // Filter out the routes that can be displayed in the sidebar
    // And generate the internationalized title
    generateRoutes(routes, basePath = '/', prefixTitle = []) {
      let res = []

      for (const router of routes) {
        // skip hidden router
        if (router.hidden) { continue }

        const data = {
          path: path.resolve(basePath, router.path),
          title: [...prefixTitle]
        }

        if (router.meta && router.meta.title) {
          data.title = [...data.title, router.meta.title]

          if (router.redirect !== 'noRedirect') {
            // only push the routes with title
            // special case: need to exclude parent router without redirect
            res.push(data)
          }
        }

        // recursive child routes
        if (router.children) {
          const tempRoutes = this.generateRoutes(router.children, data.path, data.title)
          if (tempRoutes.length >= 1) {
            res = [...res, ...tempRoutes]
          }
        }
      }
      return res
    },
    querySearch(query) {
      if (query !== '') {
        this.options = this.fuse.search(query)
      } else {
        this.options = []
      }
    },

    // Language switching
    switchTo(locale) {
      if (!locale) return
      if (this.$i18n) {
        // change vue-i18n locale
        this.$i18n.locale = locale
      }
      try {
        localStorage.setItem(STORAGE_KEY, locale)
      } catch (e) { /* ignore */ }

      // immediately set document dir/lang and body class so layout flips instantly
      try {
        const dir = locale === 'ar' ? 'rtl' : 'ltr'
        if (typeof document !== 'undefined' && document.documentElement) {
          document.documentElement.setAttribute('dir', dir)
          document.documentElement.setAttribute('lang', locale)
        }
        if (typeof document !== 'undefined' && document.body) {
          document.body.classList.remove('rtl', 'ltr')
          document.body.classList.add(dir)
        }
      } catch (e) {
        console.error('Failed to set document language attributes', e)
      }

      // لو حابب تعمل refresh كامل عشان تضمن كل شيء ينقلب RTL/LTR:
      // window.location.reload()
    }
  }
}
</script>

<style lang="scss" scoped>
.header-search {
  display: inline-flex;
  align-items: center;
  font-size: 0; // نخلي العناصر الداخلية تتحكم بالـ font-size
}

/* زر تغيير اللغة (trigger) */
.lang-trigger {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid #dcdfe6;
  background-color: #fff;
  cursor: pointer;
  font-size: 13px;
  color: #606266;
  transition: all .2s;
  box-shadow: 0 1px 3px rgba(0,0,0,.04);
}

.lang-trigger:hover {
  border-color: #c0c4cc;
  box-shadow: 0 2px 6px rgba(0,0,0,.08);
}

.lang-icon {
  font-size: 14px;
  margin-right: 6px;
}

.lang-text {
  font-weight: 500;
}

.lang-caret {
  font-size: 12px;
  margin-left: 4px;
  color: #909399;
}

/* عناصر القائمة داخل الـ dropdown */
.lang-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-width: 120px;
}

.lang-option-native {
  font-size: 13px;
}

.lang-option-code {
  font-size: 11px;
  color: #909399;
}
</style>
