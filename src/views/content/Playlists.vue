<template>
  <div class="app-container content-page" :class="{ rtl: isRTL }">
    <!-- ======= TOP BAR ======= -->
    <div class="topbar">
      <div class="topbar__left">
        <div class="brand-chip">
          <span class="dot" />
          <span class="brand-chip__text">{{ $t('content.brand') }}</span>
        </div>

        <el-select
          v-model="filters.customer_id"
          filterable
          clearable
          :placeholder="$t('content.select_customer')"
          class="topbar-select"
          @change="loadPlaylists"
        >
          <el-option v-for="c in customers" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>

        <el-input
          v-model.trim="draft.newPlaylistName"
          :placeholder="$t('content.new_playlist_ph')"
          class="ml-1 topbar-input"
          @keyup.enter.native="createPlaylist"
        />
        <el-button type="primary" class="ml-1" :loading="creating" @click="createPlaylist">
          {{ $t('content.create') }}
        </el-button>
      </div>

      <div class="topbar__right">
        <el-button icon="el-icon-refresh" :loading="loading.playlists" @click="loadPlaylists">
          {{ $t('content.btn.refresh') }}
        </el-button>
      </div>
    </div>

    <!-- ======= PLAYLISTS ======= -->
    <el-row :gutter="16">
      <el-col :span="24">
        <div class="section-title">
          {{ $t('content.playlists') }}
          <span v-if="playlists.length" class="section-sub">({{ playlists.length }})</span>
        </div>

        <div v-if="!playlists.length" class="empty">
          <div class="empty__icon"><i class="el-icon-video-camera" /></div>
          <div class="empty__title">{{ $t('content.empty_title') }}</div>
          <div class="empty__sub">{{ $t('content.empty_sub') }}</div>
        </div>

        <div v-else class="playlist-grid">
          <div
            v-for="pl in playlists"
            :key="pl.id"
            class="pl-card"
            @mouseenter="onEnterCard(pl)"
            @mouseleave="stopCarousel(pl)"
          >
            <!-- Cover / Carousel -->
            <div class="pl-cover">
              <img v-if="coverImage(pl)" :src="coverImage(pl)" alt="cover" loading="lazy">
              <div v-else class="pl-cover-fallback">
                <svg viewBox="0 0 180 60" class="madar-logo">
                  <g>
                    <path d="M30 45 L40 15 L50 45" class="ml-stroke" />
                    <path d="M55 45 L65 15 L75 45" class="ml-stroke" />
                    <text x="92" y="38" class="ml-text">MADAR</text>
                  </g>
                </svg>
              </div>

              <div class="pl-cover-overlay" />

              <div class="pl-cover-top">
                <el-tag v-if="pl.is_default" size="mini" type="info">{{ $t('content.default') }}</el-tag>
                <el-tag v-if="pl.published_at" size="mini" type="success">{{ $t('content.published') }}</el-tag>
              </div>

              <div class="pl-cover-bottom">
                <div class="pl-title" :title="pl.name">{{ pl.name }}</div>
                <div class="pl-meta">
                  <span>{{ tItems(pl.items_count) }}</span>
                  <span class="dot-sep">•</span>
                  <span>{{ tAgo(pl.updated_at ? pl.updated_at : pl.created_at) }}</span>
                </div>
              </div>

              <div v-if="hasThumbs(pl)" class="pl-dots">
                <span
                  v-for="(_, i) in (pl._thumbs || []).slice(0, 5)"
                  :key="i"
                  :class="['dot', (pl._carouselIdx || 0) === i ? 'active' : '']"
                />
              </div>
            </div>

            <!-- Thumbs strip -->
            <div v-if="hasThumbs(pl) || pl.items_count" class="pl-thumbs">
              <div
                v-for="(thumb, idx) in (pl._thumbs || []).slice(0, 3)"
                :key="idx"
                class="thumb"
                :title="thumb.type === 'image' ? 'Image' : 'Video'"
              >
                <img v-if="thumb.type === 'image'" :src="resolveUrl(thumb.url)" alt="thumb" loading="lazy">
                <div v-else class="thumb-video"><i class="el-icon-video-play" /></div>
              </div>

              <div v-if="count(pl.items_count) > 3" class="thumb more">
                +{{ count(pl.items_count) - 3 }}
              </div>
            </div>

            <!-- Actions -->
            <div class="pl-actions">
              <div class="actions-left">
                <el-button size="mini" @click="renamePlaylist(pl)">{{ $t('content.btn.rename') }}</el-button>
                <el-button size="mini" type="success" plain @click="publish(pl)">{{ $t('content.btn.publish') }}</el-button>
                <el-button size="mini" plain @click="setDefault(pl)">{{ $t('content.btn.set_default') }}</el-button>
                <el-button size="mini" type="danger" plain @click="removePlaylist(pl)">{{ $t('content.btn.delete') }}</el-button>
              </div>
              <div class="actions-right">
                <el-button size="mini" type="primary" class="open-btn" @click="openItems(pl)">
                  {{ $t('content.btn.open') }}
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- ======= ITEMS DIALOG ======= -->
    <el-dialog
      :visible.sync="itemsDlg.open"
      :title="$t('content.dlg.title_prefix') + (itemsDlg.playlist ? itemsDlg.playlist.name : '')"
      width="90%"
      top="6vh"
      :append-to-body="true"
      :close-on-click-modal="false"
      class="items-dialog"
      @close="ui.addUrlOpen = false"
    >
      <div class="items-toolbar">
        <el-upload
          action="#"
          :http-request="noopUpload"
          :auto-upload="false"
          :show-file-list="false"
          :on-change="onUploadChange"
          accept="image/*,video/*"
        >
          <el-button icon="el-icon-plus">{{ $t('content.btn.add_file') }}</el-button>
        </el-upload>

        <el-popover v-model="ui.addUrlOpen" placement="bottom" width="360" trigger="click" :append-to-body="true">
          <div class="url-form">
            <el-input v-model.trim="draft.url.src" placeholder="http(s)://… (image or video)" />
            <div class="row">
              <el-select v-model="draft.url.type" placeholder="Type" class="url-type-select">
                <el-option label="Image" value="image" />
                <el-option label="Video" value="video" />
              </el-select>
              <el-input-number
                v-if="draft.url.type === 'image'"
                v-model="draft.url.duration"
                :min="1"
                :max="3600"
                :step="1"
                class="ml-1"
                controls-position="right"
                :label="$t('content.dlg.seconds')"
              />
            </div>
            <div class="actions">
              <el-button @click="ui.addUrlOpen = false">{{ $t('content.btn.cancel') }}</el-button>
              <el-button type="primary" :loading="creatingItem" @click="addUrl">{{ $t('content.btn.add') }}</el-button>
            </div>
          </div>
          <el-button slot="reference">{{ $t('content.btn.add_url') }}</el-button>
        </el-popover>

        <div class="flex-spacer" />
        <el-button :loading="refreshing" @click="refreshVersion">{{ $t('content.btn.refresh_ver') }}</el-button>
        <el-button type="primary" plain :disabled="!dirtyOrder" @click="saveOrder">{{ $t('content.btn.save_order') }}</el-button>
      </div>

      <el-table v-loading="loading.items" :data="items" border class="items-table" :class="{ rtl: isRTL }">
        <el-table-column :label="'#'" width="54">
          <template slot-scope="{ $index }">{{ $index + 1 }}</template>
        </el-table-column>

        <el-table-column :label="$t('content.dlg.preview')" width="140">
          <template slot-scope="{ row }">
            <div class="preview">
              <img v-if="row.type === 'image'" :src="resolveUrl(row.src)" alt="">
              <i v-else class="el-icon-video-camera" />
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="type" :label="$t('content.dlg.type')" width="120" />

        <el-table-column :label="$t('content.dlg.source')">
          <template slot-scope="{ row }">
            <a :href="resolveUrl(row.src)" target="_blank" rel="noopener" class="mono">
              {{ resolveUrl(row.src) }}
            </a>
          </template>
        </el-table-column>

        <el-table-column :label="$t('content.dlg.duration')" width="200">
          <template slot-scope="{ row }">
            <div v-if="row.type === 'image'">
              <el-input-number v-model="row.duration" :min="1" :max="3600" :step="1" controls-position="right" />
              <span class="muted ml-1">{{ $t('content.dlg.seconds') }}</span>
            </div>
            <div v-else class="muted">{{ $t('content.dlg.video_len') }}</div>
          </template>
        </el-table-column>

        <el-table-column :label="$t('content.dlg.order')" width="140">
          <template slot-scope="{ $index }">
            <el-button size="mini" icon="el-icon-arrow-up" :disabled="$index === 0" @click="moveItem($index, -1)" />
            <el-button size="mini" icon="el-icon-arrow-down" :disabled="$index === items.length - 1" @click="moveItem($index, +1)" />
          </template>
        </el-table-column>

        <el-table-column :label="$t('content.dlg.actions')" width="160" fixed="right">
          <template slot-scope="{ row }">
            <el-button
              size="mini"
              type="primary"
              plain
              :disabled="row.type !== 'image'"
              :loading="row._saving === true"
              @click="saveItem(row)"
            >
              {{ $t('content.btn.save') }}
            </el-button>
            <el-button size="mini" type="danger" plain @click="deleteItem(row)">{{ $t('content.btn.delete') }}</el-button>
          </template>
        </el-table-column>
      </el-table>

      <span slot="footer" class="dialog-footer">
        <el-button @click="itemsDlg.open = false">{{ $t('content.btn.close') }}</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { listCustomers } from '@/api/customers'
