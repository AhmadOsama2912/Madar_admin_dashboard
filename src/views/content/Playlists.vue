<template>
  <div class="app-container content-page">
    <!-- ======= TOP BAR ======= -->
    <div class="topbar">
      <div class="topbar__left">
        <div class="brand-chip">
          <span class="dot" />
          <span class="brand-chip__text">Madar Content</span>
        </div>

        <el-select
          v-model="filters.customer_id"
          filterable
          clearable
          placeholder="Select customer"
          class="topbar-select"
          @change="loadPlaylists"
        >
          <el-option
            v-for="c in customers"
            :key="c.id"
            :label="c.name"
            :value="c.id"
          />
        </el-select>

        <el-input
          v-model.trim="draft.newPlaylistName"
          placeholder="New playlist name"
          class="ml-1 topbar-input"
          @keyup.enter.native="createPlaylist"
        />
        <el-button
          type="primary"
          class="ml-1"
          :loading="creating"
          @click="createPlaylist"
        >
          Create
        </el-button>
      </div>

      <div class="topbar__right">
        <el-button icon="el-icon-refresh" :loading="loading.playlists" @click="loadPlaylists">
          Refresh
        </el-button>
      </div>
    </div>

    <!-- ======= PLAYLISTS ======= -->
    <el-row :gutter="16">
      <el-col :span="24">
        <div class="section-title">
          Playlists
          <span v-if="playlists.length" class="section-sub">({{ playlists.length }})</span>
        </div>

        <div v-if="!playlists.length" class="empty">
          <div class="empty__icon">
            <i class="el-icon-video-camera" />
          </div>
          <div class="empty__title">No playlists yet</div>
          <div class="empty__sub">Pick a customer (optional) and create a playlist above.</div>
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
              <img
                v-if="coverImage(pl)"
                :src="coverImage(pl)"
                alt="cover"
                loading="lazy"
              >
              <div v-else class="pl-cover-fallback">
                <!-- Minimal Madar logo vibe -->
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
                <el-tag v-if="pl.is_default" size="mini" type="info">Default</el-tag>
                <el-tag v-if="pl.published_at" size="mini" type="success">Published</el-tag>
              </div>

              <div class="pl-cover-bottom">
                <div class="pl-title" :title="pl.name">{{ pl.name }}</div>
                <div class="pl-meta">
                  <span>{{ count(pl.items_count) }} items</span>
                  <span class="dot-sep">•</span>
                  <span>{{ timeAgo(pl.updated_at ? pl.updated_at : pl.created_at) }}</span>
                </div>
              </div>

              <!-- Carousel dots (max 5) -->
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
                <img
                  v-if="thumb.type === 'image'"
                  :src="resolveUrl(thumb.url)"
                  alt="thumb"
                  loading="lazy"
                >
                <div v-else class="thumb-video">
                  <i class="el-icon-video-play" />
                </div>
              </div>

              <div v-if="count(pl.items_count) > 3" class="thumb more">
                +{{ count(pl.items_count) - 3 }}
              </div>
            </div>

            <!-- Actions -->
            <div class="pl-actions">
              <div class="actions-left">
                <el-button size="mini" @click="renamePlaylist(pl)">Rename</el-button>
                <el-button size="mini" type="success" plain @click="publish(pl)">Publish</el-button>
                <el-button size="mini" plain @click="setDefault(pl)">Set default</el-button>
                <el-button size="mini" type="danger" plain @click="removePlaylist(pl)">Delete</el-button>
              </div>
              <div class="actions-right">
                <el-button size="mini" type="primary" class="open-btn" @click="openItems(pl)">Open</el-button>
              </div>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- ======= ITEMS DIALOG ======= -->
    <el-dialog
      :visible.sync="itemsDlg.open"
      :title="'Playlist: ' + (itemsDlg.playlist ? itemsDlg.playlist.name : '')"
      width="90%"
      top="6vh"
      :close-on-click-modal="false"
      class="items-dialog"
    >
      <div class="items-toolbar">
        <el-upload
          :auto-upload="false"
          :show-file-list="false"
          :on-change="onUploadChange"
          accept="image/*,video/*"
        >
          <el-button icon="el-icon-plus">Add File</el-button>
        </el-upload>

        <el-popover v-model="ui.addUrlOpen" placement="bottom" width="360" trigger="click">
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
                label="Seconds"
              />
            </div>
            <div class="actions">
              <el-button @click="ui.addUrlOpen = false">Cancel</el-button>
              <el-button type="primary" :loading="creatingItem" @click="addUrl">Add</el-button>
            </div>
          </div>
          <el-button slot="reference">Add URL</el-button>
        </el-popover>

        <div class="flex-spacer" />
        <el-button :loading="refreshing" @click="refreshVersion">Refresh ver</el-button>
        <el-button type="primary" plain :disabled="!dirtyOrder" @click="saveOrder">Save order</el-button>
      </div>

      <el-table v-loading="loading.items" :data="items" border class="items-table">
        <el-table-column label="#" width="54">
          <template slot-scope="{ $index }">{{ $index + 1 }}</template>
        </el-table-column>

        <el-table-column label="Preview" width="140">
          <template slot-scope="{ row }">
            <div class="preview">
              <img v-if="row.type === 'image'" :src="resolveUrl(row.src)" alt="">
              <i v-else class="el-icon-video-camera" />
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="type" label="Type" width="120" />

        <el-table-column label="Source">
          <template slot-scope="{ row }">
            <a :href="resolveUrl(row.src)" target="_blank" rel="noopener" class="mono">
              {{ resolveUrl(row.src) }}
            </a>
          </template>
        </el-table-column>

        <el-table-column label="Duration" width="200">
          <template slot-scope="{ row }">
            <div v-if="row.type === 'image'">
              <el-input-number
                v-model="row.duration"
                :min="1"
                :max="3600"
                :step="1"
                controls-position="right"
              />
              <span class="muted ml-1">sec</span>
            </div>
            <div v-else class="muted">video length</div>
          </template>
        </el-table-column>

        <el-table-column label="Order" width="140">
          <template slot-scope="{ $index }">
            <el-button
              size="mini"
              icon="el-icon-arrow-up"
              :disabled="$index === 0"
              @click="moveItem($index, -1)"
            />
            <el-button
              size="mini"
              icon="el-icon-arrow-down"
              :disabled="$index === items.length - 1"
              @click="moveItem($index, +1)"
            />
          </template>
        </el-table-column>

        <el-table-column label="Actions" width="160" fixed="right">
          <template slot-scope="{ row }">
            <el-button
              size="mini"
              type="primary"
              plain
              :disabled="row.type !== 'image'"
              :loading="row._saving === true"
              @click="saveItem(row)"
            >
              Save
            </el-button>
            <el-button
              size="mini"
              type="danger"
              plain
              @click="deleteItem(row)"
            >
              Delete
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <span slot="footer" class="dialog-footer">
        <el-button @click="itemsDlg.open = false">Close</el-button>
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

