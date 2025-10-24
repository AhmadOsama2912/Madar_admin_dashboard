<template>
  <el-table :data="rows" border>
    <el-table-column prop="id" label="ID" width="80" />
    <el-table-column prop="serial" label="Serial" />
    <el-table-column prop="customer" label="Customer" />
    <el-table-column prop="last" label="Last Heartbeat" width="200" />
    <el-table-column label="Online" width="100">
      <template #default="{ row }">
        <el-tag :type="row.online ? 'success' : 'info'">{{ row.online ? 'Online' : 'Offline' }}</el-tag>
      </template>
    </el-table-column>
  </el-table>
</template>

<script>
export default {
  name: 'TransactionTable',
  props: { rows: { type: Array, default: () => [] }}
}
</script>
