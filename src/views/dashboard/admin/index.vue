<template>
  <div class="madar-dash">
    <!-- ======= HEADER ======= -->
    <div class="hero">
      <div class="hero__left">
        <!-- NOTE: img is NOT self-closed per vue/html-self-closing rule -->
        <img :src="logoSrc" alt="Madar" class="hero__logo">
        <div>
          <div class="hero__title">Madar TV</div>
          <div class="hero__subtitle">Digital signage & ads management dashboard</div>
        </div>
      </div>
      <div class="hero__chips">
        <div class="chip"><span class="dot dot--on" /> Online <b>{{ fmt(summary.screens.online) }}</b></div>
        <div class="chip"><span class="dot dot--off" /> Offline <b>{{ fmt(summary.screens.offline) }}</b></div>
        <div class="chip"><i class="el-icon-video-camera" /> Published <b>{{ fmt(summary.totals.playlists_published) }}</b></div>
      </div>
    </div>

    <!-- ======= KPIs ======= -->
    <el-row :gutter="16" class="mb-3">
      <el-col v-for="k in kpis" :key="k.key" :xs="24" :sm="12" :md="6">
        <el-card class="kpi pro" :class="'kpi--' + k.key" shadow="never">
          <div class="kpi__wrap">
            <div class="kpi__icon">
              <KpiIcon :name="k.icon" />
            </div>
            <div class="kpi__body">
              <div class="kpi__label">{{ k.label }}</div>
              <div class="kpi__value">{{ fmt(k.value) }}</div>

              <div v-if="k.key === 'screens'" class="kpi__sub">
                <span class="dot dot--on" /> {{ fmt(summary.screens.online) }} online ·
                <span class="dot dot--off" /> {{ fmt(summary.screens.offline) }} offline
              </div>
              <div v-else class="kpi__sub">{{ k.sub }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- ======= CHARTS ROW 1 ======= -->
    <el-row :gutter="16" class="mb-3">
      <el-col :xs="24" :lg="12">
        <el-card class="panel" shadow="never">
          <div class="panel__title">Online vs Offline</div>
          <div ref="pieRef" class="chart" />
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="12">
        <el-card class="panel" shadow="never">
          <div class="panel__title">Top Customers by Screens</div>
          <div ref="barRef" class="chart" />
        </el-card>
      </el-col>
    </el-row>

    <!-- ======= CHARTS ROW 2 ======= -->
    <el-row :gutter="16" class="mb-3">
      <el-col :xs="24" :lg="12">
        <el-card class="panel" shadow="never">
          <div class="panel__title">Operating System Split (latest)</div>
          <div ref="osPieRef" class="chart" />
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="12">
        <el-card class="panel" shadow="never">
          <div class="panel__title">App Version Distribution (latest)</div>
          <div ref="appBarRef" class="chart" />
        </el-card>
      </el-col>
    </el-row>

    <!-- ======= TABLES ======= -->
    <el-row :gutter="16">
      <el-col :xs="24" :lg="12">
        <el-card class="panel" shadow="never">
          <div class="panel__title">Licenses expiring soon (≤ {{ soonDays }} days)</div>
          <el-table
            v-loading="loading.codes"
            :data="expiringSoon"
            empty-text="No licenses near expiry"
            border
          >
            <el-table-column prop="code" label="Code" width="140">
              <template slot-scope="s"><el-tag size="small">{{ s.row.code }}</el-tag></template>
            </el-table-column>
            <el-table-column prop="customer_name" label="Customer" />
            <el-table-column prop="max_uses" label="Max" width="90" />
            <el-table-column prop="used_count" label="Used" width="90" />
            <el-table-column label="Expires" width="190">
              <template slot-scope="s">{{ toLocal(s.row.expires_at) }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="12">
        <el-card class="panel" shadow="never">
          <div class="panel__title">Latest Screens (last 5)</div>
          <el-table
            v-loading="loading.screens"
            :data="latestScreens.slice(0, 5)"
            empty-text="No screens yet"
            border
          >
            <el-table-column prop="serial_number" label="Serial / Label" min-width="220">
              <template slot-scope="s">
                <div class="serial">{{ s.row.serial_number }}</div>
                <div v-if="s.row.label" class="muted">{{ s.row.label }}</div>
              </template>
            </el-table-column>
            <el-table-column prop="customer_name" label="Customer" min-width="200" />
            <el-table-column label="Status" width="120" align="center">
              <template slot-scope="s">
                <el-tag :type="s.row.online ? 'success' : 'info'">{{ s.row.online ? 'Online' : 'Offline' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="Last Check-in" width="190">
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

  components: {
    // Minimal inline SVG icon component
    KpiIcon: {
      functional: true,
      props: { name: { type: String, required: true }},
      render(h, ctx) {
        const paths = {
          screens: 'M3 5h18v10H3V5zm2 2v6h14V7H5zm6 12h-2a1 1 0 01-1-1v-1h4v1a1 1 0 01-1 1z',
          users: 'M16 11a4 4 0 10-8 0 4 4 0 008 0zm-9 6a6 6 0 0110 0v2H7v-2z',
          box: 'M3 7l9-4 9 4-9 4-9-4zm0 4l9 4 9-4v6l-9 4-9-4v-6z',
          playlist: 'M4 6h12v2H4V6zm0 4h12v2H4v-2zm0 4h8v2H4v-2zm14-6h2v8h-2V8z'
        }
        const d = paths[ctx.props.name] || paths.screens
        return h('svg', {
          attrs: { viewBox: '0 0 24 24', width: '28', height: '28', 'aria-hidden': 'true' },
          style: { display: 'block' }
        }, [h('path', { attrs: { d, fill: 'currentColor' }})])
      }
    }
  },

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
      pie: null,
      bar: null,
      osPie: null,
      appBar: null
    }
  },

  computed: {
    logoSrc() {
      return require('@/assets/logo/14.png')
    },

    kpis() {
      return [
        {
          key: 'screens',
          icon: 'screens',
          label: 'Total Screens',
          value: Number(this.summary.totals.screens || 0),
          sub: ''
        },
        {
          key: 'customers',
          icon: 'users',
          label: 'Customers',
          value: Number(this.summary.totals.customers || 0),
          sub: `Managers ${this.fmt(this.summary.totals.users.managers || 0)} · Supervisors ${this.fmt(this.summary.totals.users.supervisors || 0)}`
        },
        {
          key: 'packages',
          icon: 'box',
          label: 'Packages',
          value: Number(this.counts.packages || 0),
          sub: `Expiring ≤ ${this.soonDays}d: ${this.fmt(this.expiringSoon.length)}`
        },
        {
          key: 'content',
          icon: 'playlist',
          label: 'Published Playlists',
          value: Number(this.summary.totals.playlists_published || 0),
          sub: `With ${this.fmt(this.summary.screens.with_playlist || 0)} · Without ${this.fmt(this.summary.screens.without_playlist || 0)}`
        }
      ]
    }
  },

  watch: {
    summary: { deep: true, handler() { this.$nextTick(this.renderCharts) } },
    topCustomers() { this.$nextTick(this.renderCharts) },
    latestScreens() { this.$nextTick(this.renderCharts) }
  },

  async mounted() {
    await Promise.all([
      this.loadSummary(),
      this.loadPackagesCount(),
      this.loadCodes(),
      this.loadCustomers(),
      this.loadScreens()
    ])
    this.initCharts()
    this.renderCharts()
    window.addEventListener('resize', this.resizeCharts)
  },

  beforeDestroy() {
    window.removeEventListener('resize', this.resizeCharts)
    // Avoid starting an expression with an array literal on a new line
    const charts = [this.pie, this.bar, this.osPie, this.appBar]
    charts.forEach(c => c && c.dispose())
  },

  methods: {
    // ===== API helpers =====
    async loadSummary() {
      this.loading.summary = true
      try {
        const res = await getDashboardSummary()
        this.summary = res && res.data ? res.data : (res || this.summary)
      } finally {
        this.loading.summary = false
      }
    },

    async loadPackagesCount() {
      try {
        // Prefer meta.total if provided
        const res1 = await listPackages({ page: 1, per_page: 1 })
        const payload1 = res1 && res1.data ? res1.data : res1
        const meta = payload1 && payload1.meta
        if (meta && typeof meta.total === 'number') {
          this.counts.packages = meta.total
          return
        }
        if (typeof payload1?.total === 'number') {
          this.counts.packages = payload1.total
          return
        }
        // Fallback: count first page
        const res2 = await listPackages({ page: 1, per_page: 100 })
        const payload2 = res2 && res2.data ? res2.data : res2
        const rows = Array.isArray(payload2?.data) ? payload2.data : (Array.isArray(payload2) ? payload2 : [])
        this.counts.packages = rows.length
      } catch (e) {
        this.counts.packages = 0
      }
    },

    async loadCodes() {
      this.loading.codes = true
      try {
        const res = await listEnrollmentCodes({ page: 1, per_page: 200 })
        const payload = res && res.data ? res.data : res
        const rows = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : [])
        const soonTs = Date.now() + this.soonDays * 24 * 3600 * 1000
        this.expiringSoon = rows
          .filter(r => r.expires_at && new Date(r.expires_at).getTime() <= soonTs)
          .map(r => ({
            code: r.code,
            customer_name: r.customer?.name || r.customer_name || ('#' + (r.customer_id || '')),
            max_uses: r.max_uses || 0,
            used_count: r.used_count || 0,
            expires_at: r.expires_at
          }))
          .sort((a, b) => new Date(a.expires_at) - new Date(b.expires_at))
          .slice(0, 10)
      } catch (e) {
        this.expiringSoon = []
      } finally {
        this.loading.codes = false
      }
    },

    async loadCustomers() {
      this.loading.customers = true
      try {
        const res = await getDashboardCustomers({ per_page: 100 })
        const payload = res && res.data ? res.data : res
        const rows = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : [])
        this.topCustomers = rows
          .slice()
          .sort((a, b) => (b.screens_count || 0) - (a.screens_count || 0))
          .slice(0, 10)
          .map(r => ({ name: r.name || ('#' + r.id), value: r.screens_count || 0 }))
      } finally {
        this.loading.customers = false
      }
    },

    async loadScreens() {
      this.loading.screens = true
      try {
        const res = await getDashboardScreens({ per_page: 20, sort_by: 'last_check_in_at', sort_dir: 'desc' })
        const payload = res && res.data ? res.data : res
        const rows = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : [])
        this.latestScreens = rows.map(r => ({
          id: r.id,
          serial_number: r.serial_number,
          label: r.label,
          customer_name: r.customer_name || ('#' + (r.customer_id || '')),
          online: !!r.online,
          last_check_in_at: r.last_check_in_at,
          os: r.os_version || r.os || 'Unknown',
          app: r.app_version || 'Unknown'
        }))
      } finally {
        this.loading.screens = false
      }
    },

    // ===== Charts =====
    initCharts() {
      if (!this.pie) this.pie = echarts.init(this.$refs.pieRef)
      if (!this.bar) this.bar = echarts.init(this.$refs.barRef)
      if (!this.osPie) this.osPie = echarts.init(this.$refs.osPieRef)
      if (!this.appBar) this.appBar = echarts.init(this.$refs.appBarRef)
    },

    renderCharts() {
      if (!this.pie || !this.bar || !this.osPie || !this.appBar) return

      const brand = {
        primary: '#0ea5e9',
        indigo: '#6366f1',
        violet: '#8b5cf6',
        amber: '#f59e0b',
        on: '#22c55e',
        off: '#94a3b8',
        grid: '#e5e7eb'
      }

      // Online / Offline
      const on = this.summary.screens.online || 0
      const off = this.summary.screens.offline || 0
      this.pie.setOption({
        color: [brand.on, brand.off],
        tooltip: { trigger: 'item' },
        series: [{
          type: 'pie',
          radius: ['45%', '70%'],
          labelLine: { show: false },
          label: { show: true, formatter: '{b}: {c}' },
          data: [{ value: on, name: 'Online' }, { value: off, name: 'Offline' }]
        }]
      })

      // Top Customers
      const names = this.topCustomers.map(x => x.name)
      const values = this.topCustomers.map(x => x.value)
      this.bar.setOption({
        color: [brand.primary],
        tooltip: { trigger: 'axis' },
        grid: { left: 10, right: 10, bottom: 10, top: 20, containLabel: true },
        xAxis: { type: 'value', splitLine: { lineStyle: { color: brand.grid }}},
        yAxis: { type: 'category', data: names },
        series: [{ type: 'bar', data: values, barMaxWidth: 22, itemStyle: { borderRadius: [4, 4, 4, 4] }}]
      })

      // OS Split
      const osAgg = this.aggregateCounts(this.latestScreens.map(s => s.os || 'Unknown'))
      this.osPie.setOption({
        color: [brand.indigo, brand.violet, brand.amber, brand.primary, '#10b981', '#ef4444', '#64748b'],
        tooltip: { trigger: 'item' },
        series: [{
          type: 'pie',
          radius: ['40%', '70%'],
          label: { show: true, formatter: '{b}: {c}' },
          data: osAgg.map(o => ({ name: o.k, value: o.v }))
        }]
      })

      // App versions
      const appAgg = this.aggregateCounts(this.latestScreens.map(s => s.app || 'Unknown'))
      this.appBar.setOption({
        color: [brand.violet],
        tooltip: { trigger: 'axis' },
        grid: { left: 10, right: 10, bottom: 10, top: 20, containLabel: true },
        xAxis: { type: 'category', data: appAgg.map(a => a.k), axisLabel: { rotate: 20 }},
        yAxis: { type: 'value', splitLine: { lineStyle: { color: brand.grid }}},
        series: [{ type: 'bar', data: appAgg.map(a => a.v), barMaxWidth: 24, itemStyle: { borderRadius: [4, 4, 0, 0] }}]
      })
    },

    resizeCharts() {
      const charts = [this.pie, this.bar, this.osPie, this.appBar]
      charts.forEach(c => c && c.resize())
    },

    // ===== utils =====
    aggregateCounts(list) {
      const map = {}
      list.forEach(x => { map[x] = (map[x] || 0) + 1 })
      return Object.entries(map)
        .map(([k, v]) => ({ k, v }))
        .sort((a, b) => b.v - a.v)
    },

    fmt(n) {
      return Number(n || 0).toLocaleString()
    },

    toLocal(v) {
      return v ? new Date(v).toLocaleString() : '—'
    }
  }
}
</script>