const MEDIA_HOST = 'http://localhost:8000/storage' // adjust if needed

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
  created() {
    this.loadCustomers()
    this.loadPlaylists()
  },
  beforeDestroy() {
    (this.playlists || []).forEach(p => this.stopCarousel(p))
  },
  methods: {
    /* ---------- utils ---------- */
    count(v) { const n = Number(v); return isNaN(n) ? 0 : n },
    timeAgo(dt) {
      if (!dt) return 'now'
      const s = Math.max(1, Math.round((Date.now() - new Date(dt).getTime()) / 1000))
      if (s < 60) return s + 's ago'
      const m = Math.round(s / 60); if (m < 60) return m + 'm ago'
      const h = Math.round(m / 60); if (h < 24) return h + 'h ago'
      return Math.round(h / 24) + 'd ago'
    },
    resolveUrl(src) {
      if (!src) return ''
      if (/^https?:\/\//i.test(src)) return src
      const normalized = String(src).replace(/^\//, '')
      return MEDIA_HOST + '/' + normalized
    },

    /* ---------- customers ---------- */
    async loadCustomers() {
      try {
        const res = await listCustomers({ page: 1, per_page: 100 })
        const root = res && res.data ? res.data : res
        this.customers = Array.isArray(root && root.data) ? root.data : (Array.isArray(root) ? root : [])
      } catch (e) {
        this.$message.error(this.err(e, 'Failed to load customers'))
      }
    },

    /* ---------- playlists ---------- */
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
        this.$message.error(this.err(e, 'Failed to load playlists'))
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
        this.$message.error(this.err(e, 'Failed to create playlist'))
      } finally {
        this.creating = false
      }
    },

    async renamePlaylist(pl) {
      try {
        const ret = await this.$prompt('New name', 'Rename playlist', { inputValue: pl.name })
        if (!ret || !ret.value) return
        await updatePlaylist(pl.id, { name: ret.value })
        this.$message.success('Renamed')
        await this.loadPlaylists()
      } catch (e) {
        this.$message.error(this.err(e, 'Failed to rename playlist'))
      }
    },

    async publish(pl) {
      try {
        await publishPlaylist(pl.id)
        this.$message.success('Published')
        await this.loadPlaylists()
      } catch (e) {
        this.$message.error(this.err(e, 'Publish failed'))
      }
    },

    async setDefault(pl) {
      try {
        await setDefaultPlaylist(pl.id)
        this.$message.success('Set as default')
        await this.loadPlaylists()
      } catch (e) {
        this.$message.error(this.err(e, 'Failed to set default'))
      }
    },

    async removePlaylist(pl) {
      try {
        await this.$confirm('Delete this playlist? This cannot be undone.', 'Confirm', { type: 'warning' })
        await apiDeletePlaylist(pl.id)
        this.$message.success('Deleted')
        await this.loadPlaylists()
      } catch (e) {
        this.$message.error(this.err(e, 'Failed to delete playlist'))
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
          const it = items[i]
          thumbs.push({ type: it.type, url: it.src })
        }
        this.$set(pl, '_thumbs', thumbs)
      } catch (e) {
        this.$set(pl, '_thumbs', [])
      } finally {
        this.$set(pl, '_thumbsLoading', false)
      }
    },

    hasThumbs(pl) {
      return !!(pl && pl._thumbs && pl._thumbs.length)
    },

    coverImage(pl) {
      if (!this.hasThumbs(pl)) return null
      const list = pl._thumbs.slice(0, 5)
      const idx = pl._carouselIdx || 0
      const t = list[idx]
      return t && t.type === 'image' ? this.resolveUrl(t.url) : null
    },

    onEnterCard(pl) {
      this.ensureThumbs(pl)
      this.startCarousel(pl)
    },

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

    /* ---------- items dialog ---------- */
    async openItems(pl) {
      this.itemsDlg.playlist = pl
      this.itemsDlg.open = true
      await this.loadItems()
    },

    async loadItems() {
      if (!this.itemsDlg.playlist) { this.items = []; return }
      this.loading.items = true
      try {
        const res = await showPlaylist(this.itemsDlg.playlist.id)
        const data = res && res.data ? res.data : res
        const its = Array.isArray(data && data.items) ? data.items : []
        this.items = its.map((it, i) => ({
          id: it.id,
          type: it.type,
          src: it.src,
          duration: it.duration || 8,
          sort: typeof it.sort === 'number' ? it.sort : i,
          _saving: false
        }))
        this.dirtyOrder = false
      } catch (e) {
        this.$message.error(this.err(e, 'Failed to load items'))
        this.items = []
      } finally {
        this.loading.items = false
      }
    },

    onUploadChange(file) {
      const t = file && file.raw && file.raw.type ? file.raw.type : ''
      const type = t.indexOf('image') === 0 ? 'image' : 'video'
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
        this.$message.success('Item added')
        await this.loadItems()
      } catch (e) {
        this.$message.error(this.err(e, 'Upload failed'))
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
        this.$message.success('Item added')
        this.ui.addUrlOpen = false
        this.draft.url = { type: 'image', src: '', duration: 8 }
        await this.loadItems()
      } catch (e) {
        this.$message.error(this.err(e, 'Add URL failed'))
      } finally {
        this.creatingItem = false
      }
    },

    async saveItem(row) {
      if (row._saving) return
      this.$set(row, '_saving', true)
      try {
        await updatePlaylistItem(this.itemsDlg.playlist.id, row.id, { duration: row.duration })
        this.$message.success('Saved')
      } catch (e) {
        this.$message.error(this.err(e, 'Save failed'))
      } finally {
        this.$set(row, '_saving', false)
      }
    },

    async deleteItem(row) {
      try {
        await this.$confirm('Delete this item?', 'Confirm', { type: 'warning' })
        await deletePlaylistItem(this.itemsDlg.playlist.id, row.id)
        this.$message.success('Deleted')
        await this.loadItems()
      } catch (e) {
        this.$message.error(this.err(e, 'Failed to delete item'))
      }
    },

    moveItem(index, delta) {
      const ni = index + delta
      if (ni < 0 || ni >= this.items.length) return
      const arr = this.items.slice()
      const it = arr.splice(index, 1)[0]
      arr.splice(ni, 0, it)
      arr.forEach((item, i) => { item.sort = i })
      this.items = arr
      this.dirtyOrder = true
    },

    async saveOrder() {
      try {
        const order = this.items.map(i => i.id)
        await reorderPlaylistItems(this.itemsDlg.playlist.id, { order })
        this.$message.success('Order saved')
        this.dirtyOrder = false
      } catch (e) {
        this.$message.error(this.err(e, 'Failed to save order'))
      }
    },

    async refreshVersion() {
      if (!this.itemsDlg.playlist) return
      this.refreshing = true
      try {
        await refreshPlaylistVersion(this.itemsDlg.playlist.id)
        this.$message.success('Version refreshed')
        await this.loadPlaylists()
      } catch (e) {
        this.$message.error(this.err(e, 'Failed to refresh version'))
      } finally {
        this.refreshing = false
      }
    },

    err(e, fb) {
      if (e && e.response && e.response.data) {
        if (e.response.data.message) return e.response.data.message
        const errs = e.response.data.errors
        if (errs) {
          const firstKey = Object.keys(errs)[0]
          if (firstKey && errs[firstKey] && errs[firstKey][0]) return errs[firstKey][0]
        }
      }
      return fb || 'Unexpected error'
    }
  }
}
</script>

