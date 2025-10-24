<template>
  <div class="app-container">
    <!-- Screen header -->
    <el-card shadow="never" class="mb-2">
      <div class="header">
        <h3>Screen #{{ sId }} — {{ sSerial }}</h3>
        <el-tag :type="sOnline ? 'success' : 'info'">{{ sOnline ? 'Online' : 'Offline' }}</el-tag>
      </div>
      <div class="meta">
        <div><b>Customer:</b> {{ sCustomerName }}</div>
        <div><b>Device:</b> {{ sDevice }}</div>
        <div><b>OS:</b> {{ sOS }}</div>
        <div><b>App:</b> {{ sApp }}</div>
        <div><b>Last check-in:</b> {{ sLastSeen }}</div>
      </div>
    </el-card>

    <!-- Assign / sync content -->
    <el-card shadow="never">
      <div class="panel-head">
        <h3>Content</h3>
        <el-button @click="$router.push('/content/playlists')">Open Playlists</el-button>
      </div>

      <div class="assign">
        <el-select v-model="state.playlistId" filterable placeholder="Select playlist" style="width:320px">
          <el-option :value="null" label="(Follow company default)" />
          <el-option v-for="p in playlists" :key="p.id" :label="p.name" :value="p.id" />
        </el-select>
        <el-button type="primary" class="ml-1" :loading="busy.save" @click="save">Save</el-button>
        <el-button class="ml-1" :loading="busy.refresh" @click="refresh">Refresh</el-button>
      </div>

      <el-alert
        title="Changes take effect immediately via WebSocket when the player is connected."
        type="info"
        show-icon
      />
    </el-card>
  </div>
</template>

<script>
import { getScreen, setScreenPlaylist, refreshScreen } from '@/api/screens'
import { listPlaylists } from '@/api/playlists'

export default {
  name: 'ScreenShow',
  data() {
    return {
      screen: null,
      playlists: [],
      state: { playlistId: null },
      busy: { save: false, refresh: false }
    }
  },
  computed: {
    // Safe getters for template (no optional chaining in Vue 2 templates)
    sId() { return this.screen && this.screen.id ? this.screen.id : '-' },
    sSerial() { return this.screen && this.screen.serial_number ? this.screen.serial_number : '-' },
    sOnline() { return !!(this.screen && (this.screen.online || this.screen.is_online)) },
    sCustomerName() {
      if (!this.screen) return '-'
      return this.screen.customer_name || (this.screen.customer_id ? ('#' + this.screen.customer_id) : '-')
    },
    sDevice() { return this.screen && this.screen.device_model ? this.screen.device_model : '-' },
    sOS() { return this.screen && this.screen.os_version ? this.screen.os_version : '-' },
    sApp() { return this.screen && this.screen.app_version ? this.screen.app_version : '-' },
    sLastSeen() { return this.screen && this.screen.last_check_in_at ? this.screen.last_check_in_at : '-' }
  },
  async created() {
    const id = Number(this.$route.params.id)
    await this.loadScreen(id)
    if (this.screen && this.screen.customer_id) {
      await this.loadPlaylists(this.screen.customer_id)
    }
  },
  methods: {
    async loadScreen(id) {
      const res = await getScreen(id)
      const s = (res && res.data) ? res.data : res
      this.screen = s || null
      this.state.playlistId = this.screen && typeof this.screen.playlist_id !== 'undefined'
        ? this.screen.playlist_id
        : null
    },
    async loadPlaylists(customerId) {
      const res = await listPlaylists({ customer_id: customerId, per_page: 200 })
      const root = (res && res.data) ? res.data : res
      this.playlists = (root && (root.data || root)) || []
    },
    async save() {
      if (!this.screen) return
      this.busy.save = true
      try {
        await setScreenPlaylist(this.screen.id, { playlist_id: this.state.playlistId })
        this.$message.success('Saved')
      } finally { this.busy.save = false }
    },
    async refresh() {
      if (!this.screen) return
      this.busy.refresh = true
      try {
        await refreshScreen(this.screen.id)
        this.$message.success('Refresh sent')
      } finally { this.busy.refresh = false }
    }
  }
}
</script>

<style scoped>
.mb-2{margin-bottom:12px}
.header{display:flex;align-items:center;gap:12px}
.meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;margin-top:8px}
.panel-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.assign{display:flex;align-items:center}
.ml-1{margin-left:8px}
</style>
