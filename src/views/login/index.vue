<template>
  <div class="login-container">
    <el-form
      ref="loginForm"
      :model="loginForm"
      :rules="loginRules"
      class="login-form"
      autocomplete="on"
      label-position="left"
    >
      <div class="title-container">
        <h3 class="title">Madar Admin</h3>
      </div>

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
      <el-tooltip v-model="capsTooltip" content="Caps lock is On" placement="right" manual>
        <el-form-item prop="password">
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
          <span class="show-pwd" @click="togglePwd">
            <svg-icon :icon-class="passwordType === 'password' ? 'eye' : 'eye-open'" />
          </span>
        </el-form-item>
      </el-tooltip>

      <el-button
        :loading="loading"
        type="primary"
        style="width:100%;margin-bottom:18px;"
        @click.native.prevent="handleLogin"
      >
        Login
      </el-button>
    </el-form>
  </div>
</template>

<script>
import request, { TOKEN_KEY } from '@/utils/request' // TOKEN_KEY = 'madar_admin_token'
import { validEmail } from '@/utils/validate' // keep your existing helper

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
      this.capsTooltip = key && key.length === 1 && key >= 'A' && key <= 'Z'
    },
    togglePwd() {
      this.passwordType = this.passwordType === 'password' ? '' : 'password'
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

          // (optional) get profile/abilities so the sidebar is correct before entering the app
          // await request.get('/me')

          // ✅ redirect: use ?redirect=... or fall back to '/'
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

<style lang="scss">
$bg:#283443;
$light_gray:#fff;
$cursor:#fff;

@supports (-webkit-mask: none) and (not (cater-color: $cursor)) {
  .login-container .el-input input { color: $cursor; }
}

.login-container {
  .el-input {
    display: inline-block;
    height: 47px;
    width: 85%;
    input {
      background: transparent;
      border: 0;
      -webkit-appearance: none;
      border-radius: 0;
      padding: 12px 5px 12px 15px;
      color: $light_gray;
      height: 47px;
      caret-color: $cursor;
      &:-webkit-autofill {
        box-shadow: 0 0 0 1000px $bg inset !important;
        -webkit-text-fill-color: $cursor !important;
      }
    }
  }

  .el-form-item {
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(0,0,0,0.1);
    border-radius: 5px;
    color: #454545;
  }
}
</style>

<style lang="scss" scoped>
$bg:#2d3a4b;
$dark_gray:#889aa4;
$light_gray:#eee;

.login-container {
  min-height: 100%;
  width: 100%;
  background-color: $bg;
  overflow: hidden;

  .login-form {
    position: relative;
    width: 520px;
    max-width: 100%;
    padding: 160px 35px 0;
    margin: 0 auto;
    overflow: hidden;
  }

  .svg-container {
    padding: 6px 5px 6px 15px;
    color: $dark_gray;
    vertical-align: middle;
    width: 30px;
    display: inline-block;
  }

  .title-container .title {
    font-size: 26px;
    color: $light_gray;
    margin: 0 auto 40px;
    text-align: center;
    font-weight: bold;
  }

  .show-pwd {
    position: absolute;
    right: 10px;
    top: 7px;
    font-size: 16px;
    color: $dark_gray;
    cursor: pointer;
    user-select: none;
  }
}
</style>
