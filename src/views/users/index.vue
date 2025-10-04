<template>
  <div class="app-container">
    <el-card shadow="never">
      <el-table v-loading="loading" :data="rows" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="Name" />
        <el-table-column prop="email" label="Email" />
        <el-table-column prop="role" label="Role" width="130" />
        <el-table-column prop="customer_id" label="Customer ID" width="130" />
        <el-table-column prop="created_at" label="Created At" width="180" />
      </el-table>

      <div class="pagination">
        <el-pagination
          background
          layout="prev, pager, next, total"
          :current-page.sync="q.page"
          :page-size="q.per_page"
          :total="total"
          @current-change="fetch"
        />
      </div>
    </el-card>
  </div>
</template>

<script>
import { listUsers } from '@/api/users'

export default {
  name: 'UserManagementPage',
  data() {
    return { loading: false, rows: [], total: 0, q: { page: 1, per_page: 10 }}
  },
  created() { this.fetch() },
  methods: {
    async fetch() {
      this.loading = true
      try {
        const res = await listUsers(this.q)
        this.rows = res.data || res.items || []
        this.total = res?.meta?.total ?? res?.total ?? this.rows.length
      } finally { this.loading = false }
    }
  }
}
</script>

<style scoped>
.pagination{margin-top:12px;text-align:right}
</style>
