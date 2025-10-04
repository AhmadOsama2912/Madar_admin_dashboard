'use strict'
const path = require('path')
const defaultSettings = require('./src/settings.js')

function resolve(dir) {
  return path.join(__dirname, dir)
}

const name = defaultSettings.title || 'Madar 2030 Admin' // page title
const port = process.env.port || process.env.npm_config_port || 9527 // dev port

module.exports = {
  publicPath: '/',
  outputDir: 'dist',
  assetsDir: 'static',
  lintOnSave: process.env.NODE_ENV === 'development',
  productionSourceMap: false,

  devServer: {
    port,
    open: true,

    // Build overlay in the browser (warnings off, errors on)
    overlay: { warnings: false, errors: true },

    // ===== PROXY: Admin API during development =====
    // Frontend calls -> axios baseURL = process.env.VUE_APP_BASE_API (e.g. /admin-api)
    // This proxy forwards them to Laravel's /admin/v1 prefix.
      proxy: {
        '/admin-api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
          pathRewrite: { '^/admin-api': '/api/admin/v1' }
        }
      }
    // ================================================
    ,
    // Remove or comment out the mock server line if present:
    // before: require('./mock/mock-server.js')
  },

  configureWebpack: {
    name,
    resolve: { alias: { '@': resolve('src') } }
  },

  chainWebpack(config) {
    // Preload initial chunks
    config.plugin('preload').tap(() => [
      {
        rel: 'preload',
        fileBlacklist: [/\.map$/, /hot-update\.js$/, /runtime\..*\.js$/],
        include: 'initial'
      }
    ])

    // Reduce prefetch noise on many pages
    config.plugins.delete('prefetch')

    // SVG sprite setup
    config.module.rule('svg').exclude.add(resolve('src/icons')).end()
    config.module
      .rule('icons')
      .test(/\.svg$/)
      .include.add(resolve('src/icons')).end()
      .use('svg-sprite-loader')
      .loader('svg-sprite-loader')
      .options({ symbolId: 'icon-[name]' })
      .end()

    // Production optimizations
    config.when(process.env.NODE_ENV !== 'development', config => {
      config
        .plugin('ScriptExtHtmlWebpackPlugin')
        .after('html')
        .use('script-ext-html-webpack-plugin', [{ inline: /runtime\..*\.js$/ }])
        .end()

      config.optimization.splitChunks({
        chunks: 'all',
        cacheGroups: {
          libs: {
            name: 'chunk-libs',
            test: /[\\/]node_modules[\\/]/,
            priority: 10,
            chunks: 'initial'
          },
          elementUI: {
            name: 'chunk-elementUI',
            priority: 20,
            test: /[\\/]node_modules[\\/]_?element-ui(.*)/
          },
          commons: {
            name: 'chunk-commons',
            test: resolve('src/components'),
            minChunks: 3,
            priority: 5,
            reuseExistingChunk: true
          }
        }
      })
      config.optimization.runtimeChunk('single')
    })
  }
}