<style scoped>
/* ===== Madar DNA ===== */
:root {
  --madar-primary:#00a57a;
  --madar-primary-2:#0ea5e9;
  --madar-ink:#0f172a;
  --madar-muted:#64748b;
  --madar-border:#e7edf5;
  --madar-card:#ffffff;
  --madar-soft:#f7fafc;
}

.content-page{ background:#ffffff; }

/* Topbar */
.topbar{
  display:flex; align-items:center; justify-content:space-between;
  gap:12px; padding:10px 12px; background:#fff; border:1px solid var(--madar-border);
  border-radius:14px; margin-bottom:14px;
}
.topbar__left{ display:flex; align-items:center; gap:8px; }
.topbar__right{ display:flex; align-items:center; gap:8px; }
.topbar-select{ width:320px; max-width: 40vw; }
.topbar-input{ max-width:280px; }
.ml-1{ margin-left:8px; }
.flex-spacer{ flex:1; }

/* Brand chip */
.brand-chip{
  display:flex; align-items:center; gap:8px;
  border:1px solid #dbeafe; background:#eef6ff; color:#0b5394;
  padding:6px 10px; border-radius:999px; font-weight:700;
}
.brand-chip .dot{
  width:8px; height:8px; border-radius:50%; background:var(--madar-primary-2);
  box-shadow:0 0 0 3px rgba(14,165,233,.15);
}
.brand-chip__text{ font-size:12px; }

/* Section */
.section-title{ font-weight:800; font-size:16px; color:var(--madar-ink); margin:6px 0 12px; }
.section-sub{ color:var(--madar-muted); font-weight:600; font-size:12px; margin-left:4px; }

/* Empty state */
.empty{
  padding:24px; border:1px dashed var(--madar-border); border-radius:14px; color:#6b7280;
  text-align:center; background:#fafafa;
}
.empty__icon{ font-size:28px; color:var(--madar-primary) }
.empty__title{ margin-top:8px; font-weight:800; color:var(--madar-ink) }
.empty__sub{ font-size:12px; color:#6b7280 }

/* Grid */
.playlist-grid{
  display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:14px;
}

/* Card */
.pl-card{
  background:var(--madar-card); border:1px solid var(--madar-border); border-radius:16px; overflow:hidden;
  transition:box-shadow .18s ease, transform .06s ease, border-color .18s ease;
}
.pl-card:hover{
  box-shadow:0 14px 34px rgba(17,24,39,.08);
  transform:translateY(-2px);
  border-color:#dbe4ee;
}

/* Cover */
.pl-cover{ position:relative; width:100%; aspect-ratio:16/9; background:#0b1220; }
@supports not (aspect-ratio:16/9){ .pl-cover::before{ content:""; display:block; padding-top:56.25%; } }
.pl-cover img, .pl-cover-fallback{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }

/* Fallback */
.pl-cover-fallback{
  display:flex; align-items:center; justify-content:center;
  background:radial-gradient(120% 120% at 50% 0%, #0f1b2e 0%, #0b1220 55%, #070d16 100%);
}
.madar-logo{ width:54%; height:auto; }
.madar-logo .ml-stroke{ fill:none; stroke:var(--madar-primary); stroke-width:5; stroke-linecap:round; stroke-linejoin:round; }
.madar-logo .ml-text{ fill:#d1fff0; font:700 22px "Nunito Sans", system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans Arabic", sans-serif; letter-spacing:2px; }

/* overlay + content */
.pl-cover-overlay{
  position:absolute; inset:0; pointer-events:none;
  background:linear-gradient(180deg, rgba(0,0,0,.08) 0%, rgba(0,0,0,.55) 100%);
}
.pl-cover-top{ position:absolute; top:10px; left:10px; right:10px; display:flex; gap:6px; }
.pl-cover-bottom{ position:absolute; left:12px; right:12px; bottom:12px; }
.pl-title{
  color:#fff; font-weight:900; font-size:16px; line-height:1.25;
  text-shadow:0 1px 2px rgba(0,0,0,.4); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.pl-meta{ margin-top:4px; font-size:12px; color:#d1d5db; }
.pl-meta .dot-sep{ margin:0 6px; color:#bfc6d4; }

/* Carousel dots */
.pl-dots{
  position:absolute; left:12px; bottom:12px; transform:translateY(100%); display:flex; gap:6px; padding:8px 0;
}
.pl-dots .dot{
  width:7px; height:7px; border-radius:999px; background:#cbd5e1; opacity:.6; transition:opacity .15s, transform .15s;
}
.pl-dots .dot.active{
  opacity:1; transform:scale(1.2); background:var(--madar-primary);
}

/* Thumbs strip */
.pl-thumbs{ display:flex; gap:8px; padding:10px 12px 0; }
.thumb{
  flex:0 0 auto; width:86px; height:56px; border-radius:10px; background:#f5f7fa;
  display:flex; align-items:center; justify-content:center; overflow:hidden;
  border:1px solid #eef0f3; transition:transform .12s, box-shadow .12s;
}
.thumb:hover{ transform:translateY(-1px); box-shadow:0 6px 14px rgba(17,24,39,.06); }
.thumb img{ width:100%; height:100%; object-fit:cover; }
.thumb-video{
  width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#101827; color:#fff;
}
.thumb.more{ font-weight:800; background:#fff; color:#111827; border-style:dashed; }

/* Actions */
.pl-actions{
  display:flex; align-items:center; justify-content:space-between; gap:12px;
  padding:12px; border-top:1px solid #eef2f7; background:#fff; flex-wrap:wrap;
}
.pl-actions .actions-left{ display:flex; gap:8px; flex-wrap:wrap; }
.pl-actions .actions-right{ display:flex; gap:8px; }
.pl-actions .el-button{ height:30px; line-height:30px; padding:0 12px; border-radius:8px; }
.open-btn{ font-weight:700; box-shadow:0 6px 16px rgba(16,185,129,.18); }

/* Items dialog */
.items-toolbar{ display:flex; align-items:center; gap:8px; margin-bottom:10px; }
.url-form .row{ display:flex; gap:8px; margin-top:8px; }
.url-form .actions{ margin-top:8px; text-align:right; }
.url-type-select{ width:160px; }
.preview{
  width:110px; height:62px; border-radius:8px; background:#0b1220;
  display:flex; align-items:center; justify-content:center; overflow:hidden;
}
.preview img{ width:100%; height:100%; object-fit:cover; }

/* Typography / misc */
.mono{
  font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
.muted{ color:#909399; }
</style>