<style scoped>
.madar-dash {
  padding: 20px 24px 32px;
  background: #ffffff;
  color: #0f172a;
}

/* Header */
.hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 16px;
  box-shadow: 0 8px 20px rgba(2, 6, 23, .12);
}
.hero__left { display: flex; align-items: center; gap: 12px; }
.hero__logo { width: 42px; height: 42px; object-fit: contain; }
.hero__title { font-weight: 800; font-size: 18px; }
.hero__subtitle { font-size: 12px; color: #cbd5e1; }
.hero__chips { display: flex; gap: 10px; flex-wrap: wrap; }
.chip {
  display: flex; align-items: center; gap: 6px;
  background: #0b1220; border: 1px solid #1e293b;
  color: #c7d2fe; padding: 6px 10px; border-radius: 999px; font-size: 12px;
}

/* KPI */
.mb-3 { margin-bottom: 16px; }
.kpi.pro { border-radius: 14px; border: 1px solid #e5e7eb; }
.kpi__wrap { display: flex; align-items: center; gap: 12px; }
.kpi__icon {
  width: 56px; height: 56px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  color: #0ea5e9;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  box-shadow: inset 0 0 0 1px rgba(2, 6, 23, .05);
}
.kpi--customers .kpi__icon { color: #10b981; background: linear-gradient(135deg, #ecfdf5, #d1fae5); }
.kpi--packages  .kpi__icon { color: #f59e0b; background: linear-gradient(135deg, #fff7ed, #ffedd5); }
.kpi--content   .kpi__icon { color: #8b5cf6; background: linear-gradient(135deg, #f5f3ff, #ede9fe); }

.kpi__body { flex: 1; min-width: 0; }
.kpi__label { font-size: 12px; color: #64748b; }
.kpi__value { font-size: 26px; font-weight: 800; line-height: 1; margin: 4px 0 2px; color: #0f172a; }
.kpi__sub { font-size: 12px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
.dot--on { background: #22c55e; }
.dot--off { background: #94a3b8; }

/* Panels & charts */
.panel { border-radius: 12px; }
.panel__title { font-weight: 700; margin-bottom: 8px; }
.chart { height: 320px; width: 100%; }

/* Table tweaks */
.serial { font-weight: 600; }
.muted { color: #64748b; font-size: 12px; }
</style>
