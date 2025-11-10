<template>
  <div class="auth-wrap">
    <el-card class="login-card" shadow="always">
      <!-- Card Header with Madar logo and title -->
      <div slot="header" class="card-header">
        <img class="brand-logo" :src="madarLogo" alt="Madar logo">
        <h3 class="brand-title">Madar Admin</h3>
      </div>

      <el-form
        ref="loginForm"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        autocomplete="on"
        label-position="left"
      >
        <!-- Email -->
        <el-form-item prop="email">
          <span class="svg-container">
            <svg-icon icon-class="user" />
          </span>
          <el-input
            ref="email"
            v-model.trim="loginForm.email"
            placeholder="Email"
            name="email"
            type="email"
            tabindex="1"
            autocomplete="on"
          />
        </el-form-item>

        <!-- Password -->
        <el-tooltip
          v-model="capsTooltip"
          content="Caps lock is On"
          placement="right"
          manual
        >
          <el-form-item prop="password" class="password-item">
            <span class="svg-container">
              <svg-icon icon-class="password" />
            </span>
            <el-input
              :key="passwordType"
              ref="password"
              v-model="loginForm.password"
              :type="passwordType"
              placeholder="Password"
              name="password"
              tabindex="2"
              autocomplete="on"
              @keyup.native="checkCapslock"
              @blur="capsTooltip = false"
              @keyup.enter.native="handleLogin"
            />
            <span
              class="show-pwd"
              role="button"
              :aria-label="passwordType === 'password' ? 'Show password' : 'Hide password'"
              @click="togglePwd"
            >
              <svg-icon :icon-class="passwordType === 'password' ? 'eye' : 'eye-open'" />
            </span>
          </el-form-item>
        </el-tooltip>

        <el-button
          :loading="loading"
          type="primary"
          class="login-btn"
          @click.native.prevent="handleLogin"
        >
          Login
        </el-button>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import request, { TOKEN_KEY } from '@/utils/request' // TOKEN_KEY = 'madar_admin_token'
import { validEmail } from '@/utils/validate'
// ✅ Replace with your actual logo file if not SVG:
import madarLogo from '@/assets/logo/14.png'

export default {
  name: 'Login',
  data() {
    const validateEmail = (_rule, value, cb) => {
      if (!value || !validEmail(value)) cb(new Error('Please enter a valid email'))
      else cb()
    }
    const validatePassword = (_rule, value, cb) => {
      if (!value || value.length < 6) cb(new Error('Password must be at least 6 characters'))
      else cb()
    }
    return {
      madarLogo,
      loginForm: {
        email: '',
        password: ''
      },
      loginRules: {
        email: [{ required: true, trigger: 'blur', validator: validateEmail }],
        password: [{ required: true, trigger: 'blur', validator: validatePassword }]
      },
      passwordType: 'password',
      capsTooltip: false,
      loading: false,
      redirect: undefined,
      otherQuery: {}
    }
  },
  watch: {
    $route: {
      handler(route) {
        const q = route.query || {}
        this.redirect = q.redirect
        this.otherQuery = this.getOtherQuery(q)
      },
      immediate: true
    }
  },
  mounted() {
    if (!this.loginForm.email) this.$refs.email?.focus()
    else if (!this.loginForm.password) this.$refs.password?.focus()
  },
  methods: {
    checkCapslock(e) {
      const { key } = e
      // Show tooltip when typing an uppercase letter (likely caps on)
      this.capsTooltip = key && key.length === 1 && key >= 'A' && key <= 'Z'
    },
    togglePwd() {
      this.passwordType = this.passwordType === 'password' ? 'text' : 'password'
      this.$nextTick(() => this.$refs.password?.focus())
    },
    getOtherQuery(query) {
      return Object.keys(query).reduce((acc, k) => {
        if (k !== 'redirect') acc[k] = query[k]
        return acc
      }, {})
    },
    async handleLogin() {
      this.$refs.loginForm.validate(async(valid) => {
        if (!valid) return
        this.loading = true
        try {
          const { token } = await request.post('/login', {
            login: this.loginForm.email,
            password: this.loginForm.password
          })
          localStorage.setItem(TOKEN_KEY, token)

          // Optional: preload profile/abilities so the sidebar renders correctly
          // await request.get('/me')

          const target = this.$route.query.redirect || '/'
          this.$router.replace(target)
        } catch (err) {
          if (err?.status === 422 && err?.errors) {
            const firstField = Object.keys(err.errors)[0]
            const firstMsg = err.errors[firstField][0]
            this.$message.error(firstMsg)
          } else {
            this.$message.error(err?.message || 'Login failed')
          }
        } finally {
          this.loading = false
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
/* Background */
.auth-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;

  /* Soft dark gradient with subtle texture */
  background: radial-gradient(1200px 800px at 20% 10%, #2f3b52 0%, #1f2836 35%, #151c26 100%);
  padding: 24px;
}

/* Card */
.login-card {
  width: 520px;
  max-width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  overflow: hidden;
  backdrop-filter: blur(8px);

  .card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;

    .brand-logo {
      width: 36px;
      height: 36px;
      object-fit: contain;
      display: block;
    }
    .brand-title {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: #000000;
      letter-spacing: 0.3px;
    }
  }

  .login-form {
    padding: 8px 8px 4px;
  }
}

/* Inputs with left icons */
.svg-container {
  padding: 6px 6px 6px 10px;
  color: #8ea0ad;
  vertical-align: middle;
  width: 30px;
  display: inline-block;
}

/* Form items */
.el-form-item {
  position: relative;
  margin-bottom: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;

  :deep(.el-input) {
    display: inline-block;
    width: calc(100% - 30px);
    height: 48px;

    input {
      background: transparent;
      border: 0;
      border-radius: 0;
      padding: 12px 40px 12px 6px; /* room for eye icon */
      color: #e9eef4;
      height: 48px;
      caret-color: #e9eef4;

      &:-webkit-autofill {
        box-shadow: 0 0 0 1000px #1f2836 inset !important;
        -webkit-text-fill-color: #e9eef4 !important;
      }
    }
  }
}

/* Show/Hide password toggle */
.show-pwd {
  position: absolute;
  right: 10px;
  top: 7px;
  font-size: 16px;
  color: #8ea0ad;
  cursor: pointer;
  user-select: none;
}

/* Primary button full width */
.login-btn {
  width: 100%;
  height: 44px;
  margin-top: 6px;
  font-weight: 600;
}

/* Small responsive tweaks */
@media (max-width: 480px) {
  .login-card {
    border-radius: 12px;
  }
}
</style>
