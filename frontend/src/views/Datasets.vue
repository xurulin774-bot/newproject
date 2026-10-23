<script setup>
// 天气数据集：查看已登记版本、上传新 CSV（校验字段后自动启用）、删除。
import { onMounted, ref } from 'vue'
import http, { errorMessage } from '../api/http'

const items = ref([])
const loading = ref(false)
const uploading = ref(false)
const error = ref('')
const message = ref('')
const fileEl = ref(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const body = await http.get('/api/datasets', { params: { page: 1, size: 20 } })
    items.value = body.items || []
  } catch (e) { error.value = errorMessage(e) } finally { loading.value = false }
}

async function upload() {
  const file = fileEl.value?.files?.[0]
  if (!file) { message.value = ''; error.value = '请先选择 CSV 文件'; return }
  uploading.value = true
  error.value = ''
  message.value = '正在上传并校验文件，请稍候...'
  try {
    const formData = new FormData()
    formData.append('file', file)
    const body = await http.post('/api/datasets/upload', formData)
    message.value = body.message || '上传成功，新数据集已启用'
    fileEl.value.value = ''
    await load()
  } catch (e) {
    error.value = ''
    message.value = ''
    error.value = errorMessage(e) || '上传失败，请检查 CSV 文件后重试'
  } finally { uploading.value = false }
}

async function remove(id) {
  try {
    await http.delete(`/api/datasets/${id}`)
    await load()
  } catch (e) { error.value = errorMessage(e) }
}

function fmtDate(value) { return String(value ?? '').replace('T', ' ').slice(0, 16) }
onMounted(load)
</script>

<template>
  <div>
    <div class="page-head">
      <div><p class="kicker">DATA MANAGEMENT</p><h1>天气数据集</h1>
        <p class="desc">查看已登记的数据版本并上传最新天气 CSV；上传通过字段校验后立即启用，当前版本自动归档。</p></div>
      <span class="badge">管理员功能</span>
    </div>

    <section class="card">
      <div class="card-head"><h2>上传新数据集</h2></div>
      <div class="upload">
        <label class="picker">
          <span class="plus">＋</span>
          <span><strong>选择天气 CSV 文件</strong><small>仅支持 .csv 格式</small></span>
          <input ref="fileEl" type="file" accept=".csv,text/csv" @change="message = ''; error = ''" />
        </label>
        <button class="primary" :disabled="uploading" @click="upload">{{ uploading ? '上传校验中...' : '上传并启用' }}</button>
      </div>
      <p v-if="message" class="msg ok-msg">{{ message }}</p>
      <p v-if="error" class="msg err-msg">{{ error }}</p>
      <p class="note">上传前请确认 CSV 包含系统要求的天气字段。新数据集启用后，仪表盘、城市查询与分析结果将使用新数据。</p>
    </section>

    <section class="card">
      <div class="card-head"><h2>已登记数据集</h2><span>{{ items.length }} 个版本</span></div>
      <div v-if="loading" class="state"><span class="spinner" />加载中...</div>
      <div v-else-if="error" class="state error">{{ error }}</div>
      <div v-else-if="!items.length" class="state">暂无数据集记录</div>
      <div v-else class="table-wrap">
        <table>
          <thead><tr><th>名称</th><th>状态</th><th>行数</th><th>字段</th><th>登记时间</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="item in items" :key="item.id">
              <td><strong>{{ item.name }}</strong><small class="path">{{ item.filePath }}</small></td>
              <td><span class="tag" :class="{ active: item.status === 'ACTIVE' }">{{ item.status }}</span></td>
              <td>{{ (item.rowCount ?? 0).toLocaleString() }}</td>
              <td>{{ item.fieldCount }}</td>
              <td>{{ fmtDate(item.createdAt) }}</td>
              <td><button class="del" :disabled="item.status === 'ACTIVE'" @click="remove(item.id)">{{ item.status === 'ACTIVE' ? '使用中' : '删除' }}</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; }
.page-head .kicker { margin: 0; color: var(--teal); font-size: 10px; font-weight: 700; letter-spacing: .14em; }
.page-head h1 { margin: 6px 0; font-size: 22px; color: var(--deep); }
.page-head .desc { margin: 0; font-size: 12px; color: var(--muted); max-width: 640px; }
.badge { padding: 5px 10px; border-radius: 3px; background: rgba(27,130,120,.1); color: var(--teal); font-size: 11px; }
.upload { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.picker { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border: 1px dashed #b9cec7; border-radius: 4px; cursor: pointer; background: #fafcfb; }
.picker:hover { border-color: var(--teal); }
.picker .plus { font-size: 20px; color: var(--teal); }
.picker strong { display: block; font-size: 12px; color: var(--deep); }
.picker small { font-size: 10px; color: var(--muted); }
.picker input { display: none; }
.msg { margin: 10px 0 0; font-size: 12px; }
.ok-msg { color: var(--teal); }
.err-msg { color: #c4552f; }
.note { margin: 10px 0 0; font-size: 11px; color: var(--muted); }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #edf2f0; }
th { background: #f4f8f6; color: #51635f; }
td strong { color: var(--deep); }
.path { display: block; font-size: 10px; color: #97a5a2; max-width: 380px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tag { padding: 3px 8px; border-radius: 3px; background: #eef2f1; color: var(--muted); font-size: 10px; }
.tag.active { background: rgba(27,130,120,.12); color: var(--teal); }
.del { padding: 5px 10px; border: 1px solid #e8cfc8; background: #fff; color: #c4552f; border-radius: 3px; font-size: 11px; }
.del:disabled { border-color: var(--line); color: #97a5a2; cursor: default; }
</style>