import {
  listPlaylists, showPlaylist, createPlaylist as apiCreatePlaylist,
  updatePlaylist, deletePlaylist as apiDeletePlaylist,
  publishPlaylist, setDefaultPlaylist, refreshPlaylistVersion,
  createPlaylistItem, updatePlaylistItem, deletePlaylistItem, reorderPlaylistItems
} from '@/api/playlists'

const MEDIA_HOST = 'http://localhost:8000/storage'

export default {
  name: 'PlaylistsOnly',
  data() {
    return {
      customers: [],
      playlists: [],
      items: [],
      loading: { playlists: false, items: false },
      creating: false,
      creatingItem: false,
      refreshing: false,
      dirtyOrder: false,
      filters: { customer_id: null },
      draft: { newPlaylistName: '', url: { type: 'image', src: '', duration: 8 }},
      ui: { addUrlOpen: false },
      itemsDlg: { open: false, playlist: null },
      CAROUSEL_MS: 3000
    }
  },
  computed: {
    isRTL() {
      return (this.$i18n && this.$i18n.locale === 'ar') || false
    }
  },
  created() {
    this.loadCustomers()
    this.loadPlaylists()
  },
  beforeDestroy() {
    (this.playlists || []).forEach(p => this.stopCarousel(p))
  },
  methods: {
    // i18n helpers
    tItems(n) {
      const count = this.count(n)
      return this.$t('content.items', { n: count })
    },
    tAgo(dt) {
      const s = Math.max(1, Math.round((Date.now() - new Date(dt).getTime()) / 1000))
      if (s < 60) return this.$t('content.ago_s', { n: s })
      const m = Math.round(s / 60); if (m < 60) return this.$t('content.ago_m', { n: m })
      const h = Math.round(m / 60); if (h < 24) return this.$t('content.ago_h', { n: h })
      return this.$t('content.ago_d', { n: Math.round(h / 24) })
    },

    // Keeps Element-UI Upload happy while we upload manually
    noopUpload() {},

    count(v) { const n = Number(v); return isNaN(n) ? 0 : n },
    resolveUrl(src) {
      if (!src) return ''
      if (/^https?:\/\//i.test(src)) return src
      const normalized = String(src).replace(/^\//, '')
      return MEDIA_HOST + '/' + normalized
    },

    async loadCustomers() {
      try {
        const res = await listCustomers({ page: 1, per_page: 100 })
        const root = res && res.data ? res.data : res
        this.customers = Array.isArray(root && root.data) ? root.data : (Array.isArray(root) ? root : [])
      } catch (e) {
        this.$message.error(this.$t('content.msg.load_playlists_fail'))
      }
    },

    async loadPlaylists() {
      this.loading.playlists = true
      try {
        const params = { page: 1, per_page: 100 }
        if (this.filters.customer_id) params.customer_id = this.filters.customer_id
        const res = await listPlaylists(params)
        const root = res && res.data ? res.data : res
        const rows = Array.isArray(root && root.data) ? root.data : (Array.isArray(root) ? root : [])
        rows.forEach(r => { r._thumbs = null; r._carouselIdx = 0; this.stopCarousel(r) })
        this.playlists = rows
      } catch (e) {
        this.$message.error(this.$t('content.msg.load_playlists_fail'))
        this.playlists = []
      } finally {
        this.loading.playlists = false
      }
    },

    async createPlaylist() {
      if (!this.draft.newPlaylistName) return
      this.creating = true
      try {
        const payload = { name: this.draft.newPlaylistName }
        if (this.filters.customer_id) payload.customer_id = this.filters.customer_id
        await apiCreatePlaylist(payload)
        this.draft.newPlaylistName = ''
        await this.loadPlaylists()
      } catch (e) {
        this.$message.error(this.$t('content.msg.create_fail'))
      } finally {
        this.creating = false
      }
    },

    async renamePlaylist(pl) {
      try {
        const ret = await this.$prompt(this.$t('content.dlg.rename_prompt'), this.$t('content.dlg.rename_title'), { inputValue: pl.name })
        if (!ret || !ret.value) return
        await updatePlaylist(pl.id, { name: ret.value })
        this.$message.success(this.$t('content.msg.renamed'))
        await this.loadPlaylists()
      } catch (e) {
        this.$message.error(this.$t('content.msg.rename_fail'))
      }
    },

    async publish(pl) {
      try {
        await publishPlaylist(pl.id)
        this.$message.success(this.$t('content.msg.published'))
        await this.loadPlaylists()
      } catch (e) {
        this.$message.error(this.$t('content.msg.publish_fail'))
      }
    },

    async setDefault(pl) {
      try {
        await setDefaultPlaylist(pl.id)
        this.$message.success(this.$t('content.msg.set_default'))
        await this.loadPlaylists()
      } catch (e) {
        this.$message.error(this.$t('content.msg.set_default_fail'))
      }
    },

    async removePlaylist(pl) {
      try {
        await this.$confirm(this.$t('content.dlg.confirm_delete_pl'), this.$t('content.btn.delete'), { type: 'warning' })
        await apiDeletePlaylist(pl.id)
        this.$message.success(this.$t('content.msg.deleted'))
        await this.loadPlaylists()
      } catch (e) {
        this.$message.error(this.$t('content.msg.delete_fail'))
      }
    },

    async ensureThumbs(pl) {
      if (pl._thumbsLoading || pl._thumbs !== null) return
      this.$set(pl, '_thumbsLoading', true)
      try {
        const res = await showPlaylist(pl.id)
        const data = res && res.data ? res.data : res
        const items = Array.isArray(data && data.items) ? data.items : []
        const thumbs = []
        for (let i = 0; i < items.length && thumbs.length < 5; i++) {
          thumbs.push({ type: items[i].type, url: items[i].src })
        }
        this.$set(pl, '_thumbs', thumbs)
      } catch (e) {
        this.$set(pl, '_thumbs', [])
      } finally {
        this.$set(pl, '_thumbsLoading', false)
      }
    },
    hasThumbs(pl) { return !!(pl && pl._thumbs && pl._thumbs.length) },
    coverImage(pl) {
      if (!this.hasThumbs(pl)) return null
      const list = pl._thumbs.slice(0, 5)
      const idx = pl._carouselIdx || 0
      const t = list[idx]
      return t && t.type === 'image' ? this.resolveUrl(t.url) : null
    },
    onEnterCard(pl) { this.ensureThumbs(pl); this.startCarousel(pl) },
    startCarousel(pl) {
      if (!pl) return
      this.stopCarousel(pl)
      if (!this.hasThumbs(pl)) return
      pl._carouselIdx = pl._carouselIdx || 0
      pl._carouselTimer = setInterval(() => {
        const total = Math.min(pl._thumbs.length, 5)
        if (total <= 1) return
        pl._carouselIdx = ((pl._carouselIdx || 0) + 1) % total
      }, this.CAROUSEL_MS)
    },
    stopCarousel(pl) {
      if (pl && pl._carouselTimer) {
        clearInterval(pl._carouselTimer)
        pl._carouselTimer = null
      }
    },

    async openItems(pl) { this.itemsDlg.playlist = pl; this.itemsDlg.open = true; await this.loadItems() },
    async loadItems() {
      if (!this.itemsDlg.playlist) { this.items = []; return }
      this.loading.items = true
      try {
        const res = await showPlaylist(this.itemsDlg.playlist.id)
        const data = res && res.data ? res.data : res
        const its = Array.isArray(data && data.items) ? data.items : []
        this.items = its.map((it, i) => ({
          id: it.id, type: it.type, src: it.src, duration: it.duration || 8,
          sort: typeof it.sort === 'number' ? it.sort : i, _saving: false
        }))
        this.dirtyOrder = false
      } catch (e) {
        this.$message.error(this.$t('content.msg.load_items_fail'))
        this.items = []
      } finally {
        this.loading.items = false
      }
    },

    onUploadChange(file) {
      if (!file || !file.raw) return
      const type = (file.raw.type || '').indexOf('image') === 0 ? 'image' : 'video'
      this.uploadItem(file.raw, type)
    },
    async uploadItem(raw, type) {
      if (!this.itemsDlg.playlist) return
      this.creatingItem = true
      try {
        const fd = new FormData()
        fd.append('type', type)
        fd.append('file', raw)
        if (type === 'image') fd.append('duration', '8')
        await createPlaylistItem(this.itemsDlg.playlist.id, fd)
        this.$message.success(this.$t('content.msg.item_added'))
        await this.loadItems()
      } catch (e) {
        this.$message.error(this.$t('content.msg.upload_fail'))
      } finally {
        this.creatingItem = false
      }
    },

    async addUrl() {
      if (!this.itemsDlg.playlist || !this.draft.url.src || !this.draft.url.type) return
      this.creatingItem = true
      try {
        const fd = new FormData()
        fd.append('type', this.draft.url.type)
        fd.append('src', this.draft.url.src)
        if (this.draft.url.type === 'image') fd.append('duration', String(this.draft.url.duration || 8))
        await createPlaylistItem(this.itemsDlg.playlist.id, fd)
        this.$message.success(this.$t('content.msg.item_added'))
        this.ui.addUrlOpen = false
        this.draft.url = { type: 'image', src: '', duration: 8 }
        await this.loadItems()
      } catch (e) {
        this.$message.error(this.$t('content.msg.add_url_fail'))
      } finally {
        this.creatingItem = false
      }
    },

    async saveItem(row) {
      if (row._saving) return
      this.$set(row, '_saving', true)
      try {
        await updatePlaylistItem(this.itemsDlg.playlist.id, row.id, { duration: row.duration })
        this.$message.success(this.$t('content.msg.saved'))
      } catch (e) {
        this.$message.error(this.$t('content.msg.save_fail'))
      } finally {
        this.$set(row, '_saving', false)
      }
    },

    async deleteItem(row) {
      try {
        await this.$confirm(this.$t('content.dlg.confirm_delete_item'), this.$t('content.btn.delete'), { type: 'warning' })
        await deletePlaylistItem(this.itemsDlg.playlist.id, row.id)
        this.$message.success(this.$t('content.msg.deleted'))
        await this.loadItems()
      } catch (e) {
        this.$message.error(this.$t('content.msg.delete_fail'))
      }
    },

    moveItem(i, delta) {
      const j = i + delta
      if (j < 0 || j >= this.items.length) return
      const arr = this.items.slice()
      const [it] = arr.splice(i, 1)
      arr.splice(j, 0, it)
      this.items = arr
      this.dirtyOrder = true
    },

    async saveOrder() {
      try {
        const order = this.items.map(i => i.id)
        await reorderPlaylistItems(this.itemsDlg.playlist.id, { order })
        this.$message.success(this.$t('content.msg.order_saved'))
        this.dirtyOrder = false
      } catch (e) {
        this.$message.error(this.$t('content.msg.save_order_fail'))
      }
    },

    async refreshVersion() {
      if (!this.itemsDlg.playlist) return
      this.refreshing = true
      try {
        await refreshPlaylistVersion(this.itemsDlg.playlist.id)
        this.$message.success(this.$t('content.msg.version_refreshed'))
        await this.loadPlaylists()
      } catch (e) {
        this.$message.error(this.$t('content.msg.refresh_ver_fail'))
      } finally {
        this.refreshing = false
      }
    }
  }
}
</script>

<style scoped>
/* ===== base (مثل نسختك) ===== */
:root{
  --madar-primary:#00a57a; --madar-primary-2:#0ea5e9; --madar-ink:#0f172a;
  --madar-muted:#64748b; --madar-border:#e7edf5; --madar-card:#fff; --madar-soft:#f7fafc;
}
.content-page { background:#fff; }
.topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;background:#fff;border:1px solid var(--madar-border);border-radius:14px;margin-bottom:14px;}
.topbar__left,.topbar__right{display:flex;align-items:center;gap:8px;}
.topbar-select{width:320px;max-width:40vw;}
.topbar-input{max-width:280px;}
.ml-1{margin-left:8px;}
.flex-spacer{flex:1;}

.brand-chip{display:flex;align-items:center;gap:8px;border:1px solid #dbeafe;background:#eef6ff;color:#0b5394;padding:6px 10px;border-radius:999px;font-weight:700;}
.brand-chip .dot{width:8px;height:8px;border-radius:50%;background:var(--madar-primary-2);box-shadow:0 0 0 3px rgba(14,165,233,.15);}
.brand-chip__text{font-size:12px;}

.section-title{font-weight:800;font-size:16px;color:var(--madar-ink);margin:6px 0 12px;}
.section-sub{color:var(--madar-muted);font-weight:600;font-size:12px;margin-left:4px;}

.empty{padding:24px;border:1px dashed var(--madar-border);border-radius:14px;color:#6b7280;text-align:center;background:#fafafa;}
.empty__icon{font-size:28px;color:var(--madar-primary)}
.empty__title{margin-top:8px;font-weight:800;color:var(--madar-ink)}
.empty__sub{font-size:12px;color:#6b7280}

.playlist-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px;}
.pl-card{background:var(--madar-card);border:1px solid var(--madar-border);border-radius:16px;overflow:hidden;transition:box-shadow .18s ease,transform .06s ease,border-color .18s ease;}
.pl-card:hover{box-shadow:0 14px 34px rgba(17,24,39,.08);transform:translateY(-2px);border-color:#dbe4ee;}

.pl-cover{position:relative;width:100%;aspect-ratio:16/9;background:#0b1220;}
@supports not (aspect-ratio:16/9){.pl-cover::before{content:"";display:block;padding-top:56.25%;}}
.pl-cover img,.pl-cover-fallback{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}

.pl-cover-fallback{display:flex;align-items:center;justify-content:center;background:radial-gradient(120% 120% at 50% 0%,#0f1b2e 0%,#0b1220 55%,#070d16 100%);}
.madar-logo{width:54%;height:auto;}
.madar-logo .ml-stroke{fill:none;stroke:var(--madar-primary);stroke-width:5;stroke-linecap:round;stroke-linejoin:round;}
.madar-logo .ml-text{fill:#d1fff0;font:700 22px "Nunito Sans",system-ui,-apple-system,Segoe UI,Roboto,"Noto Sans Arabic",sans-serif;letter-spacing:2px;}

.pl-cover-overlay{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(0,0,0,.08) 0%,rgba(0,0,0,.55) 100%);}
.pl-cover-top{position:absolute;top:10px;left:10px;right:10px;display:flex;gap:6px;}
.pl-cover-bottom{position:absolute;left:12px;right:12px;bottom:12px;}
.pl-title{color:#fff;font-weight:900;font-size:16px;line-height:1.25;text-shadow:0 1px 2px rgba(0,0,0,.4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.pl-meta{margin-top:4px;font-size:12px;color:#d1d5db;}
.pl-meta .dot-sep{margin:0 6px;color:#bfc6d4;}

.pl-dots{position:absolute;left:12px;bottom:12px;transform:translateY(100%);display:flex;gap:6px;padding:8px 0;}
.pl-dots .dot{width:7px;height:7px;border-radius:999px;background:#cbd5e1;opacity:.6;transition:opacity .15s,transform .15s;}
.pl-dots .dot.active{opacity:1;transform:scale(1.2);background:var(--madar-primary);}

.pl-thumbs{display:flex;gap:8px;padding:10px 12px 0;}
.thumb{flex:0 0 auto;width:86px;height:56px;border-radius:10px;background:#f5f7fa;display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid #eef0f3;transition:transform .12s,box-shadow .12s;}
.thumb:hover{transform:translateY(-1px);box-shadow:0 6px 14px rgba(17,24,39,.06);}
.thumb img{width:100%;height:100%;object-fit:cover;}
.thumb-video{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#101827;color:#fff;}
.thumb.more{font-weight:800;background:#fff;color:#111827;border-style:dashed;}

.pl-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border-top:1px solid #eef2f7;background:#fff;flex-wrap:wrap;}
.pl-actions .actions-left{display:flex;gap:8px;flex-wrap:wrap;}
.pl-actions .actions-right{display:flex;gap:8px;}
.pl-actions .el-button{height:30px;line-height:30px;padding:0 12px;border-radius:8px;}
.open-btn{font-weight:700;box-shadow:0 6px 16px rgba(16,185,129,.18);}

.items-toolbar{display:flex;align-items:center;gap:8px;margin-bottom:10px;}
.url-form .row{display:flex;gap:8px;margin-top:8px;}
.url-form .actions{margin-top:8px;text-align:right;}
.url-type-select{width:160px;}
.preview{width:110px;height:62px;border-radius:8px;background:#0b1220;display:flex;align-items:center;justify-content:center;overflow:hidden;}
.preview img{width:100%;height:100%;object-fit:cover;}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace;}
.muted{color:#909399;}
/* ===== RTL tweaks ===== */
.content-page.rtl .ml-1{ margin-left:0; margin-right:8px; }
.content-page.rtl .pl-cover-top{ left:auto; right:10px; }
.content-page.rtl .pl-cover-bottom{ left:12px; right:12px; text-align:right; }
.content-page.rtl .pl-meta .dot-sep{ margin:0 6px; }
/* .items-table.rtl .el-table__header-wrapper th{ text-align:right; }  */
.items-table.rtl .el-table__body-wrapper td{ text-align:right; }
</style>
