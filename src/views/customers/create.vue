<template>
  <div class="app-container">
    <el-card shadow="always" class="customer-card">
      <div class="header">
        <h2>
          <el-icon style="vertical-align: middle; margin-right: 8px;">
            <i class="el-icon-user-solid" />
          </el-icon>
          Create Customer
        </h2>
        <p class="subtitle">Fill in the details to add a new customer.</p>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="140px"
        class="customer-form"
      >
        <el-row :gutter="24">
          <el-col :xs="24" :sm="12">
            <el-form-item label="Company Name" prop="name">
              <el-input v-model.trim="form.name" autocomplete="off" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="Package" prop="package_id">
              <el-select
                v-model="form.package_id"
                placeholder="Select a package"
                filterable
                :loading="loadingPackages"
                style="width: 100%;"
              >
                <el-option
                  v-for="p in packages"
                  :key="p.id"
                  :label="`${p.name} — ${formatPrice(p.price)}`"
                  :value="p.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="24">
          <el-col :xs="24" :sm="12">
            <el-form-item label="Email" prop="email">
              <el-input v-model.trim="form.email" autocomplete="off" placeholder="optional" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="Phone" prop="phone">
              <el-input v-model.trim="form.phone" autocomplete="off" placeholder="optional" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="Notes" prop="notes">
          <el-input v-model.trim="form.notes" type="textarea" :rows="3" placeholder="optional" />
        </el-form-item>

        <div class="actions">
          <el-button icon="el-icon-refresh-left" @click="reset">Reset</el-button>
          <el-button type="primary" :loading="submitting" icon="el-icon-check" @click="submit">Create</el-button>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import { createCustomer } from '@/api/customers'
import { listPackages } from '@/api/packages'

export default {
  name: 'CustomerCreate',
  data() {
    const validateEmail = (_r, v, cb) => {
      if (!v) return cb() // optional
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
      ok ? cb() : cb(new Error('Invalid email'))
    }
    return {
      submitting: false,
      loadingPackages: false,
      packages: [],
      form: {
        name: '',
        email: '',
        phone: '',
        package_id: null,
        notes: ''
      },
      rules: {
        name: [{ required: true, message: 'Company name is required', trigger: 'blur' }],
        email: [{ validator: validateEmail, trigger: 'blur' }],
        package_id: [{ required: true, message: 'Please choose a package', trigger: 'change' }]
      }
    }
  },
  created() {
    this.loadPackages()
  },
  methods: {
    async loadPackages() {
      this.loadingPackages = true
      try {
        const res = await listPackages({ page: 1, per_page: 100 })
        this.packages = res.data || res.items || []
      } catch (e) {
        this.$message.error(this.errMsg(e, 'Failed to load packages'))
      } finally {
        this.loadingPackages = false
      }
    },

    submit() {
      this.$refs.formRef.validate(async(valid) => {
        if (!valid) return
        this.submitting = true
        try {
          const payload = {}
          for (const k of Object.keys(this.form)) {
            const v = this.form[k]
            if (v !== '' && v !== null && v !== undefined) payload[k] = v
          }
          const res = await createCustomer(payload)
          this.$message.success(res?.message || 'Customer created')
          this.reset()
        } catch (e) {
          this.$message.error(this.errMsg(e, 'Create failed'))
        } finally {
          this.submitting = false
        }
      })
    },

    reset() {
      this.$refs.formRef.resetFields()
    },

    formatPrice(p) {
      const n = Number(p)
      return Number.isFinite(n) ? n.toLocaleString() : p
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
.app-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 40px;
  background: #f6f8fa;
  min-height: 100vh;
}
.customer-card {
  width: 100%;
  max-width: 820px;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.07);
  padding: 32px 36px 24px 36px;
}
.header {
  margin-bottom: 18px;
}
.header h2 {
  margin: 0;
  font-weight: 600;
  font-size: 1.7rem;
  color: #222;
  display: flex;
  align-items: center;
}
.subtitle {
  color: #888;
  font-size: 1rem;
  margin-top: 4px;
  margin-bottom: 0;
}
.customer-form {
  max-width: 100%;
  margin-top: 12px;
}
.el-form-item {
  margin-bottom: 18px;
}
.actions {
  text-align: right;
  margin-top: 16px;
}
@media (max-width: 600px) {
  .customer-card {
    padding: 16px 8px;
  }
  .header h2 {
    font-size: 1.2rem;
  }
}
</style>
