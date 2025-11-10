<template>
  <div :class="{'show':show}" class="header-search">
    <svg-icon class-name="search-icon" icon-class="search" @click.stop="click" />

    <el-select
      ref="headerSearchSelect"
      v-model="search"
      :remote-method="querySearch"
      filterable
      default-first-option
      remote
      :placeholder="$t ? $t('app.search') : 'Search'"
      class="header-search-select"
      @change="change"
    >
      <el-option v-for="item in options" :key="item.path" :value="item" :label="item.title.join(' > ')" />
    </el-select>

    <!-- language buttons -->
    <div class="header-lang">
      <button
        class="lang-btn"
        :class="{ active: currentLocale === 'ar' }"
        aria-label="Arabic"
        title="العربية"
        @click.stop="switchTo('ar')"
      >ع</button>

      <button
        class="lang-btn"
        :class="{ active: currentLocale === 'en' }"
        aria-label="English"
        title="English"
        @click.stop="switchTo('en')"
      >EN</button>
    </div>
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
      return (this.$i18n && this.$i18n.locale) ? this.$i18n.locale : (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) || 'ar'
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

      // If you need to toggle other UI libs (Vuetify etc), do it here:
      // if (this.$vuetify) this.$vuetify.rtl = (locale === 'ar')
    }
  }
}
</script>

<style lang="scss" scoped>
.header-search {
  font-size: 0 !important;
  display: inline-flex;
  align-items: center;
  gap: 8px;

  .search-icon {
    cursor: pointer;
    font-size: 18px;
    vertical-align: middle;
  }

  .header-search-select {
    font-size: 18px;
    transition: width 0.2s;
    width: 0;
    overflow: hidden;
    background: transparent;
    border-radius: 0;
    display: inline-block;
    vertical-align: middle;

    ::v-deep .el-input__inner {
      border-radius: 0;
      border: 0;
      padding-left: 0;
      padding-right: 0;
      box-shadow: none !important;
      border-bottom: 1px solid #d9d9d9;
      vertical-align: middle;
    }
  }

  &.show {
    .header-search-select {
      width: 210px;
      margin-left: 10px;
    }
  }

  /* language buttons */
  .header-lang {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    margin-left: 8px;
  }

  .lang-btn {
    border: 0;
    background: transparent;
    padding: 4px 8px;
    cursor: pointer;
    font-weight: 600;
    border-radius: 4px;
    font-size: 13px;
  }

  .lang-btn.active {
    text-decoration: underline;
    color: var(--el-color-primary, #409EFF);
  }

  /* if page is RTL, move the search box margins to look good */
  html[dir="rtl"] &.show .header-search-select {
    margin-left: 0;
    margin-right: 10px;
  }
}
</style>
