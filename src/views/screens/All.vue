<!-- src/views/screens/All.vue -->
<template>
  <div class="app-container" :dir="isRTL ? 'rtl' : 'ltr'">
    <!-- Filters -->
    <el-card shadow="never" class="mb-3">
      <div class="filters">
        <el-select
          v-model="ui.customerId"
          :placeholder="$t('app.tv.filters.customer')"
          clearable
          filterable
          style="width:260px"
          class="mr-2"
        >
          <el-option v-for="c in customers" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>

        <el-input
          v-model="ui.serial"
          :placeholder="$t('app.tv.filters.serial')"
          clearable
          class="mr-2"
          style="max-width:220px"
        />

        <el-select
          v-model="ui.online"
          :placeholder="$t('app.tv.filters.status')"
          clearable
          class="mr-2"
          style="width:160px"
        >
          <el-option :value="'1'" :label="$t('app.tv.status.online')" />
          <el-option :value="'0'" :label="$t('app.tv.status.offline')" />
        </el-select>

        <el-date-picker
          v-model="ui.range"
          type="daterange"
          range-separator="–"
          :start-placeholder="$t('app.tv.filters.registered_from')"
          :end-placeholder="$t('app.tv.filters.to')"
          class="mr-2"
          style="width:340px"
        />

        <el-select
          v-model="ui.sortKey"
          :placeholder="$t('app.tv.filters.sort_by')"
          class="mr-2"
          style="width:180px"
        >
          <el-option :label="$t('app.tv.filters.created')" value="created_at" />
          <el-option :label="$t('app.tv.filters.serial_number')" value="serial_number" />
          <el-option :label="$t('app.tv.filters.id')" value="id" />
        </el-select>

        <el-select
          v-model="ui.sortDir"
          :placeholder="$t('app.tv.filters.dir')"
          class="mr-2"
          style="width:130px"
        >
          <el-option :label="$t('app.tv.filters.desc')" value="desc" />
          <el-option :label="$t('app.tv.filters.asc')" value="asc" />
        </el-select>

        <el-button type="primary" icon="el-icon-search" @click="fetch">
          {{ $t('app.tv.filters.filter') }}
        </el-button>
        <el-button class="ml-1" @click="resetFilters">{{ $t('app.tv.filters.reset') }}</el-button>

        <div class="flex-spacer" />

        <el-button icon="el-icon-refresh" :loading="loading" @click="fetch">
          {{ $t('app.tv.filters.refresh') }}
        </el-button>
      </div>
    </el-card>

    <!-- Bulk actions (affixed) -->
    <el-affix v-if="hasBulkBar" :offset="10">
      <el-card
        v-loading="bulkAssigning || bulkBroadcasting"
        element-loading-text="Processing..."
        element-loading-spinner="el-icon-loading"
        shadow="always"
        class="mb-3 bulk-bar"
      >
        <div class="bulk-row">
          <div class="left">
            <el-checkbox v-model="selectAllOnPage" @change="toggleSelectAllOnPage">
              {{ isRTL ? 'تحديد الكل في الصفحة' : 'Select all on page' }}
            </el-checkbox>

            <el-divider direction="vertical" />

            <el-tag type="info" effect="plain">
              {{ selectedTVsIds.length }} {{ $t('app.tv.selected') || (isRTL ? 'محدد' : 'selected') }}
            </el-tag>

            <div v-if="selectedTVs.length" class="chips">
              <el-tag
                v-for="s in selectedPreview"
                :key="s.id"
                size="small"
                effect="plain"
                closable
                @close="unpick(s.id)"
              >
                {{ s.serial_number || ('#'+s.id) }}
              </el-tag>
              <span v-if="selectedTVs.length > maxPreview" class="more">+{{ selectedTVs.length - maxPreview }}</span>
            </div>
          </div>

          <div class="right">
            <el-select
              v-model="bulkPlaylistId"
              :placeholder="isRTL ? 'تعيين قائمة تشغيل' : 'Assign playlist'"
              filterable
              style="width:260px"
              :loading="bulkLoadingPl"
              class="mr-2"
              :disabled="bulkAssigning || bulkBroadcasting"
            >
              <el-option v-for="p in playlists" :key="p.id" :label="p.name" :value="p.id" />
            </el-select>

            <!-- Dropdown action with loading on the trigger button -->
            <el-dropdown :hide-on-click="false" :disabled="!bulkPlaylistId || bulkAssigning || bulkBroadcasting">
              <el-button
                type="primary"
                :loading="bulkAssigning"
                class="mr-2"
                :disabled="!bulkPlaylistId || bulkAssigning || bulkBroadcasting"
              >
                <i class="el-icon-check" />
                <span class="btn-text">{{ isRTL ? 'تعيين' : 'Assign' }}</span>
                <i class="el-icon-arrow-down el-icon--right" />
              </el-button>
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item
                  icon="el-icon-finished"
                  @click.native="assignToSelected"
                >
                  {{ isRTL ? 'للمحدد فقط' : 'To selected screens' }}
                </el-dropdown-item>
                <el-dropdown-item
                  icon="el-icon-office-building"
                  :disabled="!ui.customerId"
                  @click.native="assignToCompany"
                >
                  {{ isRTL ? 'لكل شاشات الشركة' : 'To company screens' }}
                </el-dropdown-item>
                <el-dropdown-item
                  icon="el-icon-s-operation"
                  @click.native="assignToAll"
                >
                  {{ isRTL ? 'لجميع الشاشات' : 'To ALL screens' }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>

            <el-button
              type="warning"
              :loading="bulkBroadcasting"
              :disabled="bulkAssigning || bulkBroadcasting"
              icon="el-icon-bell"
              @click="broadcast"
            >
              {{ isRTL ? 'إرسال تحديث' : 'Broadcast config' }}
            </el-button>
          </div>
        </div>
      </el-card>
    </el-affix>

    <!-- Cards grid -->
    <div
      v-loading="loading"
      element-loading-text="Loading..."
      element-loading-spinner="el-icon-loading"
    >
      <el-row :gutter="16">
        <template v-if="rows.length">
          <el-col v-for="tv in rows" :key="tv.id" :xs="24" :sm="12" :md="8" :lg="6">
            <div class="card-click">
              <el-card class="tv-card" shadow="hover" body-style="{padding:'0'}">
                <!-- Checkbox for selection -->
                <el-checkbox
                  v-model="selectedTVsIds"
                  class="card-checkbox"
                  @change="updateSelected"
                />

                <!-- Playlist chip -->
                <div v-if="tv.content_playlist_name || tv.content_playlist_id" class="chip">
                  <i class="el-icon-video-camera" />
                  <span>{{ tv.content_playlist_name || ('#'+tv.content_playlist_id) }}</span>
                </div>

                <!-- Mock TV -->
                <div class="tv-mock" @click="openDetails(tv)">
                  <div class="led" :class="tv.is_online ? 'on' : 'off'" />
                  <div class="glass">
                    <div class="customer-name">{{ tv.customer_name }}</div>
                    <div class="serial">{{ tv.serial_number }}</div>
                  </div>
                </div>

                <!-- Meta -->
                <div class="meta">
                  <div class="line">
                    <i class="el-icon-s-home" /> {{ tv.customer_name || ('#'+tv.customer_id) }}
                  </div>
                  <div class="line"><i class="el-icon-cpu" /> {{ tv.device_model || '-' }}</div>
                  <div class="line">
                    <i class="el-icon-time" /> {{ $t('app.tv.drawer.last_seen') }}: {{ human(tv.last_check_in_at) }}
                  </div>
                  <div class="line">
                    <i class="el-icon-timer" /> {{ $t('app.tv.meta.license') }}: {{ licenseText(tv.license) }}
                  </div>
                </div>

                <!-- Footer -->
                <div class="footer">
                  <el-tag :type="tv.is_online ? 'success' : 'info'">
                    {{ tv.is_online ? $t('app.tv.status.online') : $t('app.tv.status.offline') }}
                  </el-tag>
                  <span class="spacer" />
                  <el-tooltip :content="$t('app.tv.tooltip.copy_serial')">
                    <el-button type="text" icon="el-icon-document-copy" @click.stop="copy(tv.serial_number)" />
                  </el-tooltip>
                </div>
              </el-card>
            </div>
          </el-col>
        </template>

        <template v-else>
          <el-col :span="24">
            <el-empty :description="$t('app.tv.empty.no_tvs')">
              <div class="mt-1">{{ $t('app.tv.empty.create_code') }}</div>
              <router-link to="/tvs/enrollment-codes">
                <el-button type="primary" class="mt-1">{{ $t('app.tv.empty.create_code_button') }}</el-button>
              </router-link>
            </el-empty>
          </el-col>
        </template>
      </el-row>
    </div>

    <!-- Pagination -->
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
  </div>
</template>

<script>
import { listScreens as apiListTVs } from '@/api/screens'
import { listCustomers } from '@/api/customers'
import { listPlaylists } from '@/api/playlists'

import {
  assignPlaylistToScreensAdmin,
  assignPlaylistToCompanyScreensAdmin,
  assignPlaylistToAllScreensAdmin,
  broadcastScreensConfigAdmin,
  broadcastCompanyConfigAdmin
} from '@/api/playlists'

const MAX_PREVIEW = 8

export default {
  name: 'TVManagementPage',
  data() {
    return {
      loading: false,
      rows: [],
      total: 0,
      q: { page: 1, per_page: 20, sort_by: 'created_at', sort_dir: 'desc' },
      ui: {
        customerId: null,
        serial: '',
        online: null,
        range: null,
        sortKey: 'created_at',
        sortDir: 'desc'
      },
      customers: [],
      playlists: [],
      bulkPlaylistId: null,
      bulkLoadingPl: false,
      bulkAssigning: false,
      bulkBroadcasting: false,

      selectedTVsIds: [],
      selectAllOnPage: false,

      maxPreview: MAX_PREVIEW
    }
  },
  computed: {
    isRTL() {
      return (this.$i18n?.locale || 'ar') === 'ar'
    },
    selectedTVs() {
      return this.rows.filter(r => this.selectedTVsIds.includes(r.id))
    },
    selectedPreview() {
      return this.selectedTVs.slice(0, this.maxPreview)
    },
    hasBulkBar() {
      return this.selectedTVsIds.length > 0 || !!this.ui.customerId
    }
  },
  created() {
    this.loadCustomers()
    this.loadPlaylists()
    this.fetch()
  },
  methods: {
    async loadCustomers() {
      try {
        const res = await listCustomers({ page: 1, per_page: 100 })
        const payload = res?.data?.data || res?.data || res
        this.customers = Array.isArray(payload) ? payload : []
      } catch {
        this.customers = []
      }
    },
    async loadPlaylists() {
      this.bulkLoadingPl = true
      try {
        const res = await listPlaylists({ per_page: 100 })
        const root = res?.data || res
        this.playlists = Array.isArray(root?.data) ? root.data
          : Array.isArray(root) ? root : []
      } finally {
        this.bulkLoadingPl = false
      }
    },
    buildParams() {
      const allowedSort = ['created_at', 'serial_number', 'id']
      const sortBy = allowedSort.includes(this.ui.sortKey) ? this.ui.sortKey : 'created_at'
      const sortDir = ['asc', 'desc'].includes(this.ui.sortDir) ? this.ui.sortDir : 'desc'
      const p = {
        page: this.q.page,
        per_page: Math.min(Math.max(this.q.per_page || 20, 1), 100),
        sort_by: sortBy,
        sort_dir: sortDir
      }
      if (this.ui.customerId) p.customer_id = this.ui.customerId
      if (this.ui.serial) p.serial = this.ui.serial
      if (this.ui.online === '1' || this.ui.online === '0') p.online = this.ui.online
      if (this.ui.range && this.ui.range.length === 2) {
        p.registered_from = this.toYmd(this.ui.range[0])
        p.registered_to = this.toYmd(this.ui.range[1])
      }
      return p
    },
    async fetch() {
      this.loading = true
      try {
        const res = await apiListTVs(this.buildParams())
        const root = res?.data || res
        const arr = Array.isArray(root) ? root
          : Array.isArray(root?.data) ? root.data
            : Array.isArray(root?.data?.data) ? root.data.data
              : []

        this.rows = arr.map(r => ({
          id: r.id,
          customer_id: r.customer_id,
          customer_name: r.customer_name,
          serial_number: r.serial_number,
          device_model: r.device_model,
          os_version: r.os_version,
          app_version: r.app_version,
          content_playlist_id: r.playlist_id,
          content_playlist_name: r.playlist_name,
          last_check_in_at: r.last_check_in_at || r.last_heartbeat_at,
          created_at: r.created_at,
          is_online: !!(r.online ?? (r.last_check_in_at && new Date(r.last_check_in_at) > new Date(Date.now() - 5 * 60 * 1000))),
          license: r.license || null
        }))

        const meta = root?.meta || root?.data?.meta || null
        this.total = meta?.total != null ? Number(meta.total) : this.rows.length

        if (this.selectAllOnPage) {
          this.selectedTVsIds = this.rows.map(r => r.id)
        }
      } finally {
        this.loading = false
      }
    },
    resetFilters() {
      this.q.page = 1
      this.q.per_page = 20
      this.ui = { customerId: null, serial: '', online: null, range: null, sortKey: 'created_at', sortDir: 'desc' }
      this.selectedTVsIds = []
      this.selectAllOnPage = false
      this.fetch()
    },
    toYmd(d) {
      const x = new Date(d)
      return x.toISOString().slice(0, 10)
    },
    human(dt) {
      if (!dt) return '—'
      return new Date(dt).toLocaleString()
    },
    licenseText(lic) {
      if (!lic) return '–'
      const exp = lic?.expires_at ? new Date(lic.expires_at).toLocaleDateString() : '—'
      return `${lic?.status || 'active'} (exp ${exp})`
    },
    copy(text) {
      navigator.clipboard.writeText(text)
      this.$message.success(this.isRTL ? 'تم نسخ الرقم' : 'Serial copied')
    },

    toggleSelectAllOnPage(val) {
      this.selectedTVsIds = val ? this.rows.map(r => r.id) : []
    },
    unpick(id) {
      this.selectedTVsIds = this.selectedTVsIds.filter(x => x !== id)
      if (!this.selectedTVsIds.length) this.selectAllOnPage = false
    },

    /* ================= Bulk Assign ================= */
    async assignToSelected() {
      if (!this.bulkPlaylistId) return
      if (!this.selectedTVsIds.length) {
        return this.$message.warning(this.isRTL ? 'اختر الشاشات أولاً' : 'Pick some screens first')
      }
      this.bulkAssigning = true
      try {
        await assignPlaylistToScreensAdmin({
          screen_ids: this.selectedTVsIds,
          playlist_id: this.bulkPlaylistId
        })
        this.$message.success(this.isRTL ? 'تم التعيين للمجموعة' : 'Assigned to selected screens')
        await this.fetch()
      } catch (e) {
        this.$message.error(this.isRTL ? 'فشل تعيين القائمة للمجموعة' : 'Failed to assign to selected')
      } finally {
        this.bulkAssigning = false
      }
    },
    async assignToCompany() {
      if (!this.bulkPlaylistId || !this.ui.customerId) {
        return this.$message.warning(this.isRTL ? 'اختر الشركة والقائمة' : 'Pick company and playlist')
      }
      this.bulkAssigning = true
      try {
        await assignPlaylistToCompanyScreensAdmin(this.ui.customerId, { playlist_id: this.bulkPlaylistId })
        this.$message.success(this.isRTL ? 'تم التعيين لكل شاشات الشركة' : 'Assigned to company screens')
        await this.fetch()
      } catch {
        this.$message.error(this.isRTL ? 'فشل تعيين الشركة' : 'Failed to assign to company')
      } finally {
        this.bulkAssigning = false
      }
    },
    async assignToAll() {
      if (!this.bulkPlaylistId) {
        return this.$message.warning(this.isRTL ? 'اختر القائمة' : 'Pick a playlist')
      }
      this.bulkAssigning = true
      try {
        await assignPlaylistToAllScreensAdmin({ playlist_id: this.bulkPlaylistId })
        this.$message.success(this.isRTL ? 'تم التعيين لجميع الشاشات' : 'Assigned to ALL screens')
        await this.fetch()
      } catch {
        this.$message.error(this.isRTL ? 'فشل تعيين الجميع' : 'Failed to assign to all')
      } finally {
        this.bulkAssigning = false
      }
    },

    /* ================= Broadcast ================= */
    async broadcast() {
      this.bulkBroadcasting = true
      try {
        if (this.selectedTVsIds.length) {
          await broadcastScreensConfigAdmin({ screen_ids: this.selectedTVsIds })
        } else if (this.ui.customerId) {
          await broadcastCompanyConfigAdmin(this.ui.customerId)
        } else {
          return this.$message.warning(this.isRTL ? 'اختر شاشات أو شركة للبث' : 'Pick screens or a company')
        }
        this.$message.success(this.isRTL ? 'تم الإرسال' : 'Broadcast sent')
      } catch {
        this.$message.error(this.isRTL ? 'فشل الإرسال' : 'Broadcast failed')
      } finally {
        this.bulkBroadcasting = false
      }
    },

    openDetails(tv) {
      // for future drawer
    },
    updateSelected() {
      // keeps selectedTVs computed reactive
    }
  }
}
</script>

<style scoped>
/* layout */
.mb-3 { margin-bottom: 12px; }
.filters { display: flex; align-items: center; flex-wrap: wrap; }
.mr-2 { margin-right: 8px; }
.ml-1 { margin-left: 8px; }
.flex-spacer { flex: 1; }
.pagination { margin-top: 12px; text-align: right; }
.mt-1 { margin-top: 8px; }

/* Bulk bar */
.bulk-bar { border-radius: 12px; }
.bulk-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.bulk-row .left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.bulk-row .right { display: flex; align-items: center; gap: 8px; }
.chips { display: inline-flex; gap: 6px; flex-wrap: wrap; max-width: 60%; }
.more { color: #64748b; font-size: 12px; padding-inline-start: 4px; }
.btn-text { margin: 0 6px; }

/* Cards */
.card-click { cursor: pointer; }
.tv-card { margin-bottom: 16px; position: relative; overflow: hidden; border-radius: 12px; border: 1px solid #e2e8f0; }
.chip {
  position: absolute; top: 12px; right: 12px; z-index: 2;
  display: flex; align-items: center; gap: 6px;
  background: rgba(255, 255, 255, .85); color: #334155; padding: 4px 12px; border-radius: 999px;
  font-size: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, .1); backdrop-filter: blur(4px);
}
.tv-mock {
  position: relative; background: linear-gradient(135deg, #f8fafc, #e2e8f0); height: 160px;
  box-shadow: inset 0 0 0 1px #cbd5e1; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
}
.glass {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  color: #475569; font-weight: 500;
  width: 100%; height: 100%;
}
.customer-name { font-size: 16px; margin-bottom: 4px; }
.serial { font-family: monospace; font-size: 12px; color: #64748b; }
.led {
  position: absolute; top: 12px; left: 12px; width: 8px; height: 8px; border-radius: 50%;
  box-shadow: 0 0 4px rgba(0, 0, 0, .2);
}
.led.on { background: #10b981; box-shadow: 0 0 0 2px rgba(16, 185, 129, .15), 0 0 8px #10b981; }
.led.off { background: #94a3b8; }

.meta { padding: 12px; font-size: 13px; color: #64748b; background: #f9fafb; }
.meta .line { margin: 4px 0; display: flex; align-items: center; gap: 6px; }
.footer { display: flex; align-items: center; padding: 8px 12px; border-top: 1px solid #e2e8f0; background: #fff; }
.footer .spacer { flex: 1; }

/* Checkbox in card */
.card-checkbox { position: absolute; top: 12px; left: 12px; z-index: 2; }

/* RTL tweaks */
[dir="rtl"] .mr-2 { margin-right: 0; margin-left: 8px; }
[dir="rtl"] .ml-1 { margin-left: 0; margin-right: 8px; }
[dir="rtl"] .chip { right: auto; left: 12px; }
</style>
