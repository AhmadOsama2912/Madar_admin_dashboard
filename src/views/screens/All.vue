<template>
  <div class="app-container">
    <!-- Filters -->
    <el-card shadow="never" class="mb-3">
      <div class="filters">
        <el-select v-model="ui.customerId" placeholder="Customer" clearable filterable style="width:260px" class="mr-2">
          <el-option v-for="c in customers" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
        <el-input v-model="ui.serial" placeholder="Serial number" clearable class="mr-2" style="max-width:220px" />
        <el-select v-model="ui.online" placeholder="Status" clearable class="mr-2" style="width:160px">
          <el-option :value="'1'" label="Online" />
          <el-option :value="'0'" label="Offline" />
        </el-select>
        <el-date-picker
          v-model="ui.range"
          type="daterange"
          range-separator="–"
          start-placeholder="Registered from"
          end-placeholder="to"
          class="mr-2"
          style="width:340px"
        />
        <el-select v-model="ui.sortKey" placeholder="Sort by" class="mr-2" style="width:180px">
          <el-option label="Created" value="created_at" />
          <el-option label="Serial" value="serial_number" />
          <el-option label="ID" value="id" />
        </el-select>
        <el-select v-model="ui.sortDir" placeholder="Dir" class="mr-2" style="width:130px">
          <el-option label="Desc" value="desc" />
          <el-option label="Asc" value="asc" />
        </el-select>
        <el-button type="primary" icon="el-icon-search" @click="fetch">Filter</el-button>
        <el-button class="ml-1" @click="resetFilters">Reset</el-button>
        <div class="flex-spacer" />
        <el-button icon="el-icon-refresh" :loading="loading" @click="fetch">Refresh</el-button>
      </div>
    </el-card>
    <!-- Cards grid -->
    <el-row :gutter="16">
      <template v-if="rows.length">
        <el-col v-for="tv in rows" :key="tv.id" :xs="24" :sm="12" :md="8" :lg="6">
          <div class="card-click" @click="openDetails(tv)">
            <el-card class="tv-card" shadow="hover" body-style="{padding:'0'}">
              <!-- Content Playlist chip -->
              <div v-if="tv.content_playlist_name || tv.content_playlist_id" class="chip">
                <i class="el-icon-video-camera" />
                <span>{{ tv.content_playlist_name || ('#'+tv.content_playlist_id) }}</span>
              </div>
              <!-- Mock TV -->
              <div class="tv-mock">
                <div class="led" :class="tv.is_online ? 'on' : 'off'" />
                <div class="glass">
                  <div class="customer-name">{{ tv.customer_name }}</div>
                  <div class="serial">{{ tv.serial_number }}</div>
                </div>
              </div>
              <!-- Meta -->
              <div class="meta">
                <div class="line"><i class="el-icon-s-home" /> {{ tv.customer_name || ('#'+tv.customer_id) }}</div>
                <div class="line"><i class="el-icon-cpu" /> {{ tv.device_model || '-' }}</div>
                <div class="line"><i class="el-icon-time" /> Last seen: {{ human(tv.last_check_in_at) }}</div>
                <div class="line"><i class="el-icon-timer" /> License: {{ licenseText(tv.license) }}</div>
              </div>
              <!-- Footer -->
              <div class="footer">
                <el-tag :type="tv.is_online ? 'success' : 'info'">{{ tv.is_online ? 'Online' : 'Offline' }}</el-tag>
                <span class="spacer" />
                <el-tooltip content="Copy serial">
                  <el-button type="text" icon="el-icon-document-copy" @click.stop="copy(tv.serial_number)" />
                </el-tooltip>
              </div>
            </el-card>
          </div>
        </el-col>
      </template>
      <template v-else>
        <el-col :span="24">
          <el-empty description="No TVs yet">
            <div class="mt-1">Create an enrollment code and register your first TV.</div>
            <router-link to="/tvs/enrollment-codes">
              <el-button type="primary" class="mt-1">Create Enrollment Code</el-button>
            </router-link>
          </el-empty>
        </el-col>
      </template>
    </el-row>
    <!-- Pagination -->
    <div v-if="total > q.per_page" class="pagination">
      <el-pagination
        background
        layout="prev, pager, next, total"
        :current-page.sync="q.page"
        :page-size="q.per_page"
        :total="total"
        @current-change="fetch"
      />
    </div>
    <!-- Drawer -->
    <el-drawer
      :visible.sync="drawer.open"
      title="TV Details"
      size="420px"
      direction="rtl"
      :with-header="true"
      :append-to-body="true"
    >
      <template v-if="drawer.tv">
        <el-card shadow="never" class="mb12">
          <template #header><div class="card-hdr">TV Information</div></template>
          <div class="kv"><b>ID</b><span>{{ drawer.tv.id }}</span></div>
          <div class="kv"><b>Customer</b><span>{{ drawer.tv.customer_id }}</span></div>
          <div class="kv"><b>Serial</b><span>{{ drawer.tv.serial_number }}</span></div>
          <div class="kv"><b>Model</b><span>{{ drawer.tv.device_model || '—' }}</span></div>
          <div class="kv"><b>OS</b><span>{{ drawer.tv.os_version || '—' }}</span></div>
          <div class="kv"><b>App</b><span>{{ drawer.tv.app_version || '—' }}</span></div>
          <div class="kv"><b>Status</b>
            <el-tag :type="drawer.isOnline ? 'success' : 'info'">{{ drawer.isOnline ? 'Online' : 'Offline' }}</el-tag>
          </div>
          <div class="kv"><b>Last seen</b><span>{{ human(drawer.tv.last_check_in_at) }}</span></div>
        </el-card>
        <el-card shadow="never" class="mb12">
          <template #header><div class="card-hdr">Content Management</div></template>
          <div class="kv">
            <b>Current Playlist</b>
            <span>{{ drawer.currentPlaylistName || '—' }}</span>
          </div>
          <div class="kv">
            <b>Assign Playlist</b>
            <el-select
              v-model="drawer.selectedPlaylistId"
              placeholder="Select content playlist"
              filterable
              style="width:100%"
              :loading="drawer.loadingPl"
              :disabled="!drawer.playlists.length"
              no-data-text="No playlists available"
            >
              <el-option v-for="p in drawer.playlists" :key="p.id" :label="p.name" :value="p.id" />
            </el-select>
          </div>
          <div class="actions">
            <el-button type="success" :disabled="!drawer.selectedPlaylistId" :loading="drawer.assigning" @click="assign(true)">Assign & Push</el-button>
          </div>
          <div class="mt-2">
            <el-button type="primary" icon="el-icon-plus" @click="addContent">Add New Content</el-button>
            <el-button type="info" icon="el-icon-edit" @click="editContent">Edit Content</el-button>
          </div>
        </el-card>
      </template>
      <template v-else>
        <el-empty description="No TV selected" />
      </template>
    </el-drawer>
  </div>
