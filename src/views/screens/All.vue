<template>
  <div class="app-container">
    <el-alert
      v-if="notImplemented"
      title="Note"
      type="warning"
      description="GET /admin/v1/screens is not implemented on backend yet. The table will populate once it exists."
      show-icon
      class="mb-3"
    />
    <el-card shadow="never">
      <el-table v-loading="loading" :data="rows" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="Name / Serial" />
        <el-table-column prop="customer_id" label="Customer ID" width="130" />
        <el-table-column prop="playlist_id" label="Playlist ID" width="120" />
        <el-table-column prop="last_heartbeat_at" label="Last Heartbeat" width="200" />
      </el-table>
    </el-card>
  </div>
</template>

<script>
import { listScreens } from '@/api/screens'
export default {
  name: 'AllScreensPage',
  data() {
    return { loading: false, rows: [], notImplemented: false }
  },
  async created() {
    this.loading = true
    try {
      const res = await listScreens({ page: 1, per_page: 20 }).catch(() => { this.notImplemented = true; return null })
      if (res) this.rows = res.data || res.items || []
    } finally { this.loading = false }
  }
}
</script>

<style scoped>
.mb-3{margin-bottom:12px}
</style>
