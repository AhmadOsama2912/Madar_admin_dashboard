<template>
  <div class="app-container">
    <el-card shadow="never">
      <div class="toolbar">
        <el-input v-model="q.q" placeholder="Search packages…" clearable class="mr-2" style="max-width:280px" />
        <el-button type="primary" @click="fetch">Search</el-button>
      </div>

      <el-table v-loading="loading" :data="rows" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="Name" />
        <el-table-column prop="screens_limit" label="Screens Limit" width="140" />
        <el-table-column prop="managers_limit" label="Managers" width="120" />
        <el-table-column prop="supervisors_limit" label="Supervisors" width="130" />
        <el-table-column prop="branches_limit" label="Branches" width="110" />
        <el-table-column prop="price" label="Price" width="120" />
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
import { listPackages } from '@/api/packages'
// import { listPackages } from '@/api/packages'

export default {
  name: 'PackagesPage',
  data() {
    return {
      loading: false,
      rows: [],
      total: 0,
      q: { page: 1, per_page: 10, q: '' }
    }
  },
  created() { this.fetch() },
  methods: {
    async fetch() {
      this.loading = true
      try {
        const res = await listPackages(this.q)
        this.rows = res.data || res.items || []
        this.total = res?.meta?.total ?? res?.total ?? this.rows.length
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.toolbar{display:flex;align-items:center;margin-bottom:12px}
.mr-2{margin-right:8px}
.pagination{margin-top:12px;text-align:right}
</style>
