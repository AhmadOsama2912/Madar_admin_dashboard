<template>
  <!-- Add dynamic dir attribute for RTL/LTR based on current locale -->
  <div class="app-container" :dir="isRTL ? 'rtl' : 'ltr'">
    <el-card shadow="never">
      <!-- Toolbar -->
      <div class="toolbar">
        <el-input
          v-model="q.q"
          :placeholder="$t('packages.search_placeholder')"
          clearable
          class="mr-2"
          style="max-width:280px"
          @keyup.enter.native="fetch"
        />
        <el-button type="primary" @click="fetch">
          {{ $t('common.search') }}
        </el-button>

        <div class="flex-spacer" />

        <!-- Create -->
        <el-button
          type="primary"
          icon="el-icon-plus"
          @click="openCreate"
        >
          {{ $t('packages.create_title') }}
        </el-button>
      </div>

      <!-- Table -->
      <el-table v-loading="loading" :data="rows" border>
        <el-table-column
          prop="id"
          :label="$t('common.id')"
          width="80"
        />
        <el-table-column
          prop="name"
          :label="$t('common.name')"
        />
        <el-table-column
          prop="screens_limit"
          :label="$t('packages.screens_limit')"
          width="140"
        />
        <el-table-column
          prop="managers_limit"
          :label="$t('packages.managers')"
          width="120"
        />
        <el-table-column
          prop="supervisors_limit"
          :label="$t('packages.supervisors')"
          width="130"
        />
        <el-table-column
          prop="branches_limit"
          :label="$t('packages.branches')"
          width="110"
        />
        <el-table-column
          prop="price"
          :label="$t('common.price')"
          width="120"
        >
          <template #default="{ row }">
            {{ formatPrice(row.price) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="created_at"
          :label="$t('common.created_at')"
          width="180"
        />
        <!-- Actions بدون fixed عشان ما ينعمل له نسخة مخفية -->
        <el-table-column
          :label="$t('common.actions')"
          width="180"
          align="center"
        >
          <template #default="{ row }">
            <el-button
              size="mini"
              @click="openEdit(row)"
            >
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
          layout="prev, pager, next, total"
          :current-page.sync="q.page"
          :page-size="q.per_page"
          :total="total"
          @current-change="fetch"
        />
      </div>
    </el-card>

    <!-- Create / Edit dialog (one dialog for both) -->
    <el-dialog
      :title="dialogMode==='create'
        ? $t('packages.create_title')
        : $t('packages.edit_title')"
      :visible.sync="dialogVisible"
      width="560px"
      @closed="resetForm"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="180px"
      >
        <el-form-item :label="$t('common.name')" prop="name">
          <el-input
            v-model.trim="form.name"
            autocomplete="off"
          />
        </el-form-item>

        <el-form-item
          :label="$t('packages.screens_limit')"
          prop="screens_limit"
        >
          <el-input-number
            v-model="form.screens_limit"
            :min="0"
            :step="1"
            controls-position="right"
          />
        </el-form-item>

        <el-form-item
          :label="$t('packages.managers')"
          prop="managers_limit"
        >
          <el-input-number
            v-model="form.managers_limit"
            :min="0"
            :step="1"
            controls-position="right"
          />
        </el-form-item>

        <el-form-item
          :label="$t('packages.supervisors')"
          prop="supervisors_limit"
        >
          <el-input-number
            v-model="form.supervisors_limit"
            :min="0"
            :step="1"
            controls-position="right"
          />
        </el-form-item>

        <el-form-item
          :label="$t('packages.branches')"
          prop="branches_limit"
        >
          <el-input-number
            v-model="form.branches_limit"
            :min="0"
            :step="1"
            controls-position="right"
          />
        </el-form-item>

        <el-form-item
          :label="$t('common.price')"
          prop="price"
        >
          <el-input-number
            v-model="form.price"
            :min="0"
            :step="1"
            controls-position="right"
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
          {{ dialogMode==='create'
            ? $t('common.create')
            : $t('common.save') }}
        </el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import {
  listPackages,
  createPackage,
  updatePackage,
  deletePackage
} from '@/api/packages'

export default {
  name: 'PackagesPage',

  data() {
    const requiredNumber = (msg = 'Required') => ({
      validator: (_r, v, cb) => {
        if (v === null || v === undefined || v === '') {
          return cb(new Error(msg))
        }
        if (isNaN(Number(v)) || Number(v) < 0) {
          return cb(new Error('Must be a non-negative number'))
        }
        cb()
      },
      trigger: 'blur'
    })

    return {
      loading: false,
      rows: [],
      total: 0,
      q: { page: 1, per_page: 10, q: '' },

      // dialog state
      dialogVisible: false,
      dialogMode: 'create', // 'create' | 'edit'
      editingId: null,
      submitting: false,
      form: {
        name: '',
        screens_limit: 0,
        managers_limit: 0,
        supervisors_limit: 0,
        branches_limit: 0,
        price: 0
      },
      rules: {
        name: [{ required: true, message: 'Name is required', trigger: 'blur' }],
        screens_limit: [requiredNumber()],
        managers_limit: [requiredNumber()],
        supervisors_limit: [requiredNumber()],
        branches_limit: [requiredNumber()],
        price: [requiredNumber()]
      }
    }
  },

  // 👈 computed فوق created (كما يطلب eslint) ومرة واحدة فقط
  computed: {
    // Determine whether the current locale is RTL (Arabic).
    isRTL() {
      // Use Vue i18n locale if available
      if (this.$i18n && this.$i18n.locale) {
        return this.$i18n.locale.startsWith('ar')
      }
      // Fallback to localStorage where we persist the locale
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('madar_locale') || 'en'
          return stored.startsWith('ar')
        } catch (e) {
          // ignore
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
        const res = await listPackages(this.q)
        this.rows = res.data || res.items || []
        this.total = res?.meta?.total ?? res?.total ?? this.rows.length
      } catch (e) {
        this.$message.error(this.extractErr(e, this.$t('packages.load_fail')))
      } finally {
        this.loading = false
      }
    },

    // ---- Create / Edit dialog ----
    openCreate() {
      this.dialogMode = 'create'
      this.dialogVisible = true
      this.editingId = null
      this.resetForm()
      this.$nextTick(() => this.$refs.formRef?.clearValidate())
    },

    openEdit(row) {
      this.dialogMode = 'edit'
      this.dialogVisible = true
      this.editingId = row.id
      this.form = {
        name: row.name,
        screens_limit: Number(row.screens_limit) || 0,
        managers_limit: Number(row.managers_limit) || 0,
        supervisors_limit: Number(row.supervisors_limit) || 0,
        branches_limit: Number(row.branches_limit) || 0,
        price: Number(row.price) || 0
      }
      this.$nextTick(() => this.$refs.formRef?.clearValidate())
    },

    resetForm() {
      this.form = {
        name: '',
        screens_limit: 0,
        managers_limit: 0,
        supervisors_limit: 0,
        branches_limit: 0,
        price: 0
      }
      this.$refs.formRef && this.$refs.formRef.resetFields()
      this.submitting = false
    },

    submit() {
      this.$refs.formRef.validate(async(valid) => {
        if (!valid) return
        this.submitting = true
        try {
          const payload = { ...this.form }
          if (this.dialogMode === 'create') {
            const res = await createPackage(payload)
            this.$message.success(res?.message || this.$t('packages.create_success'))
          } else {
            const res = await updatePackage(this.editingId, payload)
            this.$message.success(res?.message || this.$t('packages.update_success'))
          }
          this.dialogVisible = false
          this.fetch()
        } catch (e) {
          this.$message.error(this.extractErr(e, this.$t('packages.save_fail') || 'Save failed'))
        } finally {
          this.submitting = false
        }
      })
    },

    async remove(row) {
      try {
        await this.$confirm(
          this.$t('packages.delete_confirm'),
          this.$t('packages.delete_title'),
          { type: 'warning' }
        )
        await deletePackage(row.id)
        this.$message.success(this.$t('packages.delete_success'))
        if (this.rows.length === 1 && this.q.page > 1) this.q.page -= 1
        this.fetch()
      } catch (_) {
        // canceled or failed
      }
    },

    // helpers
    extractErr(err, fallback) {
      return (
        err?.response?.data?.message ||
        (err?.response?.data?.errors && Object.values(err.response.data.errors)[0][0]) ||
        err?.message ||
        fallback
      )
    },

    formatPrice(p) {
      if (p === null || p === undefined || p === '') return '-'
      const n = Number(p)
      return Number.isFinite(n) ? n.toLocaleString() : p
    }
  }
}
</script>

<style scoped>
.toolbar{display:flex;align-items:center;margin-bottom:12px}
.flex-spacer{flex:1}
.mr-2{margin-right:8px}
.pagination{margin-top:12px;text-align:right}

/* When in RTL mode, flip some margins and alignments */
[dir='rtl'] .toolbar {
  flex-direction: row-reverse;
}
[dir='rtl'] .mr-2 {
  margin-right: 0;
  margin-left: 8px;
}
[dir='rtl'] .pagination {
  text-align: left;
}
</style>
