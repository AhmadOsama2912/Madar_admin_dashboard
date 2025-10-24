<template>
  <div class="app-container">
    <!-- Filters -->
    <el-card shadow="never" class="mb-3">
      <div class="filters">
        <el-select
          v-model="ui.customerId"
          placeholder="Customer"
          clearable
          filterable
          style="width:260px"
          class="mr-2"
        >
          <el-option v-for="c in customers" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>

        <el-input
          v-model="ui.serial"
          placeholder="Serial number"
          clearable
          class="mr-2"
          style="max-width:220px"
        />

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
        <el-col v-for="s in rows" :key="s.id" :xs="24" :sm="12" :md="8" :lg="6">
          <!-- card click -->
          <el-card class="screen-card" shadow="hover" @click="$router.push({ name:'ScreenShow', params:{ id: s.id } })">
            <div class="screen-mock">
              <div class="led" :class="s.is_online ? 'on' : 'off'" />
              <div class="glass">
                <div class="brand">Madar</div>
                <div class="serial">{{ s.serial_number }}</div>
              </div>
            </div>

            <div class="meta">
              <div class="line"><i class="el-icon-s-home" /> {{ s.customer_name || ('#'+s.customer_id) }}</div>
              <div class="line"><i class="el-icon-cpu" /> {{ s.device_model || '-' }}</div>
              <div class="line"><i class="el-icon-time" /> Last seen: {{ human(s.last_check_in_at) }}</div>
              <div class="line"><i class="el-icon-timer" /> License: {{ licenseText(s.license) }}</div>
              <div v-if="s.playlist_id" class="line"><i class="el-icon-video-camera" /> Playlist #{{ s.playlist_id }}</div>
            </div>

            <div class="footer">
              <el-tag :type="s.is_online ? 'success' : 'info'">
                {{ s.is_online ? 'Online' : 'Offline' }}
              </el-tag>
              <span class="spacer" />
              <el-tooltip content="Copy serial">
                <el-button type="text" icon="el-icon-document-copy" @click="copy(s.serial_number)" />
              </el-tooltip>
            </div>
          </el-card>
        </el-col>
      </template>

      <!-- Empty state -->
      <template v-else>
        <el-col :span="24">
          <el-empty description="No screens yet">
            <div class="mt-1">Create an enrollment code and register your first screen.</div>
            <router-link to="/screens/enrollment-codes">
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
  </div>
</template>

<script>
import { listScreens } from '@/api/screens'
import { listCustomers } from '@/api/customers'

export default {
  name: 'AllScreensPage',
  data() {
    return {
      loading: false,
      rows: [],
      total: 0,

      // Query actually sent to backend
      q: {
        page: 1,
        per_page: 20, // will be clamped to <= 100
        sort_by: 'created_at', // allowed: created_at | serial_number | id
        sort_dir: 'desc'
      },

      // UI state for filters
      ui: {
        customerId: null,
        serial: '',
        online: null, // '1' | '0' | null
        range: null, // [Date, Date] or null
        sortKey: 'created_at',
        sortDir: 'desc'
      },

      customers: []
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
        // common shapes: {data:{data:[]}}, {data:[]}, []
        const payload = res && res.data ? res.data : res
        this.customers = (payload && Array.isArray(payload.data) ? payload.data
          : Array.isArray(payload) ? payload
            : []) || []
      } catch (e) {
        this.customers = []
      }
    },

    buildParams() {
      // Respect backend validator
      const allowedSort = ['created_at', 'serial_number', 'id']
      const sortBy = allowedSort.includes(this.ui.sortKey) ? this.ui.sortKey : 'created_at'
      const sortDir = (this.ui.sortDir === 'asc' || this.ui.sortDir === 'desc') ? this.ui.sortDir : 'desc'

      // clone and map
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
        const res = await listScreens(params)

        // Accept: {data:{data:[], meta:{total}}} or {data:[], meta:{total}} or []
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
          playlist_id: r.playlist_id,
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
      this.ui = {
        customerId: null,
        serial: '',
        online: null,
        range: null,
        sortKey: 'created_at',
        sortDir: 'desc'
      }
      this.fetch()
    },

    toYmd(d) { const x = new Date(d); return x.toISOString().slice(0, 10) },
    human(dt) { if (!dt) return '-'; const x = new Date(dt); return x.toLocaleString() },
    licenseText(lic) {
      if (!lic) return '–'
      const exp = lic.expires_at ? new Date(lic.expires_at).toLocaleDateString() : '—'
      return `${lic.status || 'active'} (exp ${exp})`
    },
    copy(text) {
      try { navigator.clipboard.writeText(text); this.$message.success('Serial copied') } catch (_) {
        console.error('Failed to copy')
      }
    }
  }
}
</script>

<style scoped>
.mb-3{margin-bottom:12px}
.filters{display:flex;align-items:center}
.mr-2{margin-right:8px}
.ml-1{margin-left:8px}
.flex-spacer{flex:1}

.screen-card{margin-bottom:16px}
.screen-mock{
  position:relative;background:#0b1220;border-radius:14px;height:180px;
  box-shadow:inset 0 0 0 2px #101828, 0 6px 16px rgba(0,0,0,.2); overflow:hidden;
}
.glass{
  position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center;
  color:#9fb3ff; text-shadow:0 1px 2px rgba(0,0,0,.2);
  background: radial-gradient(60% 80% at 50% 50%, rgba(60,90,210,.18), rgba(0,0,0,0) 70%);
}
.brand{font-weight:700; letter-spacing:.06em; opacity:.9}
.serial{margin-top:6px; font-family:monospace; font-size:14px; color:#c7d2fe}
.led{
  position:absolute; top:10px; left:10px; width:10px; height:10px; border-radius:50%;
  box-shadow:0 0 6px rgba(0,0,0,.4);
}
.led.on{background:#22c55e; box-shadow:0 0 0 2px rgba(34,197,94,.25), 0 0 10px #22c55e}
.led.off{background:#94a3b8}

.meta{padding:10px 6px 0; font-size:12px; color:#6b7280}
.meta .line{margin:2px 0}
.footer{display:flex; align-items:center; padding:8px 6px}
.footer .spacer{flex:1}
.pagination{margin-top:12px; text-align:right}

.mt-1{margin-top:8px}
</style>
