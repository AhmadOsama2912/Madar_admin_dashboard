<template>
  <div
    :class="['sidebar-wrapper', isRTL ? 'rtl' : 'ltr', { 'has-logo': showLogo }]"
    :dir="isRTL ? 'rtl' : 'ltr'"
  >
    <logo v-if="showLogo" :collapse="isCollapse" />
    <el-scrollbar wrap-class="scrollbar-wrapper">
      <el-menu
        class="madar-el-menu"
        :default-active="activeMenu"
        :collapse="isCollapse"
        :background-color="variables.menuBg"
        :text-color="variables.menuText"
        :unique-opened="false"
        :active-text-color="variables.menuActiveText"
        :collapse-transition="false"
        mode="vertical"
      >
        <sidebar-item
          v-for="route in translatedRoutes"
          :key="route.path"
          :item="route"
          :base-path="route.path"
          :rtl="isRTL"
        />
      </el-menu>
    </el-scrollbar>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import Logo from './Logo'
import SidebarItem from './SidebarItem'
import variables from '@/styles/variables.scss'

const STORAGE_KEY = 'madar_locale'

export default {
  name: 'Sidebar',
  components: { SidebarItem, Logo },
  computed: {
    ...mapGetters(['permission_routes', 'sidebar']),
    activeMenu() {
      return this.$route.meta.activeMenu || this.$route.path
    },
    showLogo() {
      return this.$store.state.settings.sidebarLogo
    },
    variables() {
      return variables
    },
    isCollapse() {
      return !this.sidebar.opened
    },
    isRTL() {
      if (this.$i18n && this.$i18n.locale) return this.$i18n.locale === 'ar'
      if (typeof window !== 'undefined') {
        return (localStorage.getItem(STORAGE_KEY) || 'ar') === 'ar'
      }
      return true
    },

    // produce a translated copy of permission_routes (non-mutating)
    translatedRoutes() {
      const routes = this.permission_routes || []

      const translateKey = (key) => {
        if (!key || typeof key !== 'string') return null
        if (this.$i18n && this.$i18n.te && this.$i18n.te(key)) {
          const t = this.$t(key)
          if (typeof t === 'string' && t !== key && t.trim() !== '') return t
        }
        // try some fallbacks
        const candidates = [`${key}.root`, `${key}.title`]
        const last = key.split('.').pop()
        if (last) candidates.push(`routes.${last}`, `app.menu.${last}`, `app.menu.${last.toLowerCase()}`)
        for (const c of candidates) {
          if (this.$i18n && this.$i18n.te && this.$i18n.te(c)) {
            const t2 = this.$t(c)
            if (typeof t2 === 'string' && t2 !== c && t2.trim() !== '') return t2
          }
        }
        return null
      }

      const mapRoute = (r) => {
        const copy = { ...r, meta: { ...(r.meta || {}) }}
        if (copy.meta && copy.meta.title) {
          const translated = translateKey(copy.meta.title)
          if (translated) copy.meta.title = translated
          else if (typeof copy.meta.title === 'string' && copy.meta.title.includes('.')) {
            copy.meta.title = copy.name || copy.meta.title.split('.').pop()
          }
        } else if (copy.name) {
          const guess = `app.menu.${(copy.name || '').toLowerCase()}`
          if (this.$i18n && this.$i18n.te && this.$i18n.te(guess)) {
            copy.meta.title = this.$t(guess)
          }
        }
        if (Array.isArray(r.children) && r.children.length) {
          copy.children = r.children.map(mapRoute)
        }
        return copy
      }

      return routes.map(mapRoute)
    }
  }
}
</script>

<style scoped lang="scss">
.sidebar-wrapper {
  width: 240px;
  min-width: 64px;
  box-sizing: border-box;

  &.has-logo {
    .scrollbar-wrapper { padding-top: 8px; }
  }

  .madar-el-menu { padding: 0; }

  /* Make menu items a predictable flex row so spacing is reliable */
  .el-menu-item,
  .el-submenu__title {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    box-sizing: border-box;
    white-space: nowrap;
  }

  .el-menu-item i,
  .el-submenu__title i {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    line-height: 18px;
  }

  .el-menu-item span,
  .el-submenu__title span {
    display: inline-block;
    overflow: hidden;
    text-overflow: ellipsis;
    vertical-align: middle;
  }

  /* LTR specifics */
  &.ltr {
    direction: ltr;

    .el-menu-item,
    .el-submenu__title {
      flex-direction: row; /* icon then label */
    }

    .el-menu--collapse {
      width: 64px !important;
      .el-menu-item,
      .el-submenu__title {
        justify-content: center;
        gap: 0;
      }
      .el-menu-item span,
      .el-submenu__title span { display: none; }
    }
  }

  /* RTL specifics */
  &.rtl {
    direction: rtl;

    .el-menu-item,
    .el-submenu__title {
      flex-direction: row-reverse; /* label then icon visually */
      gap: 6px; /* small balanced gap in RTL */
    }

    /* ensure float-based margins don't interfere */
    .el-menu-item i,
    .el-submenu__title i {
      margin: 0 !important;
    }

    /* <-- HERE: add 6px margin to the right of the span in RTL as requested */
    .el-menu-item span,
    .el-submenu__title span {
      text-align: right;
      margin-right: 6px;
      display: inline-block;
    }

    .el-menu--collapse {
      width: 64px !important;
      .el-menu-item,
      .el-submenu__title {
        justify-content: center;
        gap: 0;
        flex-direction: column;
      }
      .el-menu-item span,
      .el-submenu__title span { display: none; }
    }
  }

  /* Submenu popper cleanup */
  .el-submenu__popper {
    padding: 0 !important;
    .el-menu { margin: 0; }
  }

  /* Scrollbar height */
  .scrollbar-wrapper {
    height: calc(100vh - 16px);
    box-sizing: border-box;
    padding-bottom: 8px;
  }

  /* caret / arrow tweak */
  .el-submenu__title .el-submenu__icon-arrow {
    margin-left: 6px;
    margin-right: 6px;
  }
}

/* small responsive tweak */
@media (max-height: 600px) {
  .sidebar-wrapper .scrollbar-wrapper { height: 100vh; }
}
</style>
