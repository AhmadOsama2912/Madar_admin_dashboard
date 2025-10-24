<template>
  <div class="madar-dashboard">
    <!-- ======= KPI STRIP ======= -->
    <el-row :gutter="16" class="mb-3">
      <el-col :xs="24" :sm="12" :md="8" :lg="6">
        <el-card class="kpi">
          <div class="kpi__icon kpi__icon--screens" />
          <div class="kpi__body">
            <div class="kpi__label">Total Screens</div>
            <div class="kpi__value">{{ fmt(summary.totals.screens) }}</div>
            <div class="kpi__sub">
              <span class="dot dot--on" /> {{ fmt(summary.screens.online) }} online
              · <span class="dot dot--off" /> {{ fmt(summary.screens.offline) }} offline
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :md="8" :lg="6">
        <el-card class="kpi">
          <div class="kpi__icon kpi__icon--customers" />
          <div class="kpi__body">
            <div class="kpi__label">Customers</div>
            <div class="kpi__value">{{ fmt(summary.totals.customers) }}</div>
            <div class="kpi__sub">Managers {{ fmt(summary.totals.users.managers) }} · Supervisors {{ fmt(summary.totals.users.supervisors) }}</div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :md="8" :lg="6">
        <el-card class="kpi">
          <div class="kpi__icon kpi__icon--packages" />
          <div class="kpi__body">
            <div class="kpi__label">Packages</div>
            <div class="kpi__value">{{ fmt(counts.packages) }}</div>
            <div class="kpi__sub">Active licenses soon to expire: {{ fmt(expiringSoon.length) }}</div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="12" :md="8" :lg="6">
        <el-card class="kpi">
          <div class="kpi__icon kpi__icon--content" />
          <div class="kpi__body">
            <div class="kpi__label">Published Playlists</div>
            <div class="kpi__value">{{ fmt(summary.totals.playlists_published) }}</div>
            <div class="kpi__sub">With playlist {{ fmt(summary.screens.with_playlist) }} · Without {{ fmt(summary.screens.without_playlist) }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- ======= CHARTS ======= -->
    <el-row :gutter="16" class="mb-3">
      <el-col :xs="24" :lg="12">
        <el-card>
          <div class="card-title">Online vs Offline</div>
          <div ref="pieRef" class="chart" />
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="12">
        <el-card>
          <div class="card-title">Top Customers by Screens</div>
          <div ref="barRef" class="chart" />
        </el-card>
      </el-col>
    </el-row>

    <!-- ======= TABLES ======= -->
    <el-row :gutter="16">
      <el-col :xs="24" :lg="12">
        <el-card>
          <div class="card-title">Licenses expiring soon (≤ {{ soonDays }} days)</div>
          <el-table v-loading="loading.codes" :data="expiringSoon" empty-text="No licenses near expiry" border>
            <el-table-column prop="code" label="Code" width="140">
              <template slot-scope="s"><el-tag size="small">{{ s.row.code }}</el-tag></template>
            </el-table-column>
            <el-table-column prop="customer_name" label="Customer" />
            <el-table-column prop="max_uses" label="Max" width="80" />
            <el-table-column prop="used_count" label="Used" width="80" />
            <el-table-column label="Expires" width="180">
              <template slot-scope="s">{{ toLocal(s.row.expires_at) }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="12">
        <el-card>
          <div class="card-title">Latest Screens</div>
          <el-table v-loading="loading.screens" :data="latestScreens" empty-text="No screens yet" border>
            <el-table-column prop="serial_number" label="Serial / Label">
              <template slot-scope="s">
                <div class="serial">{{ s.row.serial_number }}</div>
                <div v-if="s.row.label" class="muted">{{ s.row.label }}</div>
              </template>
            </el-table-column>
            <el-table-column prop="customer_name" label="Customer" width="220" />
            <el-table-column label="Status" width="120">
              <template slot-scope="s">
                <el-tag :type="s.row.online ? 'success' : 'info'">{{ s.row.online ? 'Online' : 'Offline' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="Last Check-in" width="180">
              <template slot-scope="s">{{ toLocal(s.row.last_check_in_at) }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import echarts from 'echarts'
import { getDashboardSummary, getDashboardCustomers, getDashboardScreens } from '@/api/dashboard'
import { listPackages } from '@/api/packages'
import { listEnrollmentCodes } from '@/api/enrollment-codes'

export default {
  name: 'MadarDashboard',
  data() {
    return {
      loading: { summary: false, customers: false, screens: false, codes: false },
      summary: {
        totals: { screens: 0, customers: 0, playlists_published: 0, users: { managers: 0, supervisors: 0 }},
        screens: { online: 0, offline: 0, with_playlist: 0, without_playlist: 0, online_threshold_minutes: 5 }
      },
      counts: { packages: 0 },
      soonDays: 30,
      expiringSoon: [],
      latestScreens: [],
      topCustomers: [],
      // charts
      pie: null,
      bar: null
    }
  },
  watch: {
    // re-render charts when data changes
    summary: { deep: true, handler() { this.$nextTick(this.renderCharts) } },
    topCustomers() { this.$nextTick(this.renderCharts) }
  },
  async mounted() {
    await Promise.all([this.loadSummary(), this.loadPackages(), this.loadCodes(), this.loadCustomers(), this.loadScreens()])
    this.initCharts()
    this.renderCharts()
    window.addEventListener('resize', this.resizeCharts)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.resizeCharts)
    this.pie && this.pie.dispose()
    this.bar && this.bar.dispose()
  },
  methods: {
    // ===== API helpers =====
    async loadSummary() {
      this.loading.summary = true
      try {
        const res = await getDashboardSummary()
        this.summary = res?.data || res || this.summary
      } finally { this.loading.summary = false }
    },
    async loadPackages() {
      try {
        // ask for one item; read meta.total for count fallback
        const res = await listPackages({ page: 1, per_page: 1 })
        const payload = res?.data || res
        this.counts.packages = payload?.meta?.total ?? payload?.total ?? (Array.isArray(payload?.data) ? payload.data.length : 0)
      } catch (_) { /* leave 0 */ }
    },
    async loadCodes() {
      this.loading.codes = true
      try {
        // pull many so we can client-filter by expires_at
        const res = await listEnrollmentCodes({ page: 1, per_page: 100 })
        const payload = res?.data || res
        const rows = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : []
        const soonTs = Date.now() + this.soonDays * 24 * 3600 * 1000
        this.expiringSoon = rows
          .filter(r => r.expires_at && new Date(r.expires_at).getTime() <= soonTs)
          .map(r => ({
            code: r.code,
            customer_name: r.customer?.name || r.customer_name || ('#' + (r.customer_id ?? '')),
            max_uses: r.max_uses ?? 0,
            used_count: r.used_count ?? 0,
            expires_at: r.expires_at
          }))
          .sort((a, b) => new Date(a.expires_at) - new Date(b.expires_at))
          .slice(0, 10)
      } catch (_) {
        this.expiringSoon = []
      } finally { this.loading.codes = false }
    },
    async loadCustomers() {
      this.loading.customers = true
      try {
        const res = await getDashboardCustomers({ per_page: 100 })
        const payload = res?.data || res
        const rows = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : [])
        this.topCustomers = rows
          .slice()
          .sort((a, b) => (b.screens_count || 0) - (a.screens_count || 0))
          .slice(0, 10)
          .map(r => ({ name: r.name || ('#' + r.id), value: r.screens_count || 0 }))
      } finally { this.loading.customers = false }
    },
    async loadScreens() {
      this.loading.screens = true
      try {
        const res = await getDashboardScreens({ per_page: 10, sort_by: 'last_check_in_at', sort_dir: 'desc' })
        const payload = res?.data || res
        const rows = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : [])
        this.latestScreens = rows.map(r => ({
          id: r.id,
          serial_number: r.serial_number,
          label: r.label,
          customer_name: r.customer_name || ('#' + (r.customer_id ?? '')),
          online: !!r.online,
          last_check_in_at: r.last_check_in_at
        }))
      } finally { this.loading.screens = false }
    },

    // ===== Charts =====
    initCharts() {
      if (!this.pie) this.pie = echarts.init(this.$refs.pieRef)
      if (!this.bar) this.bar = echarts.init(this.$refs.barRef)
    },
    renderCharts() {
      // Pie: online/offline
      const on = this.summary.screens.online || 0
      const off = this.summary.screens.offline || 0
      this.pie.setOption({
        tooltip: { trigger: 'item' },
        series: [{
          type: 'pie',
          radius: ['45%', '70%'],
          avoidLabelOverlap: false,
          label: { show: true, formatter: '{b}: {c}' },
          data: [{ value: on, name: 'Online' }, { value: off, name: 'Offline' }]
        }]
      })

      // Bar: top customers by screens
      const names = this.topCustomers.map(x => x.name)
      const values = this.topCustomers.map(x => x.value)
      this.bar.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: 10, right: 10, bottom: 10, top: 30, containLabel: true },
        xAxis: { type: 'value' },
        yAxis: { type: 'category', data: names },
        series: [{ type: 'bar', data: values }]
      })
    },
    resizeCharts() {
      this.pie && this.pie.resize()
      this.bar && this.bar.resize()
    },

    // ===== utils =====
    fmt(n) { return Number(n || 0).toLocaleString() },
    toLocal(v) { return v ? new Date(v).toLocaleString() : '—' }
  }
}
</script>

<style scoped>
.madar-dashboard{padding:24px;background:#f0f2f5}
.mb-3{margin-bottom:16px}

/* KPI cards */
.kpi{display:flex;align-items:center;min-height:110px}
.kpi__icon{width:54px;height:54px;border-radius:12px;margin-right:12px;background:#e6f7ff}
.kpi__icon--screens{background:#e6f7ff url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="54" height="54" viewBox="0 0 24 24" fill="%23189"}') no-repeat center/26px}
.kpi__icon--customers{background:#f6ffed}
.kpi__icon--packages{background:#fff7e6}
.kpi__icon--content{background:#f9f0ff}
.kpi__body{flex:1}
.kpi__label{font-size:12px;color:#909399}
.kpi__value{font-size:24px;font-weight:700;line-height:1;margin:4px 0 2px}
.kpi__sub{font-size:12px;color:#909399}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin:0 6px 0 0;vertical-align:middle}
.dot--on{background:#67C23A}
.dot--off{background:#909399}

/* Cards */
.card-title{font-weight:600;margin-bottom:8px}
.chart{height:320px;width:100%}
.serial{font-weight:600}
.muted{color:#909399;font-size:12px}
</style>
