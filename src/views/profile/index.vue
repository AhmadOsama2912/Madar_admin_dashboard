<template>
  <div class="profile-page app-container" :dir="isRTL ? 'rtl' : 'ltr'">
    <!-- لو ما فيش بيانات يوزر -->
    <el-empty v-if="!admin" description="No user loaded" />

    <!-- المحتوى الأساسي -->
    <el-row v-else :gutter="20">
      <!-- SUMMARY CARD -->
      <el-col :xs="24" :sm="8">
        <el-card shadow="hover" class="card-summary">
          <div class="summary-header">
            <div class="avatar-circle">
              <span>{{ avatarInitial }}</span>
            </div>
            <div class="summary-text">
              <h2 class="name">{{ admin.name }}</h2>
              <p class="role">{{ roleLabel }}</p>
            </div>
          </div>

          <div class="summary-body">
            <div class="field">
              <span class="label">{{ $t('common.username') || 'Username' }}</span>
              <span class="value">{{ admin.username }}</span>
            </div>
            <div class="field">
              <span class="label">{{ $t('common.email') || 'Email' }}</span>
              <span class="value">{{ admin.email }}</span>
            </div>
            <div class="field">
              <span class="label">{{ $t('profile.last_login_at') || 'Last login' }}</span>
              <span class="value">{{ formattedLastLogin }}</span>
            </div>
            <div class="field">
              <span class="label">{{ $t('profile.last_login_ip') || 'Last login IP' }}</span>
              <span class="value">{{ admin.last_login_ip || '-' }}</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- DETAILS + SECURITY -->
      <el-col :xs="24" :sm="16">
        <!-- Account details -->
        <el-card shadow="hover" class="card-details">
          <div class="card-header">
            <h3>{{ $t('profile.account_details') || 'Account details' }}</h3>
          </div>

          <el-form
            ref="profileForm"
            :model="profileForm"
            :rules="profileRules"
            label-width="140px"
            label-position="left"
          >
            <el-form-item :label="$t('common.name') || 'Name'" prop="name">
              <el-input v-model.trim="profileForm.name" autocomplete="off" />
            </el-form-item>

            <el-form-item :label="$t('common.username') || 'Username'">
              <el-input :value="admin.username" disabled />
            </el-form-item>

            <el-form-item :label="$t('common.email') || 'Email'">
              <el-input :value="admin.email" disabled />
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                :loading="savingProfile"
                @click="saveProfile"
              >
                {{ $t('common.save') || 'Save' }}
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <!-- Security / password -->
        <el-card shadow="hover" class="card-details mt-2">
          <div class="card-header">
            <h3>{{ $t('profile.security') || 'Security' }}</h3>
            <p class="card-subtitle">
              {{ $t('profile.security_hint') || 'Change your password regularly to keep your account secure.' }}
            </p>
          </div>

          <el-form
            ref="passwordForm"
            :model="passwordForm"
            :rules="passwordRules"
            label-width="180px"
            label-position="left"
          >
            <el-form-item
              :label="$t('profile.current_password') || 'Current password'"
              prop="current_password"
            >
              <el-input
                v-model.trim="passwordForm.current_password"
                type="password"
                autocomplete="current-password"
                show-password
              />
            </el-form-item>

            <el-form-item
              :label="$t('common.password') || 'New password'"
              prop="password"
            >
              <el-input
                v-model.trim="passwordForm.password"
                type="password"
                autocomplete="new-password"
                show-password
              />
            </el-form-item>

            <el-form-item
              :label="$t('common.confirm_password') || 'Confirm password'"
              prop="password_confirmation"
            >
              <el-input
                v-model.trim="passwordForm.password_confirmation"
                type="password"
                autocomplete="new-password"
                show-password
              />
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                :loading="savingPassword"
                @click="changePassword"
              >
                {{ $t('profile.update_password') || 'Update password' }}
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'ProfilePage',

  data() {
    return {
      savingProfile: false,
      savingPassword: false,
      profileForm: {
        name: ''
      },
      passwordForm: {
        current_password: '',
        password: '',
        password_confirmation: ''
      }
    }
  },

  computed: {
    ...mapGetters(['admin']),

    isRTL() {
      if (this.$i18n && this.$i18n.locale) {
        return this.$i18n.locale.startsWith('ar')
      }
      if (typeof window !== 'undefined') {
        try {
          return (localStorage.getItem('madar_locale') || 'en').startsWith('ar')
        } catch (e) {
          return false
        }
      }
      return false
    },

    avatarInitial() {
      if (!this.admin || !this.admin.name) return '?'
      return this.admin.name.trim().charAt(0).toUpperCase()
    },

    roleLabel() {
      if (!this.admin) return ''
      if (this.admin.is_super_admin) {
        return this.$t('profile.super_admin') || 'Super Admin'
      }
      return this.$t('profile.admin') || 'Admin'
    },

    formattedLastLogin() {
      if (!this.admin || !this.admin.last_login_at) return '-'
      try {
        return new Date(this.admin.last_login_at).toLocaleString()
      } catch (e) {
        return this.admin.last_login_at
      }
    },

    // قواعد الفاليديشن للبروفايل
    profileRules() {
      const requiredMsg = this.$t('validation.required') || 'Required'
      return {
        name: [{ required: true, message: requiredMsg, trigger: 'blur' }]
      }
    },

    // قواعد الفاليديشن للباسورد
    passwordRules() {
      const requiredMsg = this.$t('validation.required') || 'Required'
      const minMsg =
        this.$t('validation.min_length', { n: 6 }) || 'Minimum 6 characters'

      return {
        current_password: [{ required: true, message: requiredMsg, trigger: 'blur' }],
        password: [
          { required: true, message: requiredMsg, trigger: 'blur' },
          { min: 6, message: minMsg, trigger: 'blur' }
        ],
        password_confirmation: [
          { validator: this.validatePasswordConfirm, trigger: 'blur' }
        ]
      }
    }
  },

  created() {
    this.initForms()
  },

  methods: {
    initForms() {
      if (!this.admin) return
      this.profileForm.name = this.admin.name || ''
    },

    validatePasswordConfirm(_rule, value, cb) {
      if (!value) {
        return cb(
          new Error(
            this.$t('validation.password_mismatch') ||
              'Passwords do not match'
          )
        )
      }
      if (value !== this.passwordForm.password) {
        return cb(
          new Error(
            this.$t('validation.password_mismatch') ||
              'Passwords do not match'
          )
        )
      }
      cb()
    },

    saveProfile() {
      this.$refs.profileForm.validate((valid) => {
        if (!valid) return
        this.savingProfile = true
        // TODO: اربط مع API الحقيقي لتعديل الاسم
        setTimeout(() => {
          this.$message.success(this.$t('profile.saved') || 'Profile updated')
          this.savingProfile = false
        }, 500)
      })
    },

    changePassword() {
      this.$refs.passwordForm.validate((valid) => {
        if (!valid) return
        this.savingPassword = true
        // TODO: اربط مع API الحقيقي لتغيير الباسورد
        setTimeout(() => {
          this.$message.success(
            this.$t('profile.password_updated') || 'Password updated'
          )
          this.passwordForm.current_password = ''
          this.passwordForm.password = ''
          this.passwordForm.password_confirmation = ''
          this.savingPassword = false
        }, 500)
      })
    }
  }
}
</script>

<style scoped>
.profile-page {
  padding-top: 10px;
}

/* SUMMARY CARD */
.card-summary {
  height: 100%;
}

.summary-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.avatar-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #409eff, #66b1ff);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 28px;
  font-weight: 600;
  margin-inline-end: 12px;
}

.summary-text .name {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.summary-text .role {
  margin: 2px 0 0;
  color: #909399;
  font-size: 13px;
}

.summary-body .field {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
}

.summary-body .label {
  color: #909399;
}

.summary-body .value {
  color: #303133;
  font-weight: 500;
}

/* DETAILS CARDS */
.card-details {
  margin-bottom: 12px;
}

.card-header {
  margin-bottom: 12px;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.card-subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  color: #909399;
}

.mt-2 {
  margin-top: 12px;
}

/* RTL tweaks */
[dir='rtl'] .avatar-circle {
  margin-inline-end: 0;
  margin-inline-start: 12px;
}
</style>