</template>
<script>
import { listScreens as apiListTVs, setScreenPlaylist, refreshScreen } from '@/api/screens'
import { listCustomers } from '@/api/customers'
import { listPlaylists } from '@/api/playlists'

export default {
  name: 'TVManagementPage',
  data() {
    return {
      loading: false,
      rows: [],
      total: 0,
      q: { page: 1, per_page: 20, sort_by: 'created_at', sort_dir: 'desc' },
      ui: {
        customerId: null,
        serial: '',
        online: null,
        range: null,
        sortKey: 'created_at',
        sortDir: 'desc'
      },
      customers: [],
      drawer: {
        open: false,
        tv: null,
        isOnline: false,
        currentPlaylistName: '',
        playlists: [],
        loadingPl: false,
        selectedPlaylistId: null,
        assigning: false
      }
    }
  },
  created() {
    this.loadCustomers()
    this.fetch()
  },
  methods: {
    async loadCustomers() {
      try {
        const res = await listCustomers({ page: 1, per_page: 100 })
        const payload = res && res.data ? res.data : res
        this.customers = (payload && Array.isArray(payload.data)) ? payload.data
          : Array.isArray(payload) ? payload : []
      } catch (_) {
        this.customers = []
      }
    },
    buildParams() {
      const allowedSort = ['created_at', 'serial_number', 'id']
      const sortBy = allowedSort.includes(this.ui.sortKey) ? this.ui.sortKey : 'created_at'
      const sortDir = (this.ui.sortDir === 'asc' || this.ui.sortDir === 'desc') ? this.ui.sortDir : 'desc'
      const p = {
        page: this.q.page,
        per_page: Math.min(Math.max(this.q.per_page || 20, 1), 100),
        sort_by: sortBy,
        sort_dir: sortDir
      }
      if (this.ui.customerId) p.customer_id = this.ui.customerId
      if (this.ui.serial) p.serial = this.ui.serial
      if (this.ui.online === '1' || this.ui.online === '0') p.online = this.ui.online
      if (this.ui.range && this.ui.range.length === 2) {
        p.registered_from = this.toYmd(this.ui.range[0])
        p.registered_to = this.toYmd(this.ui.range[1])
      }
      return p
    },
    async fetch() {
      this.loading = true
      try {
        const params = this.buildParams()
        const res = await apiListTVs(params)
        const root = res && res.data ? res.data : res
        const rows = Array.isArray(root) ? root
          : Array.isArray(root && root.data) ? root.data
            : Array.isArray(root && root.data && root.data.data) ? root.data.data
              : []
        this.rows = rows.map(r => ({
          id: r.id,
          customer_id: r.customer_id,
          customer_name: r.customer_name,
          serial_number: r.serial_number,
          device_model: r.device_model,
          os_version: r.os_version,
          app_version: r.app_version,
          content_playlist_id: r.playlist_id,
          content_playlist_name: r.playlist_name,
          last_check_in_at: r.last_check_in_at || r.last_heartbeat_at,
          created_at: r.created_at,
          is_online: !!(r.online ?? (r.last_check_in_at && new Date(r.last_check_in_at) > new Date(Date.now() - 5 * 60 * 1000))),
          license: r.license || null
        }))
        const meta = (root && root.meta) || (root && root.data && root.data.meta) || null
        this.total = meta && meta.total != null ? Number(meta.total) : this.rows.length
      } finally {
        this.loading = false
      }
    },
    resetFilters() {
      this.q.page = 1
      this.q.per_page = 20
      this.ui = { customerId: null, serial: '', online: null, range: null, sortKey: 'created_at', sortDir: 'desc' }
      this.fetch()
    },
    toYmd(d) {
      const x = new Date(d)
      return x.toISOString().slice(0, 10)
    },
    human(dt) {
      if (!dt) return '—'
      const x = new Date(dt)
      return x.toLocaleString()
    },
    licenseText(lic) {
      if (!lic) return '–'
      const exp = lic.expires_at ? new Date(lic.expires_at).toLocaleDateString() : '—'
      return `${lic.status || 'active'} (exp ${exp})`
    },
    copy(text) {
      navigator.clipboard.writeText(text)
      this.$message.success('Serial copied')
    },
    async openDetails(row) {
      const data = {
        id: row.id,
        customer_id: row.customer_id,
        serial_number: row.serial_number,
        device_model: row.device_model,
        os_version: row.os_version,
        app_version: row.app_version,
        last_check_in_at: row.last_check_in_at,
        playlist_id: row.content_playlist_id,
        playlist_name: row.content_playlist_name
      }
      this.drawer.tv = data
      this.drawer.isOnline = !!(data.last_check_in_at && new Date(data.last_check_in_at) > new Date(Date.now() - 5 * 60 * 1000))
      this.drawer.currentPlaylistName = data.playlist_name || (data.playlist_id ? `#${data.playlist_id}` : '')
      this.drawer.selectedPlaylistId = null
      this.drawer.open = true
      this.drawer.loadingPl = true
      try {
        let arr = []
        const rp1 = await listPlaylists({ customer_id: data.customer_id, per_page: 100 })
        arr = this._pluckList(rp1)
        if (!arr.length) {
          const rp2 = await listPlaylists({ per_page: 100 })
          arr = this._pluckList(rp2)
        }
        const isSameOrGlobal = (p) =>
          p.customer_id == null || p.customer_id === data.customer_id || p.scope === 'global' || p.is_global
        this.drawer.playlists = arr.filter(isSameOrGlobal)
      } catch (e) {
        console.error(e)
        this.drawer.playlists = []
        this.$message.error('Failed to load playlists')
      } finally {
        this.drawer.loadingPl = false
      }
    },
    _pluckList(resp) {
      const root = resp && resp.data ? resp.data : resp
      return Array.isArray(root) ? root
        : Array.isArray(root && root.data) ? root.data
          : Array.isArray(root && root.data && root.data.data) ? root.data.data
            : []
    },
    async assign(withPush) {
      if (!this.drawer.tv?.id || !this.drawer.selectedPlaylistId) return
      try {
        this.drawer.assigning = true
        await setScreenPlaylist(this.drawer.tv.id, { playlist_id: this.drawer.selectedPlaylistId })
        const picked = this.drawer.playlists.find(p => p.id === this.drawer.selectedPlaylistId)
        this.drawer.currentPlaylistName = picked ? picked.name : `#${this.drawer.selectedPlaylistId}`
        this.$message.success('Assigned successfully')
        if (withPush) {
          await refreshScreen(this.drawer.tv.id)
          this.$message.success('Realtime push sent')
        }
        const idx = this.rows.findIndex(r => r.id === this.drawer.tv.id)
        if (idx >= 0) {
          this.$set(this.rows, idx, {
            ...this.rows[idx],
            content_playlist_id: this.drawer.selectedPlaylistId,
            content_playlist_name: this.drawer.currentPlaylistName
          })
        }
      } catch (e) {
        console.error(e)
        this.$message.error(e?.response?.data?.message || 'Failed to assign')
      } finally {
        this.drawer.assigning = false
      }
    },
    addContent() {
      this.$message.info('Add new content functionality to be implemented')
    },
    editContent() {
      if (!this.drawer.selectedPlaylistId && !this.drawer.tv.playlist_id) {
        this.$message.warning('Select a playlist first')
        return
      }
      this.$message.info('Edit content functionality to be implemented')
    }
  }
}
</script>
<style scoped>
/* layout */
.mb-3 { margin-bottom: 12px; }
.filters { display: flex; align-items: center; flex-wrap: wrap; }
.mr-2 { margin-right: 8px; }
.ml-1 { margin-left: 8px; }
.flex-spacer { flex: 1; }
.pagination { margin-top: 12px; text-align: right; }
.mt-1 { margin-top: 8px; }
.mb12 { margin-bottom: 12px; }
.mt-2 { margin-top: 16px; }
.card-hdr { font-weight: 600; font-size: 16px; }
.kv { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
.kv b { color: #475569; font-weight: 500; }
.kv span { color: #1e293b; }
.actions { display: flex; gap: 8px; margin-top: 12px; justify-content: flex-end; }
/* Clickable wrapper */
.card-click { cursor: pointer; }
/* ---- Card styling (professional, clean, modern) ---- */
.tv-card { margin-bottom: 16px; position: relative; overflow: hidden; border-radius: 12px; border: 1px solid #e2e8f0; }
.chip {
  position: absolute; top: 12px; right: 12px; z-index: 2;
  display: flex; align-items: center; gap: 6px;
  background: rgba(255, 255, 255, .85); color: #334155; padding: 4px 12px; border-radius: 999px;
  font-size: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, .1); backdrop-filter: blur(4px);
}
.tv-mock {
  position: relative; background: linear-gradient(135deg, #f8fafc, #e2e8f0); height: 160px;
  box-shadow: inset 0 0 0 1px #cbd5e1; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
}
.glass {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  color: #475569; font-weight: 500;
  width: 100%; height: 100%;
}
.customer-name { font-size: 16px; margin-bottom: 4px; }
.serial { font-family: monospace; font-size: 12px; color: #64748b; }
.led {
  position: absolute; top: 12px; left: 12px; width: 8px; height: 8px; border-radius: 50%;
  box-shadow: 0 0 4px rgba(0, 0, 0, .2);
}
.led.on { background: #10b981; box-shadow: 0 0 0 2px rgba(16, 185, 129, .15), 0 0 8px #10b981; }
.led.off { background: #94a3b8; }
.meta { padding: 12px; font-size: 13px; color: #64748b; background: #f9fafb; }
.meta .line { margin: 4px 0; display: flex; align-items: center; gap: 6px; }
.footer { display: flex; align-items: center; padding: 8px 12px; border-top: 1px solid #e2e8f0; background: #fff; }
.footer .spacer { flex: 1; }
</style>
