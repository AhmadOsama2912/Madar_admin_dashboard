<template>
  <div class="app-container">
    <!-- Create form -->
    <el-card shadow="never" class="mb-2">
      <h3 class="mb-1">Create Enrollment Code</h3>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="160px" class="maxw">
        <el-form-item label="Customer" prop="customer_id">
          <el-select v-model="form.customer_id" placeholder="Select customer" filterable style="width:100%">
            <el-option v-for="c in customers" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="MAX Screen" prop="max_uses">
          <el-input-number v-model="form.max_uses" :min="1" :max="1000" />
          <span class="hint">How many screens can register with this code.</span>
        </el-form-item>

        <el-form-item label="License Days" prop="license_days">
          <el-input-number v-model="form.license_days" :min="1" :max="3650" />
          <span class="hint">Each screen gets this many days.</span>
        </el-form-item>

        <el-form-item label="Expires At">
          <el-date-picker v-model="form.expires_at" type="datetime" placeholder="Optional expiry" />
        </el-form-item>

        <el-form-item label="Note">
          <el-input v-model="form.note" type="textarea" :rows="2" placeholder="Optional note" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="submit">Create</el-button>
          <el-button @click="reset">Reset</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- List -->
    <el-card shadow="never">
      <div class="toolbar">
        <el-input
          v-model="q.q"
          placeholder="Search code…"
          clearable
          style="max-width:260px"
          class="mr-2"
          @keyup.enter.native="fetch"
        />
        <el-select v-model="q.customer_id" placeholder="Customer" clearable filterable style="width:260px" class="mr-2">
          <el-option v-for="c in customers" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
        <el-button type="primary" icon="el-icon-search" @click="fetch">Search</el-button>
        <div class="flex-spacer" />
        <el-button icon="el-icon-refresh" :loading="loading" @click="fetch">Refresh</el-button>
      </div>

      <el-table v-loading="loading" :data="rows" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="Code" width="180">
          <template slot-scope="{ row }">
            <el-tag>{{ row.code }}</el-tag>
            <el-button type="text" icon="el-icon-document-copy" @click="copy(row.code)" />
          </template>
        </el-table-column>
        <el-table-column label="Customer" min-width="200">
          <template slot-scope="{ row }">
            {{ (row.customer && row.customer.name) ? row.customer.name : ('#' + row.customer_id) }}
          </template>
        </el-table-column>
        <el-table-column prop="max_uses" label="MAX Screen" width="110" />
        <el-table-column prop="used_count" label="Used" width="100" />
        <el-table-column prop="license_days" label="Days" width="90" />
        <el-table-column prop="expires_at" label="Expires At" width="180" />
        <el-table-column prop="created_at" label="Created" width="180" />

        <template slot="empty">
          <el-empty description="No enrollment codes yet">
            <div class="mt-1">Create a code above to register new screens.</div>
          </el-empty>
        </template>
      </el-table>

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
    </el-card>
  </div>
</template>

<script>
import { listEnrollmentCodes, createEnrollmentCode } from '@/api/enrollment-codes'
import { listCustomers } from '@/api/customers'

export default {
  name: 'EnrollmentCodes',
  data() {
    return {
      customers: [],
      loading: false,
      submitting: false,
      rows: [],
      total: 0,
      q: { page: 1, per_page: 20, q: '', customer_id: null },
      form: { customer_id: null, max_uses: 1, license_days: 30, expires_at: null, note: '' },
      rules: {
        customer_id: [{ required: true, message: 'Customer required', trigger: 'change' }],
        max_uses: [{ required: true, message: 'MAX Screen required', trigger: 'blur' }],
        license_days: [{ required: true, message: 'License days required', trigger: 'blur' }]
      }
    }
  },
  created() {
    this.loadCustomers()
    this.fetch()
  },
  methods: {
    // Parse different response shapes robustly
    parseList(res) {
      // ✅ fix: do NOT call obj.hasOwnProperty directly (no-prototype-builtins)
      const payload =
        (res && typeof res === 'object' && Object.prototype.hasOwnProperty.call(res, 'data'))
          ? res.data
          : res

      let rows = []
      if (payload) {
        if (Array.isArray(payload)) rows = payload
        else if (Array.isArray(payload.data)) rows = payload.data
        else if (Array.isArray(payload.items)) rows = payload.items
      }

      const total =
        (payload && payload.meta && typeof payload.meta.total !== 'undefined')
          ? Number(payload.meta.total) || 0
          : rows.length

      return { rows, total }
    },

    async loadCustomers() {
      try {
        const res = await listCustomers({ page: 1, per_page: 100 })
        const parsed = this.parseList(res)
        this.customers = parsed.rows
      } catch (e) {
        this.$message.error(this.err(e, 'Failed to load customers'))
      }
    },

    async fetch() {
      this.loading = true
      try {
        const res = await listEnrollmentCodes(this.q)
        const parsed = this.parseList(res)
        this.rows = parsed.rows
        this.total = parsed.total
      } catch (e) {
        this.$message.error(this.err(e, 'Failed to load codes'))
        this.rows = []
        this.total = 0
      } finally {
        this.loading = false
      }
    },

    submit() {
      this.$refs.formRef.validate(async(ok) => {
        if (!ok) return
        this.submitting = true
        try {
          const payload = { ...this.form }
          if (payload.expires_at && payload.expires_at.toISOString) {
            payload.expires_at = payload.expires_at.toISOString()
          }
          const res = await createEnrollmentCode(payload)
          const msg =
            (res && res.message) ||
            (res && res.data && res.data.message) ||
            'Code created'
          this.$message.success(msg)
          this.reset()
          this.fetch()
        } catch (e) {
          this.$message.error(this.err(e, 'Failed to create code'))
        } finally {
          this.submitting = false
        }
      })
    },

    reset() {
      this.form = { customer_id: null, max_uses: 1, license_days: 30, expires_at: null, note: '' }
      this.$refs.formRef && this.$refs.formRef.clearValidate && this.$refs.formRef.clearValidate()
    },

    copy(text) {
      try {
        navigator.clipboard.writeText(text)
        this.$message.success('Copied')
      } catch (e) {
        // ✅ fix: avoid empty catch (no-empty)
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.error('Clipboard copy failed:', e)
        }
        this.$message.warning('Copy failed')
      }
    },

    err(e, fb) {
      return (
        e?.response?.data?.message ||
        (e?.response?.data?.errors && Object.values(e.response.data.errors)[0][0]) ||
        e?.message ||
        fb
      )
    }
  }
}
</script>

<style scoped>
.mb-2{margin-bottom:12px}
.mb-1{margin-bottom:8px}
.maxw{max-width:720px}
.toolbar{display:flex;align-items:center;margin-bottom:12px}
.flex-spacer{flex:1}
.mr-2{margin-right:8px}
.pagination{margin-top:12px;text-align:right}
.hint{margin-left:8px;color:#909399;font-size:12px}
.mt-1{margin-top:8px}
</style>
