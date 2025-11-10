<template>
  <div class="app-container enroll-page" :class="dirClass">
    <!-- Create form -->
    <el-card shadow="never" class="mb-2">
      <div class="card-header">
        <h3 class="mb-1">{{ $t('enroll.create_title') }}</h3>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        :label-width="formLabelWidth"
        :label-position="isRTL ? 'right' : 'left'"
        class="enroll-form"
      >
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12">
            <el-form-item :label="$t('enroll.form.customer')" prop="customer_id">
              <el-select
                v-model="form.customer_id"
                :placeholder="$t('enroll.form.customer_ph')"
                filterable
                style="width:100%"
                popper-class="rtl-fix"
              >
                <el-option v-for="c in customers" :key="c.id" :label="c.name" :value="c.id" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12">
            <el-form-item :label="$t('enroll.form.max_uses')" prop="max_uses">
              <div class="inline-input">
                <el-input-number v-model="form.max_uses" :min="1" :max="1000" />
                <span class="hint">{{ $t('enroll.form.max_hint') }}</span>
              </div>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12">
            <el-form-item :label="$t('enroll.form.license_days')" prop="license_days">
              <div class="inline-input">
                <el-input-number v-model="form.license_days" :min="1" :max="3650" />
                <span class="hint">{{ $t('enroll.form.lic_hint') }}</span>
              </div>
            </el-form-item>
          </el-col>

          <el-col :xs="24" :sm="12">
            <el-form-item :label="$t('enroll.form.expires_at')">
              <el-date-picker
                v-model="form.expires_at"
                type="datetime"
                :placeholder="$t('enroll.form.expires_ph')"
                style="width:100%"
                popper-class="rtl-fix"
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24">
            <el-form-item :label="$t('enroll.form.note')">
              <el-input
                v-model="form.note"
                type="textarea"
                :rows="2"
                :placeholder="$t('enroll.form.note_ph')"
              />
            </el-form-item>
          </el-col>

          <el-col :xs="24">
            <el-form-item class="actions">
              <el-button type="primary" :loading="submitting" @click="submit">
                {{ $t('enroll.form.create_btn') }}
              </el-button>
              <el-button @click="reset">{{ $t('enroll.form.reset_btn') }}</el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- List -->
    <el-card shadow="never">
      <div class="toolbar">
        <el-input
          v-model="q.q"
          :placeholder="$t('enroll.toolbar.search_ph')"
          clearable
          class="mr-2 toolbar-item"
          style="max-width:260px"
          @keyup.enter.native="fetch"
        />
        <el-select
          v-model="q.customer_id"
          :placeholder="$t('enroll.toolbar.customer_ph')"
          clearable
          filterable
          class="mr-2 toolbar-item"
          style="width:260px"
          popper-class="rtl-fix"
        >
          <el-option v-for="c in customers" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
        <el-button type="primary" icon="el-icon-search" class="toolbar-item" @click="fetch">
          {{ $t('enroll.toolbar.search_btn') }}
        </el-button>

        <div class="flex-spacer" />

        <el-button icon="el-icon-refresh" :loading="loading" class="toolbar-item" @click="fetch">
          {{ $t('app.tv.filters.refresh') }}
        </el-button>
      </div>

      <el-table v-loading="loading" :data="rows" border>
        <el-table-column prop="id" :label="$t('enroll.table.id')" width="90" />
        <el-table-column :label="$t('enroll.table.code')" width="220">
          <template slot-scope="{ row }">
            <el-tag size="medium" class="code-chip">{{ row.code }}</el-tag>
            <el-tooltip :content="$t('app.tv.tooltip.copy_serial')" placement="top">
              <el-button type="text" icon="el-icon-document-copy" @click="copy(row.code)" />
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column :label="$t('enroll.table.customer')" min-width="200">
          <template slot-scope="{ row }">
            {{ (row.customer && row.customer.name) ? row.customer.name : ('#' + row.customer_id) }}
          </template>
        </el-table-column>
        <el-table-column prop="max_uses" :label="$t('enroll.table.max')" width="140" />
        <el-table-column prop="used_count" :label="$t('enroll.table.used')" width="120" />
        <el-table-column prop="license_days" :label="$t('enroll.table.days')" width="110" />
        <el-table-column prop="expires_at" :label="$t('enroll.table.expires_at')" width="200" />
        <el-table-column prop="created_at" :label="$t('enroll.table.created')" width="200" />

        <template slot="empty">
          <el-empty :description="$t('enroll.empty.title')">
            <div class="mt-1">{{ $t('enroll.empty.subtitle') }}</div>
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

