<template>
  <div class="panel-group">
    <el-row :gutter="40">
      <el-col :xs="12" :sm="12" :lg="6">
        <div class="card" @click="$emit('handleSetLineChartData','status')">
          <div class="card-title">Screens</div>
          <div class="card-value">{{ summary.totals.screens | n }}</div>
          <div class="card-sub">Online {{ summary.screens.online | n }} • Offline {{ summary.screens.offline | n }}</div>
        </div>
      </el-col>

      <el-col :xs="12" :sm="12" :lg="6">
        <div class="card" @click="$emit('handleSetLineChartData','playlist')">
          <div class="card-title">Content Assigned</div>
          <div class="card-value">{{ summary.screens.with_playlist | n }}</div>
          <div class="card-sub">Without playlist {{ summary.screens.without_playlist | n }}</div>
        </div>
      </el-col>

      <el-col :xs="12" :sm="12" :lg="6">
        <div class="card">
          <div class="card-title">Customers</div>
          <div class="card-value">{{ summary.totals.customers | n }}</div>
          <div class="card-sub">Playlists published {{ summary.totals.playlists_published | n }}</div>
        </div>
      </el-col>

      <el-col :xs="12" :sm="12" :lg="6">
        <div class="card">
          <div class="card-title">Tenant Users</div>
          <div class="card-value">{{ (summary.totals.users.managers + summary.totals.users.supervisors) | n }}</div>
          <div class="card-sub">Managers {{ summary.totals.users.managers | n }} • Supervisors {{ summary.totals.users.supervisors | n }}</div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script>
export default {
  name: 'PanelGroup',
  filters: { n(v) { return Number(v || 0).toLocaleString() } },
  props: { summary: { type: Object, required: true }}
}
</script>

<style scoped>
.panel-group .card{
  background: #fff; padding: 20px; border-radius: 8px; cursor: pointer;
  box-shadow: 0 1px 3px rgba(0,0,0,.06); transition: box-shadow .2s;
}
.panel-group .card:hover{ box-shadow: 0 6px 18px rgba(0,0,0,.08); }
.card-title{ color:#8a97a3; font-size:13px }
.card-value{ font-size:28px; font-weight:700; margin:6px 0 }
.card-sub{ color:#98a6ad; font-size:12px }
</style>
