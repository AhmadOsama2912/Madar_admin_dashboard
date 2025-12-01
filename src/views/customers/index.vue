<template>
  <div class="app-container" :dir="isRTL ? 'rtl' : 'ltr'">
    <el-card shadow="never">
      <!-- Header -->
      <div class="header">
        <h3>{{ $t('customers.title') }}</h3>
      </div>

      <!-- Error alert -->
      <el-alert
        v-if="lastError"
        :title="lastError"
        type="error"
        :closable="false"
        class="mb-2"
      />

      <!-- Toolbar -->
      <div class="toolbar">
        <el-input
          v-model="q.q"
          :placeholder="$t('customers.search_placeholder')"
          clearable
          class="search-input"
          @keyup.enter.native="fetch"
        />
        <el-button type="primary" @click="fetch">
          {{ $t('common.search') }}
        </el-button>

        <div class="flex-spacer" />

        <el-button type="primary" icon="el-icon-plus" @click="openCreate">
          {{ $t('customers.create_title') }}
        </el-button>
      </div>

      <!-- Table -->
      <el-table
        :key="tableKey"
        v-loading="loading"
        :data="rows"
        border
        style="width: 100%"
      >
        <!-- ID -->
        <el-table-column
          prop="id"
          :label="$t('common.id')"
          width="90"
          align="center"
        />

        <!-- Logo -->
        <el-table-column
          :label="$t('customers.logo')"
          width="100"
          align="center"
        >
          <template slot-scope="{ row }">
            <el-avatar
              v-if="row.logo_url || row.logo"
              :src="row.logo_url || row.logo"
              size="small"
              shape="square"
              class="logo-avatar"
            />
            <span v-else class="muted">—</span>
          </template>
        </el-table-column>

        <!-- Company Name -->
        <el-table-column
          prop="name"
          :label="$t('customers.company')"
          min-width="180"
        />

        <!-- Email -->
        <el-table-column
          prop="email"
          :label="$t('customers.email')"
          min-width="230"
        />

        <!-- Phone -->
        <el-table-column
          prop="phone"
          :label="$t('customers.phone')"
          min-width="160"
        />

        <!-- Package -->
        <el-table-column
          :label="$t('customers.package')"
          min-width="200"
        >
          <template slot-scope="{ row }">
            <span>
              {{ (row.package && row.package.name) || row.package_name || '-' }}
            </span>
            <span v-if="pkgPrice(row) !== null" class="muted">
              — {{ formatPrice(pkgPrice(row)) }}
            </span>
          </template>
        </el-table-column>

        <!-- Screens Count -->
        <el-table-column
          :label="$t('customers.screens')"
          width="110"
          align="center"
        >
          <template slot-scope="{ row }">
            {{ row.screens_count != null ? row.screens_count : '-' }}
          </template>
        </el-table-column>

        <!-- Created At -->
        <el-table-column
          prop="created_at"
          :label="$t('common.created_at')"
          width="200"
        >
          <template slot-scope="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>

        <!-- Actions -->
        <el-table-column
          class-name="actions-col"
          :label="$t('common.actions')"
          width="220"
          align="center"
        >
          <template slot-scope="{ row }">
            <el-button size="mini" @click="openEdit(row)">
              {{ $t('common.edit') }}
            </el-button>
            <el-button
              size="mini"
              type="danger"
              @click="remove(row)"
            >
              {{ $t('common.delete') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="pagination">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :current-page.sync="q.page"
          :page-size="q.per_page"
          :total="total"
          @current-change="fetch"
        />
      </div>
    </el-card>

    <!-- Create/Edit Dialog -->
    <el-dialog
      :title="dialogMode === 'create'
        ? $t('customers.create_title')
        : $t('customers.edit_title')"
      :visible.sync="dialogVisible"
      width="760px"
      @closed="resetForm"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="160px"
      >
        <el-form-item :label="$t('customers.company')" prop="name">
          <el-input v-model.trim="form.name" autocomplete="off" />
        </el-form-item>

        <el-form-item :label="$t('customers.email')" prop="email">
          <el-input v-model.trim="form.email" autocomplete="off" />
        </el-form-item>

        <el-form-item :label="$t('customers.phone')" prop="phone">
          <el-input
            v-model.trim="form.phone"
            autocomplete="off"
            :placeholder="$t('common.optional')"
          />
        </el-form-item>

        <el-form-item :label="$t('customers.package')" prop="package_id">
          <el-select
            v-model="form.package_id"
            :placeholder="$t('customers.select_package')"
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

        <el-form-item :label="$t('customers.note')">
          <el-input
            v-model.trim="form.note"
            type="textarea"
            :rows="3"
            :placeholder="$t('common.optional')"
          />
        </el-form-item>

        <el-form-item :label="$t('customers.logo')">
          <el-upload
            class="logo-uploader"
            action=""
            :auto-upload="false"
            :show-file-list="false"
            accept="image/*"
            :on-change="onLogoChange"
          >
            <el-button size="small" icon="el-icon-upload">
              {{ $t('common.select') }}
            </el-button>
            <span v-if="form.logoFile" class="muted ml-1">
              {{ form.logoFile.name }}
            </span>
          </el-upload>

          <div v-if="previewLogo" class="logo-preview">
            <img :src="previewLogo" alt="logo">
            <el-button size="mini" @click="clearLogo">
              {{ $t('common.clear') }}
            </el-button>
          </div>
        </el-form-item>

        <el-form-item :label="$t('customers.meta')">
          <div class="meta-grid">
            <div
              v-for="(kv, idx) in form.metaKVs"
              :key="idx"
              class="meta-row"
            >
              <el-input v-model="kv.key" placeholder="key" size="small" />
              <el-input v-model="kv.value" placeholder="value" size="small" />
              <el-button
                icon="el-icon-delete"
                type="text"
                @click="removeKV(idx)"
              />
            </div>
            <el-button size="mini" icon="el-icon-plus" @click="addKV">
              {{ $t('common.add') }}
            </el-button>
          </div>
        </el-form-item>
      </el-form>

      <span slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">
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
import {
  listCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer
} from '@/api/customers'
import { listPackages } from '@/api/packages'

export default {
  name: 'CustomersIndex',
  data() {
    const validateEmail = (_r, v, cb) => {
      if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v))) {
        return cb(new Error(this.$t('validation.invalid_email')))
      }
      cb()
    }

    return {
      loading: false,
      loadingPackages: false,
      rows: [],
      total: 0,
      q: { page: 1, per_page: 15, q: '' },
      packages: [],
      lastError: '',
      dialogVisible: false,
      dialogMode: 'create',
      editingId: null,
      submitting: false,
      previewLogo: null,
      form: {
        name: '',
        email: '',
        phone: '',
        package_id: null,
        note: '',
        logoFile: null,
        metaKVs: []
      },
      rules: {
        name: [{ required: true, message: this.$t('validation.required'), trigger: 'blur' }],
        email: [{ validator: validateEmail, trigger: 'blur' }]
      }
    }
  },
  computed: {
    isRTL() {
      return this.$i18n?.locale?.startsWith('ar') ||
        (typeof localStorage !== 'undefined' && (localStorage.getItem('madar_locale') || 'en').startsWith('ar'))
    },
    tableKey() {
      return this.isRTL ? 'customers-rtl-v2' : 'customers-ltr-v2'
    }
  },
  created() {
    this.fetch()
    this.loadPackages()
  },
  methods: {
    async fetch() {
      this.loading = true
      this.lastError = ''
      try {
        const res = await listCustomers(this.q)
        this.rows = res.data || res.items || []
        this.total = res?.meta?.total ?? res?.total ?? this.rows.length
      } catch (e) {
        this.lastError = this.extractErr(e, this.$t('customers.load_fail'))
      } finally {
        this.loading = false
      }
    },

    async loadPackages() {
      this.loadingPackages = true
      try {
        const res = await listPackages({ page: 1, per_page: 999 })
        this.packages = res.data || res.items || []
      } catch (_) { /* ignore */ } finally {
        this.loadingPackages = false
      }
    },

    pkgPrice(row) {
      const p = row.package || {}
      return p.price ?? row.price ?? null
    },

    openCreate() {
      this.dialogMode = 'create'
      this.editingId = null
      this.resetForm()
      this.dialogVisible = true
    },

    openEdit(row) {
      this.dialogMode = 'edit'
      this.editingId = row.id
      this.form = {
        name: row.name || '',
        email: row.email || '',
        phone: row.phone || '',
        package_id: row.package_id || (row.package && row.package.id) || null,
        note: row.note || '',
        logoFile: null,
        metaKVs: (row.meta && typeof row.meta === 'object')
          ? Object.entries(row.meta).map(([key, value]) => ({ key, value: String(value) }))
          : []
      }
      this.previewLogo = row.logo_url || row.logo || null
      this.dialogVisible = true
    },

    resetForm() {
      this.form = {
        name: '', email: '', phone: '', package_id: null, note: '', logoFile: null, metaKVs: []
      }
      this.previewLogo = null
      this.$nextTick(() => {
        this.$refs.formRef?.resetFields()
        this.$refs.formRef?.clearValidate()
      })
    },

    onLogoChange(file) {
      this.form.logoFile = file.raw
      const reader = new FileReader()
      // reader.onload = e => this.previewLogo = e.target.result
      reader.readAsDataURL(file.raw)
    },

    clearLogo() {
      this.form.logoFile = null
      this.previewLogo = null
    },

    async remove(row) {
      try {
        await this.$confirm(this.$t('customers.delete_confirm'), this.$t('customers.delete_title'), { type: 'warning' })
        await deleteCustomer(row.id)
        this.$message.success(this.$t('customers.delete_success'))
        if (this.rows.length === 1 && this.q.page > 1) this.q.page--
        this.fetch()
      } catch (_) { /* cancelled */ }
    },

    async submit() {
      this.$refs.formRef.validate(async valid => {
        if (!valid) return
        this.submitting = true
        try {
          const payload = {
            name: this.form.name,
            email: this.form.email,
            phone: this.form.phone || null,
            package_id: this.form.package_id,
            note: this.form.note || null,
            meta: this.safeMeta()
          }
          if (this.form.logoFile) payload.logo = this.form.logoFile

          if (this.dialogMode === 'create') {
            await createCustomer(payload)
            this.$message.success(this.$t('customers.create_success'))
          } else {
            await updateCustomer(this.editingId, payload)
            this.$message.success(this.$t('customers.update_success'))
          }

          this.dialogVisible = false
          this.fetch()
        } catch (e) {
          this.$message.error(this.extractErr(e, this.$t('customers.save_fail')))
        } finally {
          this.submitting = false
        }
      })
    },

    addKV() { this.form.metaKVs.push({ key: '', value: '' }) },
    removeKV(i) { this.form.metaKVs.splice(i, 1) },
    safeMeta() {
      const meta = {}
      this.form.metaKVs.forEach(({ key, value }) => { if (key.trim()) meta[key.trim()] = value })
      return Object.keys(meta).length ? meta : null
    },

    extractErr(err, fallback) {
      return err?.response?.data?.message ||
        (err?.response?.data?.errors && Object.values(err.response.data.errors)[0][0]) ||
        err?.message || fallback
    },

    formatDate(v) {
      if (!v) return '—'
      return new Date(v).toLocaleString(this.$i18n?.locale || 'en')
    },

    formatPrice(val) {
      if (val == null) return ''
      const n = Number(val)
      return Number.isFinite(n) ? n.toLocaleString() : val
    }
  }
}
</script>

<style scoped>
.header h3 {
  margin: 0 0 16px;
  font-size: 20px;
  font-weight: bold;
}

.toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.search-input {
  max-width: 320px;
}

.flex-spacer { flex: 1; }

.pagination {
  margin-top: 20px;
  text-align: center;
}

.muted { color: #999; font-size: 13px; }
.ml-1 { margin-left: 8px; }

/* Logo */
.logo-avatar { vertical-align: middle; }
.logo-preview { margin-top: 10px; display: flex; align-items: center; gap: 10px; }
.logo-preview img { width: 60px; height: 60px; object-fit: contain; border: 1px solid #ddd; border-radius: 4px; }

/* Meta */
.meta-grid { display: flex; flex-direction: column; gap: 8px; }
.meta-row { display: flex; gap: 8px; align-items: center; }
.meta-row .el-input { flex: 1; }

/* RTL Fixes */
[dir="rtl"] .toolbar { flex-direction: row-reverse; text-align: right; }
[dir="rtl"] .pagination { direction: rtl; }

/* Ensure table cells don't overflow */
:deep(.el-table .cell) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
