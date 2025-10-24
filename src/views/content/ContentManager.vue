<template>
  <div class="app-container">
    <!-- FILTER BAR -->
    <el-card shadow="never" class="mb-2">
      <div class="toolbar">
        <el-select v-model="state.customerId" placeholder="Select customer" filterable style="width:360px" @change="onCustomerChange">
          <el-option v-for="c in customers" :key="c.id" :value="c.id" :label="c.name" />
        </el-select>
        <div class="flex" />
        <el-button icon="el-icon-refresh" :loading="loading.customers || loading.playlists || loading.screens" @click="init">Refresh</el-button>
      </div>
    </el-card>

    <el-row :gutter="16">
      <!-- LEFT: PLAYLISTS -->
      <el-col :xs="24" :lg="10">
        <el-card shadow="never">
          <div class="section-title">
            <h3>Playlists</h3>
            <div class="actions">
              <el-input v-model.trim="playlistForm.name" :disabled="!state.customerId" placeholder="New playlist name" style="width:220px;margin-right:8px" />
              <el-button type="primary" :disabled="!state.customerId || !playlistForm.name" @click="createPlaylist">Create</el-button>
            </div>
          </div>

          <el-table v-loading="loading.playlists" :data="playlists" border height="300">
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column label="Name">
              <template slot-scope="{ row }">
                <el-input v-if="state.editingPlaylistId===row.id" v-model="row._name" size="mini" />
                <span v-else>{{ row.name }}</span>
              </template>
            </el-table-column>
            <el-table-column label="Flags" width="140">
              <template slot-scope="{ row }">
                <el-tag v-if="row.is_default" size="mini">Default</el-tag>
                <el-tag v-if="row.published_at" type="success" size="mini">Published</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="Actions" width="320" fixed="right">
              <template slot-scope="{ row }">
                <el-button size="mini" @click="selectPlaylist(row)">Items</el-button>
                <el-button v-if="state.editingPlaylistId!==row.id" size="mini" @click="startRename(row)">Rename</el-button>
                <el-button v-if="state.editingPlaylistId===row.id" size="mini" type="primary" @click="saveRename(row)">Save</el-button>
                <el-button size="mini" @click="publish(row)">Publish</el-button>
                <el-button size="mini" @click="setDefault(row)">Set default</el-button>
                <el-button size="mini" @click="refreshVersion(row)">Refresh ver</el-button>
                <el-popconfirm title="Delete playlist?" @confirm="removePlaylist(row)">
                  <el-button slot="reference" size="mini" type="danger">Delete</el-button>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>

          <!-- ITEMS -->
          <div v-if="activePlaylist" class="mt-2">
            <div class="section-title">
              <h3>Items — {{ activePlaylist.name }} (v: {{ activePlaylist.content_version || '-' }})</h3>
              <div class="actions">
                <el-select v-model="upload.type" placeholder="Type" style="width:120px;margin-right:8px">
                  <el-option label="Image" value="image" />
                  <el-option label="Video" value="video" />
                </el-select>
                <el-input-number v-model="upload.duration" :min="1" :max="3600" :disabled="upload.type!=='image'" placeholder="Duration (s)" />
                <el-upload
                  :disabled="!upload.type"
                  class="ml-1"
                  :auto-upload="false"
                  :show-file-list="false"
                  accept="image/*,video/*"
                  :on-change="onUploadChoose"
                >
                  <el-button icon="el-icon-upload" :disabled="!upload.type">Choose</el-button>
                </el-upload>
              </div>
            </div>

            <el-table v-loading="loading.items" :data="items" border>
              <el-table-column prop="sort" label="#" width="60" />
              <el-table-column label="Preview">
                <template slot-scope="{ row }">
                  <img v-if="row.type==='image'" :src="row.src" style="height:42px;border-radius:4px">
                  <span v-else>🎬 {{ row.src }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="type" label="Type" width="90" />
              <el-table-column label="Duration" width="140">
                <template slot-scope="{ row }">
                  <template v-if="row.type==='image'">
                    <el-input-number v-model="row._duration" :min="1" :max="3600" size="mini" />
                    <el-button size="mini" class="ml-1" @click="saveItem(row)">Save</el-button>
                  </template>
                  <span v-else>natural</span>
                </template>
              </el-table-column>
              <el-table-column label="Order" width="160">
                <template slot-scope="{ row, $index }">
                  <el-button size="mini" :disabled="$index===0" @click="moveItem($index,-1)">▲</el-button>
                  <el-button size="mini" :disabled="$index===items.length-1" @click="moveItem($index,1)">▼</el-button>
                </template>
              </el-table-column>
              <el-table-column label="Actions" width="180" fixed="right">
                <template slot-scope="{ row }">
                  <el-upload :auto-upload="false" :show-file-list="false" accept="image/*,video/*" :on-change="f=>replaceItem(row,f)">
                    <el-button size="mini">Replace</el-button>
                  </el-upload>
                  <el-popconfirm title="Delete item?" @confirm="deleteItem(row)">
                    <el-button slot="reference" size="mini" type="danger">Delete</el-button>
                  </el-popconfirm>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>
      </el-col>

      <!-- RIGHT: SCREENS -->
      <el-col :xs="24" :lg="14">
        <el-card shadow="never">
          <div class="section-title">
            <h3>Screens</h3>
            <div class="actions">
              <el-select v-model="assign.playlistId" placeholder="Assign playlist" :disabled="!activePlaylist && !assign.playlistId" style="width:280px">
                <el-option v-for="p in playlists" :key="p.id" :value="p.id" :label="p.name" />
              </el-select>
              <el-button type="primary" :disabled="!assign.playlistId || !state.selectedScreenIds.length" @click="assignPlaylistToSelected">Assign to selected</el-button>
              <el-button :disabled="!state.selectedScreenIds.length" @click="refreshSelected">Refresh selected</el-button>
            </div>
          </div>

          <el-table
            v-loading="loading.screens"
            :data="screens"
            border
            @selection-change="sel => state.selectedScreenIds = sel.map(s => s.id)"
          >
            <el-table-column type="selection" width="50" />
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column label="Serial / Customer">
              <template slot-scope="{ row }">
                <div style="font-family:monospace">{{ row.serial_number }}</div>
                <small class="muted">{{ row.customer_name || ('#'+row.customer_id) }}</small>
              </template>
            </el-table-column>
            <el-table-column label="Status" width="120">
              <template slot-scope="{ row }">
                <el-tag :type="row.online ? 'success' : 'info'">{{ row.online ? 'Online' : 'Offline' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="playlist_id" label="Assigned" width="120" />
            <el-table-column prop="last_check_in_at" label="Last Check-in" width="180" />
            <el-table-column label="Actions" width="200" fixed="right">
              <template slot-scope="{ row }">
                <el-select v-model="row._playlist" placeholder="Playlist" style="width:140px">
                  <el-option v-for="p in playlists" :key="p.id" :value="p.id" :label="p.name" />
                </el-select>
                <el-button size="mini" @click="assignPlaylist(row)">Save</el-button>
                <el-button size="mini" @click="refreshOne(row)">Refresh</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import {
  listCustomers
} from '@/api/customers'
import {
  listPlaylists, createPlaylist, updatePlaylist, deletePlaylist,
  publishPlaylist, setDefaultPlaylist, refreshPlaylistVersion,
  listPlaylistItems, createPlaylistItem, updatePlaylistItem, deletePlaylistItem, reorderPlaylistItems
} from '@/api/playlists'
import {
  listScreens, setScreenPlaylist, refreshScreen
} from '@/api/screens'

export default {
  name: 'ContentManager',
  data() {
    return {
      customers: [],
      playlists: [],
      items: [],
      screens: [],
      activePlaylist: null,

      playlistForm: { name: '' },
      upload: { type: '', duration: null },
      assign: { playlistId: null },

      state: {
        customerId: null,
        editingPlaylistId: null,
        selectedScreenIds: []
      },

      loading: {
        customers: false,
        playlists: false,
        items: false,
        screens: false
      }
    }
  },
  created() { this.init() },
  methods: {
    async init() {
      await this.loadCustomers()
      await Promise.all([this.loadPlaylists(), this.loadScreens()])
    },

    async loadCustomers() {
      this.loading.customers = true
      try {
        const r = await listCustomers({ per_page: 100 })
        const root = r?.data ?? r
        this.customers = Array.isArray(root?.data) ? root.data : (Array.isArray(root) ? root : [])
        if (!this.state.customerId && this.customers[0]) this.state.customerId = this.customers[0].id
      } finally { this.loading.customers = false }
    },

    async onCustomerChange() {
      this.activePlaylist = null
      await Promise.all([this.loadPlaylists(), this.loadScreens()])
    },

    // PLAYLISTS
    async loadPlaylists() {
      if (!this.state.customerId) { this.playlists = []; return }
      this.loading.playlists = true
      try {
        const r = await listPlaylists({ customer_id: this.state.customerId, per_page: 100 })
        const root = r?.data ?? r
        const rows = Array.isArray(root?.data) ? root.data : (Array.isArray(root) ? root : [])
        // keep editable copy of name for rename UX
        this.playlists = rows.map(p => ({ ...p, _name: p.name }))
      } finally { this.loading.playlists = false }
    },
    async createPlaylist() {
      if (!this.playlistForm.name || !this.state.customerId) return
      const r = await createPlaylist({ customer_id: this.state.customerId, name: this.playlistForm.name })
      this.$message.success(r?.message || 'Playlist created')
      this.playlistForm.name = ''
      await this.loadPlaylists()
    },
    selectPlaylist(row) {
      this.activePlaylist = row
      this.loadItems()
    },
    async saveRename(row) {
      const pid = row.id // snapshot
      const newName = row._name // snapshot

      await updatePlaylist(pid, { name: newName })

      // حدّث العنصر داخل المصفوفة بدل لمس row مباشرة
      const idx = this.playlists.findIndex(p => p.id === pid)
      if (idx !== -1) {
        this.$set(this.playlists, idx, { ...this.playlists[idx], name: newName })
      }

      this.state.editingPlaylistId = null
      this.$message.success('Saved')
    },
    async removePlaylist(row) {
      await deletePlaylist(row.id)
      if (this.activePlaylist && this.activePlaylist.id === row.id) this.activePlaylist = null
      await this.loadPlaylists()
      this.$message.success('Deleted')
    },
    async publish(row) {
      await publishPlaylist(row.id)
      this.$message.success('Published')
      this.loadPlaylists()
    },
    async setDefault(row) {
      await setDefaultPlaylist(row.id)
      this.$message.success('Default set')
      this.loadPlaylists()
    },
    async refreshVersion(row) {
      await refreshPlaylistVersion(row.id)
      this.$message.success('Version refreshed')
      this.loadPlaylists()
      if (this.activePlaylist && this.activePlaylist.id === row.id) this.loadItems()
    },

    // ITEMS
    async loadItems() {
      this.items = []
      if (!this.activePlaylist) return
      this.loading.items = true
      try {
        const r = await listPlaylistItems(this.activePlaylist.id)
        const root = r?.data ?? r
        const rows = Array.isArray(root?.data) ? root.data : (Array.isArray(root) ? root : [])
        this.items = rows.map(it => ({ ...it, _duration: it.duration }))
      } finally { this.loading.items = false }
    },
    onUploadChoose(file) {
      if (!this.activePlaylist) return
      const fd = new FormData()
      fd.append('type', this.upload.type)
      if (this.upload.type === 'image' && this.upload.duration) fd.append('duration', String(this.upload.duration))
      fd.append('file', file.raw)
      createPlaylistItem(this.activePlaylist.id, fd).then(() => {
        this.$message.success('Item added')
        this.upload = { type: '', duration: null }
        this.loadItems()
        this.loadPlaylists()
      }).catch(e => this.$message.error(this.err(e)))
    },
    async saveItem(row) {
      await updatePlaylistItem(this.activePlaylist.id, row.id, { duration: row._duration })
      this.$message.success('Saved')
      this.loadItems()
      this.loadPlaylists()
    },
    replaceItem(row, file) {
      const fd = new FormData()
      fd.append('replace', file.raw)
      if (row.type === 'image' && row._duration) fd.append('duration', String(row._duration))
      updatePlaylistItem(this.activePlaylist.id, row.id, fd).then(() => {
        this.$message.success('Replaced')
        this.loadItems()
        this.loadPlaylists()
      })
    },
    async deleteItem(row) {
      await deletePlaylistItem(this.activePlaylist.id, row.id)
      this.$message.success('Deleted')
      this.loadItems()
      this.loadPlaylists()
    },
    async moveItem(index, dir) {
      const next = index + dir
      if (next < 0 || next >= this.items.length) return
      const ids = this.items.map(i => i.id)
      const tmp = ids[index]; ids[index] = ids[next]; ids[next] = tmp
      await reorderPlaylistItems(this.activePlaylist.id, { ids })
      this.loadItems()
    },

    // SCREENS
    async loadScreens() {
      this.loading.screens = true
      try {
        const r = await listScreens({ customer_id: this.state.customerId, per_page: 100, sort_by: 'created_at', sort_dir: 'desc' })
        const root = r?.data ?? r
        this.screens = Array.isArray(root?.data) ? root.data : (Array.isArray(root) ? root : [])
        this.screens.forEach(s => { s._playlist = s.playlist_id || null })
      } finally { this.loading.screens = false }
    },
    async assignPlaylist(row) {
      const sid = row.id // snapshot
      const newPlaylistId = row._playlist || null // snapshot

      await setScreenPlaylist(sid, { playlist_id: newPlaylistId })

      // حدّث العنصر داخل المصفوفة بدل لمس row مباشرة
      const idx = this.screens.findIndex(s => s.id === sid)
      if (idx !== -1) {
        this.$set(this.screens, idx, { ...this.screens[idx], playlist_id: newPlaylistId })
      }

      this.$message.success('Assigned')
    },
    async refreshOne(row) {
      await refreshScreen(row.id)
      this.$message.success('Refresh sent')
    },
    async assignPlaylistToSelected() {
      const ops = this.state.selectedScreenIds.map(id => setScreenPlaylist(id, { playlist_id: this.assign.playlistId }))
      await Promise.all(ops)
      this.$message.success('Assigned to selected')
      this.loadScreens()
    },
    async refreshSelected() {
      const ops = this.state.selectedScreenIds.map(id => refreshScreen(id))
      await Promise.all(ops)
      this.$message.success('Refresh sent')
    },

    err(e) {
      return e?.response?.data?.message ||
             e?.response?.data?.errors && Object.values(e.response.data.errors)[0][0] ||
             e?.message || 'Error'
    }
  }
}
</script>

<style scoped>
.mb-2{margin-bottom:12px}
.toolbar{display:flex;align-items:center}
.flex{flex:1}
.section-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.actions{display:flex;align-items:center}
.ml-1{margin-left:8px}
.mt-2{margin-top:12px}
.muted{color:#909399}
</style>
