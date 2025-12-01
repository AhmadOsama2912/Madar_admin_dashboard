<template>
  <div class="app-container" :dir="isRTL ? 'rtl' : 'ltr'">
    <el-card shadow="never">
      <!-- Toolbar -->
      <div class="toolbar">
        <el-input
          v-model="q.keyword"
          :placeholder="$t('system_admins.search_placeholder')"
          clearable
          class="mr-2"
          style="max-width:320px"
          @keyup.enter.native="fetch"
        />
        <el-button type="primary" @click="fetch">
          {{ $t('common.search') }}
        </el-button>

        <div class="flex-spacer" />

        <el-button
          v-if="canCreate"
          type="primary"
          icon="el-icon-plus"
          @click="openCreate"
        >
          {{ $t('system_admins.create_title') }}
        </el-button>
      </div>

      <!-- Table -->
      <el-table
        v-loading="loading"
        :data="rows"
        border
        style="width: 100%"
      >
        <!-- ID Column (بدون fixed) -->
        <el-table-column
          prop="id"
          :label="$t('common.id')"
          width="80"
          align="center"
        />

        <!-- Name -->
        <el-table-column
          prop="name"
          :label="$t('common.name')"
          min-width="180"
        />

        <!-- Username -->
        <el-table-column
          prop="username"
          :label="$t('common.username')"
          min-width="160"
        />

        <!-- Email -->
        <el-table-column
          prop="email"
          :label="$t('common.email')"
          min-width="220"
        />

        <!-- Super Admin -->
        <el-table-column
          prop="is_super_admin"
          :label="$t('system_admins.super_admin')"
          width="140"
        >
          <template #default="{ row }">
            <el-tag :type="row.is_super_admin ? 'success' : 'info'">
              {{ row.is_super_admin ? $t('common.yes') : $t('common.no') }}
            </el-tag>
          </template>
        </el-table-column>

        <!-- Actions (بدون fixed) -->
        <el-table-column
          :label="$t('common.actions')"
          width="200"
          align="center"
        >
          <template #default="{ row }">
            <el-button
              v-if="canEdit(row)"
              size="mini"
              @click="openEdit(row)"
            >
              {{ $t('common.edit') }}
            </el-button>
            <el-button
              v-if="canDelete(row)"
              size="mini"
              type="danger"
              @click="remove(row)"
            >
              {{ $t('common.delete') }}
            </el-button>
          </template>
        </el-table-column>

        <!-- Empty state -->
        <template #empty>
          <el-empty :description="$t('system_admins.empty')">
            <div class="mt-1">
              <el-button type="text" @click="fetch">
                {{ $t('common.refresh') }}
              </el-button>
            </div>
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

    <!-- Dialog -->
    <el-dialog
      :title="dialogMode === 'create'
        ? $t('system_admins.create_title')
        : $t('system_admins.edit_title')"
      :visible.sync="dialogVisible"
      width="520px"
      @closed="resetForm"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="160px"
      >
        <el-form-item :label="$t('common.name')" prop="name">
          <el-input v-model.trim="form.name" autocomplete="off" />
        </el-form-item>

        <el-form-item :label="$t('common.username')" prop="username">
          <el-input
            v-model.trim="form.username"
            autocomplete="off"
            :disabled="dialogMode==='edit'"
          />
        </el-form-item>

        <el-form-item :label="$t('common.email')" prop="email">
          <el-input
            v-model.trim="form.email"
            autocomplete="off"
            :disabled="dialogMode==='edit'"
          />
        </el-form-item>

        <!-- Password required on create, optional on edit -->
        <el-form-item :label="$t('common.password')" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            autocomplete="new-password"
            show-password
          />
        </el-form-item>

        <el-form-item
          :label="$t('common.confirm_password')"
          prop="password_confirmation"
        >
          <el-input
            v-model="form.password_confirmation"
            type="password"
            autocomplete="new-password"
            show-password
          />
        </el-form-item>

        <el-form-item
          :label="$t('system_admins.super_admin')"
          prop="is_super_admin"
        >
          <el-switch
            v-model="form.is_super_admin"
            :active-value="true"
            :inactive-value="false"
          />
        </el-form-item>
      </el-form>

      <span slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible=false">
          {{ $t('common.cancel') }}
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="submit"
        >
          {{ dialogMode === 'create'
            ? $t('common.create')
            : $t('common.save') }}
        </el-button>
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
    const validateEmail = (_r, v, cb) => {
      if (!v) return cb(new Error(this.$t('validation.required')))
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(v) ? cb() : cb(new Error(this.$t('validation.invalid_email')))
    }
    const validatePwd = (_r, v, cb) => {
      if (this.dialogMode === 'create') {
        if (!v) return cb(new Error(this.$t('validation.required')))
        if (v.length < 6) return cb(new Error(this.$t('validation.min_length', { n: 6 })))
      } else if (v && v.length < 6) {
        return cb(new Error(this.$t('validation.min_length', { n: 6 })))
      }
      cb()
    }
    const validatePwdConfirm = (_r, v, cb) => {
      if (this.dialogMode === 'create' || this.form.password) {
        if (!v) return cb(new Error(this.$t('validation.password_mismatch')))
        if (v !== this.form.password) return cb(new Error(this.$t('validation.password_mismatch')))
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
      dialogMode: 'create',
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
        name: [{ required: true, message: this.$t('validation.required'), trigger: 'blur' }],
        username: [{ required: true, message: this.$t('validation.required'), trigger: 'blur' }],
        email: [{ validator: validateEmail, trigger: 'blur' }],
        password: [{ validator: validatePwd, trigger: 'blur' }],
        password_confirmation: [{ validator: validatePwdConfirm, trigger: 'blur' }]
      }
    }
  },
  computed: {
    ...mapGetters(['admin', 'roles']),
    isSuperAdmin() {
      return (this.roles && this.roles.includes('superadmin')) || !!this.admin?.is_super_admin
    },
    myId() {
      return this.admin?.id || 0
    },
    canCreate() { return this.isSuperAdmin },
    canEdit() { return () => this.isSuperAdmin },
    canDelete() { return (row) => this.isSuperAdmin && row.id !== this.myId },
    isRTL() {
      if (this.$i18n && this.$i18n.locale) {
        return this.$i18n.locale.startsWith('ar')
      }
      if (typeof window !== 'undefined') {
        try {
          return (localStorage.getItem('madar_locale') || 'en').startsWith('ar')
        } catch (e) {
          console.error(e)
        }
      }
      return false
    }
  },
  created() {
    this.fetch()
  },
  methods: {
    async fetch() {
      this.loading = true
      try {
        const res = await listAdmins({ page: this.q.page, per_page: this.q.per_page, q: this.q.keyword })
        this.rows = res.data || res.items || []
        this.total = res?.meta?.total ?? res?.total ?? this.rows.length
      } catch (e) {
        this.$message.error(this.extractErr(e, this.$t('system_admins.load_fail')))
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
      this.$nextTick(() => this.$refs.formRef?.clearValidate())
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
    async submit() {
      this.$refs.formRef.validate(async(valid) => {
        if (!valid) return
        this.submitting = true
        try {
          if (this.dialogMode === 'create') {
            const res = await createAdmin({ ...this.form })
            this.$message.success(res?.message || this.$t('system_admins.create_success'))
          } else {
            const payload = {
              name: this.form.name,
              is_super_admin: this.form.is_super_admin
            }
            if (this.form.password) {
              payload.password = this.form.password
              payload.password_confirmation = this.form.password_confirmation
            }
            const res = await updateAdmin(this.editingId, payload)
            this.$message.success(res?.message || this.$t('system_admins.update_success'))
          }
          this.dialogVisible = false
          this.fetch()
        } catch (e) {
          this.$message.error(this.extractErr(e, this.$t('system_admins.save_fail') || 'Save failed'))
        } finally {
          this.submitting = false
        }
      })
    },
    async remove(row) {
      if (!this.canDelete(row)) return
      try {
        await this.$confirm(
          this.$t('system_admins.delete_confirm', { name: row.name }),
          this.$t('system_admins.delete_title'),
          { type: 'warning' }
        )
        await deleteAdmin(row.id)
        this.$message.success(this.$t('system_admins.delete_success'))
        this.fetch()
      } catch (_) {
        console.log('Delete cancelled or failed')
      }
    },
    extractErr(err, fallback) {
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
.toolbar { display: flex; align-items: center; margin-bottom: 12px; }
.flex-spacer { flex: 1; }
.mr-2 { margin-right: 8px; }
.pagination { margin-top: 12px; text-align: right; }
.mt-1 { margin-top: 8px; }
[dir='rtl'] .toolbar { flex-direction: row-reverse; }
[dir='rtl'] .mr-2 { margin-right: 0; margin-left: 8px; }
[dir='rtl'] .pagination { text-align: left; }
</style>