const STORAGE_KEY = 'madar_locale'

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
        customer_id: [{ required: true, message: this.$t('enroll.form.errors.customer'), trigger: 'change' }],
        max_uses: [{ required: true, message: this.$t('enroll.form.errors.max'), trigger: 'blur' }],
        license_days: [{ required: true, message: this.$t('enroll.form.errors.days'), trigger: 'blur' }]
      }
    }
  },
  computed: {
    isRTL() {
      if (this.$i18n?.locale) return this.$i18n.locale === 'ar'
      return (localStorage.getItem(STORAGE_KEY) || 'ar') === 'ar'
    },
    dirClass() {
      return this.isRTL ? 'rtl' : 'ltr'
    },
    formLabelWidth() {
      // أعرض في العربي قليلاً لتفادي لف النصوص
      return this.isRTL ? '140px' : '160px'
    }
  },
  created() {
    this.loadCustomers()
    this.fetch()
  },
  methods: {
    parseList(res) {
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
        this.$message.error(this.err(e, this.$t('enroll.msg.load_customers_fail')))
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
        this.$message.error(this.err(e, this.$t('enroll.msg.load_fail')))
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
          const msg = res?.message || res?.data?.message || this.$t('enroll.msg.created')
          this.$message.success(msg)
          this.reset()
          this.fetch()
        } catch (e) {
          this.$message.error(this.err(e, this.$t('enroll.msg.create_fail')))
        } finally {
          this.submitting = false
        }
      })
    },

    reset() {
      this.form = { customer_id: null, max_uses: 1, license_days: 30, expires_at: null, note: '' }
      this.$refs.formRef?.clearValidate?.()
    },

    copy(text) {
      try {
        navigator.clipboard.writeText(text)
        this.$message.success(this.$t('enroll.msg.copied'))
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.error('Clipboard copy failed:', e)
        }
        this.$message.warning(this.$t('enroll.msg.copy_fail'))
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
/* spacing & layout */
.mb-2 { margin-bottom: 12px; }
.mb-1 { margin-bottom: 8px; }
.mt-1 { margin-top: 8px; }
.flex-spacer { flex: 1; }

/* page dir helpers */
.enroll-page.ltr { direction: ltr; }
.enroll-page.rtl { direction: rtl; }

/* card header */
.card-header { display: flex; align-items: center; justify-content: space-between; }

/* form */
.enroll-form .inline-input {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.hint {
  color: #909399;
  font-size: 12px;
}

/* actions row — يعكس الترتيب حسب الاتجاه */
.enroll-page.ltr .actions .el-form-item__content { display: flex; gap: 8px; justify-content: flex-start; }
.enroll-page.rtl .actions .el-form-item__content { display: flex; gap: 8px; justify-content: flex-end; }

/* toolbar */
.toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.toolbar-item { flex: 0 0 auto; }
.enroll-page.ltr .toolbar { justify-content: flex-start; }
.enroll-page.rtl .toolbar { justify-content: flex-start; } /* نتركها يسار داخل RTL ليتوازن مع أزرار التحديث */
.enroll-page.rtl .flex-spacer { order: 99; }

/* code chip */
.code-chip { font-weight: 600; }

/* pagination */
.pagination { margin-top: 12px; text-align: right; }

/* RTL popper fixes (Element UI) — لا تعمل داخل scoped لذلك نستعمل :deep */
:deep(.rtl-fix) .el-select-dropdown__item { text-align: start; }

/* ضبط محاذاة لابل في RTL قليلاً لتفادي الالتصاق */
.enroll-page.rtl :deep(.el-form-item__label) {
  padding-right: 0;
  padding-left: 8px; /* يعطي نفس الإحساس مثل margin-right في LTR */
}

/* أيقونة + نص داخل القائمة الجانبية تُعالَج في Sidebar، لكن هنا لتناسق أزرار الأيقونة */
.enroll-page.rtl :deep(.el-button .el-icon),
.enroll-page.rtl :deep(.el-input__icon) {
  margin-left: 6px; /* مسافة صغيرة بين الأيقونة والنص في العربي */
}

/* جدول: اجعل النص يلتف بشكل جميل */
:deep(.el-table) .cell { white-space: nowrap; }
@media (max-width: 992px) {
  .pagination { text-align: center; }
}
</style>
