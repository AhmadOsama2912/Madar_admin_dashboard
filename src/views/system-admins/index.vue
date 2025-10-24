<template>
  <div class="app-container">
    <el-card shadow="never">
      <!-- Toolbar -->
      <div class="toolbar">
        <el-input
          v-model="q.keyword"
          placeholder="Search name / username / email…"
          clearable
          class="mr-2"
          style="max-width:320px"
          @keyup.enter.native="fetch"
        />
        <el-button type="primary" icon="el-icon-search" @click="fetch">Search</el-button>

        <div class="flex-spacer" />

        <!-- Create admin (HIDDEN if not allowed) -->
        <el-button
          v-if="canCreate"
          type="primary"
          icon="el-icon-plus"
          @click="openCreate"
        >
          Create Admin
        </el-button>
      </div>

      <!-- Table -->
      <el-table v-loading="loading" :data="rows" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="Name" />
        <el-table-column prop="username" label="Username" width="160" />
        <el-table-column prop="email" label="Email" width="240" />
        <el-table-column label="Super Admin" width="140">
          <template #default="{ row }">
            <el-tag :type="row.is_super_admin ? 'success' : 'info'">
              {{ row.is_super_admin ? 'Yes' : 'No' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="Actions" width="200" fixed="right">
          <template #default="{ row }">
            <!-- Edit (HIDDEN if not allowed) -->
            <el-button
              v-if="canEdit(row)"
              size="mini"
              @click="openEdit(row)"
            >
              Edit
            </el-button>

            <!-- Delete (HIDDEN if not allowed) -->
            <el-button
              v-if="canDelete(row)"
              size="mini"
              type="danger"
              @click="remove(row)"
            >
              Delete
            </el-button>
          </template>
        </el-table-column>

        <template #empty>
          <div class="empty">
            <span>No admins found.</span>
            <el-button type="text" @click="fetch">Refresh</el-button>
          </div>
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

    <!-- Create / Edit dialog -->
    <el-dialog
      :title="dialogMode === 'create' ? 'Create Admin' : 'Edit Admin'"
      :visible.sync="dialogVisible"
      width="520px"
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="140px">
        <el-form-item label="Name" prop="name">
          <el-input v-model.trim="form.name" autocomplete="off" />
        </el-form-item>

        <el-form-item label="Username" prop="username">
          <el-input
            v-model.trim="form.username"
            autocomplete="off"
            :disabled="dialogMode==='edit'"
          />
        </el-form-item>

        <el-form-item label="Email" prop="email">
          <el-input
            v-model.trim="form.email"
            autocomplete="off"
            :disabled="dialogMode==='edit'"
          />
        </el-form-item>

        <!-- Password required on create, optional on edit -->
        <el-form-item label="Password" prop="password">
          <el-input v-model="form.password" type="password" autocomplete="new-password" show-password />
        </el-form-item>
        <el-form-item label="Confirm Password" prop="password_confirmation">
          <el-input v-model="form.password_confirmation" type="password" autocomplete="new-password" show-password />
        </el-form-item>

        <el-form-item label="Super Admin" prop="is_super_admin">
          <el-switch v-model="form.is_super_admin" :active-value="true" :inactive-value="false" />
        </el-form-item>
      </el-form>

      <span slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible=false">Cancel</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">Save</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import { listAdmins, createAdmin, updateAdmin, deleteAdmin } from '@/api/admins'

export default {
  name: 'SystemAdmins',
  data() {
    const validEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '')
    const validateEmail = (_r, v, cb) => (validEmail(v) ? cb() : cb(new Error('Invalid email')))
    const validatePwd = (_r, v, cb) => {
      if (this.dialogMode === 'create') {
        if (!v || v.length < 6) return cb(new Error('Min 6 characters'))
      } else if (v && v.length < 6) {
        return cb(new Error('Min 6 characters'))
      }
      cb()
    }
    const validatePwdConfirm = (_r, v, cb) => {
      if (this.dialogMode === 'create' || this.form.password) {
        if (!v) return cb(new Error('Please confirm password'))
        if (v !== this.form.password) return cb(new Error('Passwords do not match'))
      }
      cb()
    }

    return {
      loading: false,
      submitting: false,
      rows: [],
      total: 0,
      q: { page: 1, per_page: 10, keyword: '' },

      dialogVisible: false,
      dialogMode: 'create', // 'create' | 'edit'
      editingId: null,

      form: {
        name: '',
        username: '',
        email: '',
        password: '',
        password_confirmation: '',
        is_super_admin: false
      },
      rules: {
        name: [{ required: true, message: 'Required', trigger: 'blur' }],
        username: [{ required: true, message: 'Required', trigger: 'blur' }],
        email: [{ required: true, validator: validateEmail, trigger: 'blur' }],
        password: [{ validator: validatePwd, trigger: 'blur' }],
        password_confirmation: [{ validator: validatePwdConfirm, trigger: 'blur' }]
      }
    }
  },
  computed: {
    ...mapGetters(['admin', 'roles']), // ensure these getters exist in your store
    // robust super-admin check (roles OR admin flag)
    isSuperAdmin() {
      return (this.roles && this.roles.includes('superadmin')) || !!this.admin?.is_super_admin
    },
    myId() {
      return this.admin?.id || 0
    },
    // permissions for UI
    canCreate() { return this.isSuperAdmin },
    canEdit() { return () => this.isSuperAdmin },
    canDelete() { return (row) => this.isSuperAdmin && row.id !== this.myId }
  },
  created() { this.fetch() },
  methods: {
    async fetch() {
      this.loading = true
      try {
        const res = await listAdmins({ page: this.q.page, per_page: this.q.per_page, q: this.q.keyword })
        this.rows = res.data || res.items || []
        this.total = res?.meta?.total ?? res?.total ?? this.rows.length
      } catch (e) {
        this.showError(e, 'Failed to load admins')
      } finally {
        this.loading = false
      }
    },

    openCreate() {
      if (!this.canCreate) return
      this.dialogMode = 'create'
      this.editingId = null
      this.dialogVisible = true
      this.resetForm()
    },
    openEdit(row) {
      if (!this.canEdit(row)) return
      this.dialogMode = 'edit'
      this.editingId = row.id
      this.dialogVisible = true
      this.form = {
        name: row.name,
        username: row.username,
        email: row.email,
        password: '',
        password_confirmation: '',
        is_super_admin: !!row.is_super_admin
      }
      this.$nextTick(() => this.$refs.formRef?.clearValidate())
    },
    resetForm() {
      this.form = {
        name: '',
        username: '',
        email: '',
        password: '',
        password_confirmation: '',
        is_super_admin: false
      }
      this.$refs.formRef && this.$refs.formRef.resetFields()
    },

    submit() {
      this.$refs.formRef.validate(async(valid) => {
        if (!valid) return
        this.submitting = true
        try {
          if (this.dialogMode === 'create') {
            const payload = { ...this.form } // matches your request body
            const res = await createAdmin(payload)
            this.$message.success(res?.message || 'Admin created')
          } else {
            const p = {
              name: this.form.name,
              is_super_admin: this.form.is_super_admin
            }
            if (this.form.password) {
              p.password = this.form.password
              p.password_confirmation = this.form.password_confirmation
            }
            const res = await updateAdmin(this.editingId, p)
            this.$message.success(res?.message || 'Admin updated')
          }
          this.dialogVisible = false
          this.fetch()
        } catch (e) {
          this.showError(e, 'Save failed')
        } finally {
          this.submitting = false
        }
      })
    },

    async remove(row) {
      if (!this.canDelete(row)) return
      try {
        await this.$confirm(`Delete admin "${row.name}"?`, 'Confirm', { type: 'warning' })
        await deleteAdmin(row.id)
        this.$message.success('Admin deleted')
        this.fetch()
      } catch (_) { /* canceled or failed */ }
    },

    showError(err, fallback) {
      // Show 403/422 nicely
      const msg =
        err?.response?.data?.message ||
        (err?.response?.data?.errors && Object.values(err.response.data.errors)[0][0]) ||
        err?.message ||
        fallback
      this.$message.error(msg)
    }
  }
}
</script>

<style scoped>
.toolbar{display:flex;align-items:center;margin-bottom:12px}
.flex-spacer{flex:1}
.mr-2{margin-right:8px}
.pagination{margin-top:12px;text-align:right}
.empty{padding:16px;color:#999}
</style>
