<template>
  <div class="app-container">
    <el-card shadow="never">
      <div class="header"><h3>Customers</h3></div>

      <el-alert
        v-if="lastError"
        type="error"
        :closable="false"
        :title="lastError"
        class="mb-2"
      />

      <!-- Toolbar -->
      <div class="toolbar">
        <el-input
          v-model="q.q"
          placeholder="Search company / email / phone…"
          clearable
          class="mr-2"
          style="max-width:320px"
          @keyup.enter.native="fetch"
        />
        <el-button type="primary" icon="el-icon-search" @click="fetch">Search</el-button>
        <div class="flex-spacer" />
        <el-button type="primary" icon="el-icon-plus" @click="openCreate">Create Customer</el-button>
      </div>

      <!-- Table -->
      <el-table v-loading="loading" :data="rows" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="Logo" width="86">
          <template slot-scope="scope">
            <el-avatar
              v-if="scope.row.logo_url || scope.row.logo"
              :src="scope.row.logo_url || scope.row.logo"
              size="small"
              shape="square"
            />
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="Company" min-width="180" />
        <el-table-column prop="email" label="Email" min-width="220" />
        <el-table-column prop="phone" label="Phone" min-width="140" />

        <el-table-column label="Package" min-width="200">
          <template slot-scope="scope">
            <span>
              {{ (scope.row.package && scope.row.package.name) || scope.row.package_name || '-' }}
            </span>
            <span v-if="pkgPrice(scope.row) !== null" class="muted">
              — {{ formatPrice(pkgPrice(scope.row)) }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="Screens" width="110">
          <template slot-scope="scope">
            {{ scope.row.screens_count != null ? scope.row.screens_count : '-' }}
          </template>
        </el-table-column>

        <el-table-column prop="created_at" label="Created At" width="180" />

        <el-table-column label="Actions" width="220" fixed="right">
          <template slot-scope="scope">
            <el-button size="mini" @click="openEdit(scope.row)">Edit</el-button>
            <el-button size="mini" type="danger" @click="remove(scope.row)">Delete</el-button>
          </template>
        </el-table-column>

        <template slot="empty">
          <el-empty description="No customers found">
            <el-button size="mini" type="primary" @click="openCreate">Create customer</el-button>
          </el-empty>
        </template>
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

    <!-- Create / Edit dialog -->
    <el-dialog
      :title="dialogMode === 'create' ? 'Create Customer' : 'Edit Customer'"
      :visible.sync="dialogVisible"
      width="760px"
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="160px" class="form">
        <el-form-item label="Company Name" prop="name">
          <el-input v-model.trim="form.name" autocomplete="off" />
        </el-form-item>

        <el-form-item label="Email" prop="email">
          <el-input v-model.trim="form.email" autocomplete="off" />
        </el-form-item>

        <el-form-item label="Phone" prop="phone">
          <el-input v-model.trim="form.phone" autocomplete="off" placeholder="optional" />
        </el-form-item>

        <el-form-item label="Package" prop="package_id">
          <el-select
            v-model="form.package_id"
            placeholder="Select a package"
            filterable
            :loading="loadingPackages"
            style="width:100%"
          >
            <el-option
              v-for="p in packages"
              :key="p.id"
              :label="`${p.name} — ${formatPrice(p.price)}`"
              :value="p.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="Note">
          <el-input v-model.trim="form.note" type="textarea" :rows="3" placeholder="optional" />
        </el-form-item>

        <el-form-item label="Logo">
          <el-upload
            class="logo-uploader"
            action=""
            :auto-upload="false"
            :show-file-list="false"
            accept="image/*"
            :on-change="onLogoChange"
            :on-remove="onLogoRemove"
          >
            <el-button size="small" icon="el-icon-upload">Choose image</el-button>
            <span v-if="form.logoFile" class="muted ml-1">{{ form.logoFile.name }}</span>
            <span v-else class="muted ml-1">Max 2MB, JPG/PNG</span>
          </el-upload>
          <div v-if="previewLogo" class="logo-preview">
            <img :src="previewLogo" alt="logo">
            <el-button size="mini" class="ml-1" @click="clearLogo">Clear</el-button>
          </div>
        </el-form-item>

        <el-form-item label="Meta (Key / Value)">
          <div class="meta-grid">
            <div v-for="(kv, idx) in form.metaKVs" :key="idx" class="meta-row">
              <el-input v-model="kv.key" placeholder="key" size="small" />
              <el-input v-model="kv.value" placeholder="value" size="small" />
              <el-button icon="el-icon-delete" type="text" @click="removeKV(idx)" />
            </div>
            <el-button size="mini" icon="el-icon-plus" @click="addKV">Add</el-button>
          </div>
        </el-form-item>
      </el-form>

      <span slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible=false">Cancel</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">
          {{ dialogMode === 'create' ? 'Create' : 'Save' }}
        </el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { listCustomers, createCustomer, updateCustomer, deleteCustomer } from '@/api/customers'
import { listPackages } from '@/api/packages'

export default {
  name: 'CustomersIndex',
  data() {
    const validateEmail = (_r, v, cb) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '')) ? cb() : cb(new Error('Valid email required'))
    return {
      loading: false,
      submitting: false,
      lastError: '',
      rows: [],
      total: 0,
      q: { page: 1, per_page: 10, q: '' },

      dialogVisible: false,
      dialogMode: 'create',
      editingId: null,

      form: {
        name: '',
        email: '',
        phone: '',
        package_id: null,
        note: '',
        logoFile: null, // File
        metaKVs: [] // [{key:'', value:''}]
      },
      rules: {
        name: [{ required: true, message: 'Company name is required', trigger: 'blur' }],
        email: [{ required: true, validator: validateEmail, trigger: 'blur' }],
        package_id: [{ required: true, message: 'Please choose a package', trigger: 'change' }]
      },

      packages: [],
      loadingPackages: false,

      previewLogo: ''
    }
  },
  created() {
    this.fetch()
    this.loadPackages()
  },
  methods: {
    parseListResponse(payload) {
      const candidates = [
        payload,
        payload && payload.data,
        payload && payload.data && payload.data.data,
        payload && payload.customers,
        payload && payload.items,
        payload && payload.results
      ]
      let rows = []
      for (const c of candidates) { if (Array.isArray(c)) { rows = c; break } }
      const total =
        (payload && payload.meta && payload.meta.total) ||
        payload?.total ||
        (payload && payload.data && payload.data.meta && payload.data.meta.total) ||
        (Array.isArray(rows) ? rows.length : 0)
      return { rows: rows || [], total: Number(total) || 0 }
    },

    async fetch() {
      this.loading = true
      this.lastError = ''
      try {
        const payload = await listCustomers(this.q)
        const { rows, total } = this.parseListResponse(payload)
        this.rows = rows
        this.total = total
      } catch (e) {
        this.lastError = this.errMsg(e, 'Failed to load customers')
      } finally {
        this.loading = false
      }
    },

    async loadPackages() {
      this.loadingPackages = true
      try {
        const per = 100
        let page = 1
        let all = []
        // naive pagination (backend caps per_page<=100)
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const res = await listPackages({ page, per_page: per })
          const { rows, total } = this.parseListResponse(res)
          if (Array.isArray(rows)) all = all.concat(rows)
          if (!total || all.length >= total || !rows || rows.length < per) break
          page++
        }
        this.packages = all
      } catch (e) {
        this.$message.error(this.errMsg(e, 'Failed to load packages'))
      } finally {
        this.loadingPackages = false
      }
    },

    /* ------------- Dialog actions ------------- */
    openCreate() {
      this.dialogMode = 'create'
      this.editingId = null
      this.dialogVisible = true
      this.resetForm()
      this.$nextTick(() => this.$refs.formRef && this.$refs.formRef.clearValidate())
    },
    openEdit(row) {
      this.dialogMode = 'edit'
      this.editingId = row.id
      this.dialogVisible = true

      // map existing data to form
      this.form = {
        name: row.name || '',
        email: row.email || '',
        phone: row.phone || '',
        package_id: row.package?.id ?? row.package_id ?? null,
        note: row.note || '',
        logoFile: null,
        metaKVs: this.toKVs(row.meta)
      }
      this.previewLogo = row.logo_url || row.logo || ''
      this.$nextTick(() => this.$refs.formRef && this.$refs.formRef.clearValidate())
    },
    resetForm() {
      this.form = { name: '', email: '', phone: '', package_id: null, note: '', logoFile: null, metaKVs: [] }
      this.previewLogo = ''
      if (this.$refs.formRef) this.$refs.formRef.resetFields()
      this.submitting = false
    },

    /* ------------- Logo handling ------------- */
    onLogoChange(file) {
      this.form.logoFile = file.raw || file
      // preview
      if (this.form.logoFile) this.previewLogo = URL.createObjectURL(this.form.logoFile)
    },
    onLogoRemove() {
      this.clearLogo()
    },
    clearLogo() {
      this.form.logoFile = null
      this.previewLogo = ''
    },

    /* ------------- Meta KV editor ------------- */
    addKV() { this.form.metaKVs.push({ key: '', value: '' }) },
    removeKV(i) { this.form.metaKVs.splice(i, 1) },
    toKVs(meta) {
      const arr = []
      if (meta && typeof meta === 'object') {
        Object.keys(meta).forEach(k => arr.push({ key: k, value: String(meta[k]) }))
      }
      return arr
    },
    appendMetaToFormData(fd) {
      for (const { key, value } of this.form.metaKVs) {
        if (key && key.trim() !== '') {
          fd.append(`meta[${key}]`, value == null ? '' : value)
        }
      }
    },

    /* ------------- Submit create/update ------------- */
    submit() {
      this.$refs.formRef.validate(async(valid) => {
        if (!valid) return
        this.submitting = true
        try {
          const fd = new FormData()
          fd.append('name', this.form.name)
          fd.append('email', this.form.email)
          if (this.form.phone) fd.append('phone', this.form.phone)
          if (this.form.note) fd.append('note', this.form.note)
          fd.append('package_id', this.form.package_id)
          if (this.form.logoFile) fd.append('logo', this.form.logoFile)
          this.appendMetaToFormData(fd)

          if (this.dialogMode === 'create') {
            const res = await createCustomer(fd) // POST multipart
            this.$message.success(res?.message || 'Customer created')
          } else {
            // Laravel accepts multipart PATCH; if your server doesn’t, switch to POST + _method
            const res = await updateCustomer(this.editingId, fd)
            this.$message.success(res?.message || 'Customer updated')
          }
          this.dialogVisible = false
          this.fetch()
        } catch (e) {
          this.$message.error(this.errMsg(e, 'Save failed'))
        } finally {
          this.submitting = false
        }
      })
    },

    async remove(row) {
      try {
        await this.$confirm(`Delete customer "${row.name}"?`, 'Confirm', { type: 'warning' })
        await deleteCustomer(row.id)
        this.$message.success('Customer deleted')
        if (this.rows.length === 1 && this.q.page > 1) this.q.page -= 1
        this.fetch()
      } catch (_) {
        console.log('Delete cancelled')
      }
    },

    /* ------------- helpers ------------- */
    pkgPrice(row) {
      if (row?.package?.price != null) return row.package.price
      if (row?.package_price != null) return row.package_price
      return null
    },
    formatPrice(p) {
      const n = Number(p)
      return Number.isFinite(n) ? n.toLocaleString() : (p == null ? '-' : p)
    },
    errMsg(err, fallback) {
      return (
        err?.response?.data?.message ||
        (err?.response?.data?.errors && Object.values(err.response.data.errors)[0][0]) ||
        err?.message ||
        fallback
      )
    }
  }
}
</script>

<style scoped>
.header{margin-bottom:8px}
.toolbar{display:flex;align-items:center;margin-bottom:12px}
.flex-spacer{flex:1}
.mr-2{margin-right:8px}
.mb-2{margin-bottom:12px}
.pagination{margin-top:12px;text-align:right}
.muted{color:#999;font-size:12px}
.form{max-width:780px}
.logo-preview{margin-top:6px}
.logo-preview img{height:40px;border-radius:6px;border:1px solid #eee}
.ml-1{margin-left:6px}
.meta-grid{display:flex;flex-direction:column;gap:6px}
.meta-row{display:grid;grid-template-columns:1fr 1fr auto;gap:6px}
</style>
