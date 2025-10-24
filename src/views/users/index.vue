<template>
  <div class="app-container">
    <el-card shadow="never">
      <!-- Toolbar -->
      <div class="toolbar">
        <el-input
          v-model="q.q"
          placeholder="Search username / email…"
          clearable
          class="mr-2"
          style="max-width:280px"
          @keyup.enter.native="fetch"
        />
        <el-select v-model="q.role" clearable placeholder="Role" class="mr-2" style="width:160px">
          <el-option label="Manager" value="manager" />
          <el-option label="Supervisor" value="supervisor" />
        </el-select>
        <el-select v-model="q.customer_id" clearable filterable placeholder="Customer" class="mr-2" style="width:260px">
          <el-option v-for="c in customers" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
        <el-button type="primary" icon="el-icon-search" @click="fetch">Search</el-button>

        <div class="flex-spacer" />
        <el-button type="primary" icon="el-icon-plus" @click="openCreate">Create User</el-button>
      </div>

      <!-- Table -->
      <el-table v-loading="loading" :data="rows" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="Username" min-width="160" />
        <el-table-column prop="email" label="Email" min-width="220" />
        <el-table-column label="Role" width="140">
          <template slot-scope="{ row }">
            <el-tag :type="row.role === 'manager' ? 'success' : ''">
              {{ row.role }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Customer" min-width="220">
          <template slot-scope="{ row }">
            <span v-if="row.customer && row.customer.name">
              {{ row.customer.name }}
              <span v-if="row.customer.package" class="muted"> — {{ row.customer.package.name }}</span>
            </span>
            <span v-else>#{{ row.customer_id || (row.customer && row.customer.id) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="Created At" width="190">
          <template slot-scope="{ row }">{{ formatDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="Actions" width="200" fixed="right">
          <template slot-scope="{ row }">
            <el-button size="mini" @click="openEdit(row)">Edit</el-button>
            <el-button size="mini" type="danger" @click="remove(row)">Delete</el-button>
          </template>
        </el-table-column>

        <template slot="empty">
          <el-empty description="No users found">
            <div class="mt-1"><el-button type="text" @click="fetch">Refresh</el-button></div>
          </el-empty>
        </template>
      </el-table>

      <!-- Pagination -->
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

    <!-- Create/Edit dialog -->
    <el-dialog
      :title="dlgMode==='create' ? 'Create User' : 'Edit User'"
      :visible.sync="dlgVisible"
      width="640px"
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="140px">
        <el-form-item label="Customer" prop="customer_id">
          <el-select v-model="form.customer_id" placeholder="Select customer" filterable style="width:100%">
            <el-option v-for="c in customers" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="Role" prop="role">
          <el-radio-group v-model="form.role">
            <el-radio label="manager">Manager</el-radio>
            <el-radio label="supervisor">Supervisor</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="Username" prop="username">
          <el-input v-model.trim="form.username" autocomplete="off" />
        </el-form-item>
        <el-form-item label="Email" prop="email">
          <el-input v-model.trim="form.email" autocomplete="off" />
        </el-form-item>

        <!-- Password required only on create -->
        <el-form-item label="Password" :prop="dlgMode==='create' ? 'password' : 'passwordOptional'">
          <el-input v-model.trim="form.password" type="password" autocomplete="new-password" />
          <div v-if="dlgMode!=='create'" class="hint">Leave empty to keep current password.</div>
        </el-form-item>
        <el-form-item label="Confirm" :prop="dlgMode==='create' ? 'password_confirmation' : 'passwordConfirmationOptional'">
          <el-input v-model.trim="form.password_confirmation" type="password" autocomplete="new-password" />
        </el-form-item>

        <el-form-item label="Phone">
          <el-input v-model.trim="form.phone" />
        </el-form-item>

        <el-form-item label="Meta (JSON)">
          <el-input v-model.trim="form.metaText" type="textarea" :rows="3" placeholder="{&quot;key&quot;:&quot;value&quot;} (optional)" />
        </el-form-item>
      </el-form>

      <span slot="footer">
        <el-button @click="dlgVisible=false">Cancel</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">
          {{ dlgMode==='create' ? 'Create' : 'Save' }}
        </el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { listUsers, createUser, updateUser, deleteUser } from '@/api/users'
import { listCustomers } from '@/api/customers'

export default {
  name: 'UserManagementPage',
  data() {
    const emailValidator = (_r, v, cb) => (!v ? cb(new Error('Email is required'))
      : (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? cb() : cb(new Error('Invalid email'))))
    const confirmCreate = (r, v, cb) => (v === this.form.password ? cb() : cb(new Error('Passwords do not match')))
    const confirmEdit = (r, v, cb) => (this.form.password ? (v === this.form.password ? cb() : cb(new Error('Passwords do not match'))) : cb())

    return {
      // list
      loading: false,
      rows: [],
      total: 0,
      q: { page: 1, per_page: 10, q: '', role: '', customer_id: null },

      customers: [],
      // dialog
      dlgVisible: false,
      dlgMode: 'create',
      submitting: false,
      form: {
        customer_id: null, role: 'manager',
        username: '', email: '', phone: '',
        password: '', password_confirmation: '',
        metaText: ''
      },
      rules: {
        customer_id: [{ required: true, message: 'Customer is required', trigger: 'change' }],
        role: [{ required: true, message: 'Role is required', trigger: 'change' }],
        username: [{ required: true, message: 'Username is required', trigger: 'blur' }],
        email: [{ validator: emailValidator, trigger: 'blur' }],
        // create-only
        password: [{ required: true, message: 'Password is required', trigger: 'blur' }],
        password_confirmation: [{ validator: confirmCreate, trigger: 'blur' }],
        // edit-only (virtual props so ElementUI can validate)
        passwordOptional: [],
        passwordConfirmationOptional: [{ validator: confirmEdit, trigger: 'blur' }]
      }
    }
  },
  created() {
    this.fetch()
    this.loadCustomers()
  },
  methods: {
    // ---- adapters / utils ----
    parsePaginated(payload) {
      const p = payload && payload.data ? payload.data : payload
      const rows = (p && Array.isArray(p.data)) ? p.data
        : Array.isArray(p) ? p
          : []
      const total = (p && p.meta && typeof p.meta.total !== 'undefined') ? Number(p.meta.total) : rows.length
      return { rows, total }
    },
    formatDate(v) {
      if (!v) return ''
      try { return new Date(v).toLocaleString() } catch (_) { return v }
    },
    safeMeta() {
      if (!this.form.metaText) return null
      try { return JSON.parse(this.form.metaText) } catch (_) { return null }
    },
    // ---- data ----
    async loadCustomers() {
      try {
        const res = await listCustomers({ page: 1, per_page: 100 })
        const { rows } = this.parsePaginated(res)
        this.customers = rows
      } catch (e) {
        this.$message.error(this.err(e, 'Failed to load customers'))
      }
    },
    async fetch() {
      this.loading = true
      try {
        const res = await listUsers(this.q)
        const { rows, total } = this.parsePaginated(res)
        this.rows = rows
        this.total = total
      } catch (e) {
        this.$message.error(this.err(e, 'Failed to load users'))
      } finally {
        this.loading = false
      }
    },
    // ---- CRUD ----
    openCreate() {
      this.dlgMode = 'create'
      this.dlgVisible = true
      this.resetForm()
      this.$nextTick(() => this.$refs.formRef && this.$refs.formRef.clearValidate())
    },
    openEdit(row) {
      this.dlgMode = 'edit'
      this.dlgVisible = true
      this.resetForm()
      this.form.customer_id = row.customer?.id || row.customer_id || null
      this.form.role = row.role || 'manager'
      this.form.username = row.username || ''
      this.form.email = row.email || ''
      this.form.phone = row.phone || ''
      this.form.metaText = row.meta ? JSON.stringify(row.meta, null, 2) : ''
      this.$nextTick(() => this.$refs.formRef && this.$refs.formRef.clearValidate())
    },
    resetForm() {
      this.form = {
        customer_id: null, role: 'manager',
        username: '', email: '', phone: '',
        password: '', password_confirmation: '',
        metaText: ''
      }
    },
    submit() {
      this.$refs.formRef.validate(async valid => {
        if (!valid) return
        this.submitting = true
        try {
          const payload = {
            customer_id: this.form.customer_id,
            role: this.form.role,
            username: this.form.username,
            email: this.form.email,
            phone: this.form.phone || null,
            meta: this.safeMeta()
          }
          if (this.dlgMode === 'create') {
            payload.password = this.form.password
            payload.password_confirmation = this.form.password_confirmation
            await createUser(payload)
            this.$message.success('User created')
          } else {
            // send password only if changed
            if (this.form.password) {
              payload.password = this.form.password
              payload.password_confirmation = this.form.password_confirmation
            }
            // safer: pass id we stored when opening edit
            const selected = this.rows.find(r => r.username === this.form.username && r.email === this.form.email)
            await updateUser(selected ? selected.id : undefined, payload)
            this.$message.success('User updated')
          }
          this.dlgVisible = false
          this.fetch()
        } catch (e) {
          this.$message.error(this.err(e, 'Save failed'))
        } finally {
          this.submitting = false
        }
      })
    },
    async remove(row) {
      try {
        await this.$confirm(`Delete user "${row.username}"?`, 'Confirm', { type: 'warning' })
        await deleteUser(row.id)
        this.$message.success('User deleted')
        if (this.rows.length === 1 && this.q.page > 1) this.q.page -= 1
        this.fetch()
      } catch (_) {
        console.log('Delete cancelled')
      }
    },
    // ---- errors ----
    err(e, fb) {
      const msg =
        e?.response?.data?.message ||
        (e?.response?.data?.errors && Object.values(e.response.data.errors)[0][0]) ||
        e?.message
      return msg || fb
    }
  }
}
</script>

<style scoped>
.toolbar{display:flex;align-items:center;margin-bottom:12px}
.flex-spacer{flex:1}
.mr-2{margin-right:8px}
.pagination{margin-top:12px;text-align:right}
.muted{color:#909399}
.mt-1{margin-top:8px}
.hint{font-size:12px;color:#909399;margin-top:4px}
</style>
