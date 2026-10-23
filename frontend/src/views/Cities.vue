<script setup>
// 城市数据管理：关键词检索 + 表格分页，演示加载动画与空数据兜底。
import { onMounted, ref } from 'vue'
import http, { errorMessage } from '../api/http'
import { displayCountry, displayCity } from '../api/i18n'

const query = ref('')
const page = ref(1)
const pageSize = 10
const items = ref([])
const loading = ref(false)
const error = ref('')
const searched = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const body = await http.get('/api/cities', { params: { q: query.value, limit: 100 } })
    items.value = body.items || []
    searched.value = true
    page.value = 1
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>

<template>
  <div>
    <div class="page-head">
      <div><p class="kicker">DATA MANAGEMENT</p><h1>城市数据管理</h1>
        <p class="desc">Axios 动态渲染：按国家或城市关键词检索最新观测记录。</p></div>
    </div>
    <section class="card">
      <div class="toolbar">
        <input v-model.trim="query" placeholder="搜索国家或城市，如 China / Paris" @keyup.enter="load" />
        <button :disabled="loading" @click="load">{{ loading ? '查询中...' : '查询数据' }}</button>
      </div>

      <div v-if="loading" class="state loading"><span class="spinner" />正在查询...</div>
      <div v-else-if="error" class="state error-panel"><strong>查询失败</strong><p>{{ error }}</p></div>
      <div v-else-if="!items.length" class="state empty">没有匹配的城市数据</div>
      <template v-else>
        <div class="table-wrap">
          <table>
            <thead><tr><th>国家</th><th>城市</th><th>温度</th><th>体感</th><th>湿度</th><th>PM2.5</th><th>能见度</th></tr></thead>
            <tbody>
              <tr v-for="item in items.slice((page - 1) * pageSize, page * pageSize)" :key="`${item.country}-${item.city}`">
                <td>{{ displayCountry(item.country) }}</td>
                <td><strong>{{ displayCity(item.city) }}</strong></td>
                <td>{{ Number(item.temperature).toFixed(1) }} °C</td>
                <td>{{ Number(item.feels_like).toFixed(1) }} °C</td>
                <td>{{ item.humidity }}%</td>
                <td>{{ item.pm25 }}</td>
                <td>{{ item.visibility }} km</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="pagination">
          <span>共 {{ items.length }} 条记录</span>
          <div>
            <button :disabled="page <= 1" @click="page -= 1">上一页</button>
            <b>{{ page }} / {{ Math.max(1, Math.ceil(items.length / pageSize)) }}</b>
            <button :disabled="page >= Math.ceil(items.length / pageSize)" @click="page += 1">下一页</button>
          </div>
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
.page-head { margin-bottom: 16px; }
.kicker { margin: 0; color: #1b8278; font-size: 10px; font-weight: 700; letter-spacing: .14em; }
h1 { margin: 6px 0; font-size: 22px; color: #123c39; }
.desc { margin: 0; font-size: 12px; color: #71807e; }
.card { background: #fff; border: 1px solid #e1e9e6; border-radius: 4px; padding: 16px; box-shadow: 0 8px 24px rgba(23,59,53,.05); }
.toolbar { display: flex; gap: 10px; margin-bottom: 14px; }
.toolbar input { flex: 1; padding: 10px 12px; border: 1px solid #d7e2dd; border-radius: 3px; font: inherit; box-sizing: border-box; }
.toolbar input:focus { outline: none; border-color: #1b8278; }
.toolbar button { padding: 0 18px; border: 0; border-radius: 3px; background: #1b8278; color: #fff; font: inherit; cursor: pointer; }
.toolbar button:disabled { opacity: .6; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #edf2f0; white-space: nowrap; }
th { background: #f4f8f6; color: #51635f; font-weight: 600; }
td strong { color: #123c39; }
.state { padding: 46px 0; text-align: center; color: #71807e; font-size: 13px; }
.error-panel strong { color: #c4552f; }
.pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; font-size: 12px; color: #71807e; }
.pagination button { margin: 0 4px; padding: 6px 12px; border: 1px solid #d7e2dd; background: #fff; border-radius: 3px; cursor: pointer; }
.pagination button:disabled { opacity: .4; cursor: default; }
.spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid #d7e2dd; border-top-color: #1b8278; border-radius: 50%; margin-right: 8px; vertical-align: -3px; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
