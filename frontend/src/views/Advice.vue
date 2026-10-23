<script setup>
// 出行助手：选择城市 + 模式，调用 /api/advice 渲染综合评分仪表盘与六项生活指数。
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import * as echarts from 'echarts'
import http, { errorMessage } from '../api/http'
import { displayCondition } from '../api/i18n'

const cities = ref([])
const cityKey = ref('China | Beijing')
const month = ref('')
const data = ref(null)
const loading = ref(false)
const error = ref('')
let gauge = null

async function loadCities() {
  try {
    const body = await http.get('/api/cities', { params: { q: '', limit: 60 } })
    cities.value = (body.items || []).map((item) => ({ key: `${item.country} | ${item.city}`, label: `${item.city} · ${item.country}` }))
    if (!cities.value.some((item) => item.key === cityKey.value)) cityKey.value = cities.value[0]?.key || cityKey.value
  } catch { /* 城市列表失败不阻塞，可手动输入 */ }
}

function renderGauge(score, verdict) {
  if (!gauge) {
    const el = document.getElementById('advice-gauge')
    if (!el) return
    gauge = echarts.init(el)
  }
  gauge.setOption({
    series: [{
      type: 'gauge', min: 0, max: 100, startAngle: 200, endAngle: -20, radius: '95%',
      progress: { show: true, width: 14, itemStyle: { color: score >= 60 ? '#1b8278' : '#dd765b' } },
      axisLine: { lineStyle: { width: 14, color: [[1, '#e1e9e6']] } },
      axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
      pointer: { show: false }, anchor: { show: false },
      detail: { valueAnimation: true, fontSize: 28, offsetCenter: [0, '8%'], formatter: '{value} 分', color: '#123c39' },
      title: { fontSize: 11, offsetCenter: [0, '45%'], color: '#71807e' },
      data: [{ value: score, name: verdict }],
    }],
  })
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const params = { k: cityKey.value }
    if (month.value) params.month = month.value
    data.value = await http.get('/api/advice', { params })
    // v-else-if 容器需等待 DOM 更新完成后才能 init ECharts
    await nextTick()
    renderGauge(data.value.score, data.value.verdict)
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}

function onResize() { gauge && gauge.resize() }
onMounted(async () => {
  await loadCities()
  await load()
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  gauge && gauge.dispose()
})
</script>

<template>
  <div>
    <div class="page-head">
      <div><p class="kicker">TRAVEL ASSISTANT</p><h1>出行助手</h1>
        <p class="desc">规则评分 + 降水模型：综合实况/历史同期气候生成六项生活指数（数据驱动，非天气预报）。</p></div>
    </div>
    <section class="card toolbar-card">
      <select v-model="cityKey">
        <option v-for="item in cities" :key="item.key" :value="item.key">{{ item.label }}</option>
      </select>
      <select v-model="month">
        <option value="">当前实况</option>
        <option v-for="m in 12" :key="m" :value="m">{{ m }} 月（历史同期）</option>
      </select>
      <button :disabled="loading" @click="load">{{ loading ? '分析中...' : '生成建议' }}</button>
    </section>

    <div v-if="loading && !data" class="state loading"><span class="spinner" />正在生成出行建议...</div>
    <div v-else-if="error && !data" class="state error-panel"><strong>生成失败</strong><p>{{ error }}</p></div>
    <template v-else-if="data">
      <div class="grid">
        <section class="card">
          <div class="card-head"><h2>综合出行评分</h2><span>{{ data.mode === 'now' ? '当前实况 + 实时模型' : `${data.month} 月历史同期` }}</span></div>
          <div id="advice-gauge" class="gauge" />
        </section>
        <section class="card">
          <div class="card-head"><h2>关键事实</h2></div>
          <div class="facts">
            <span class="chip">温度 {{ data.facts.temperature }} °C</span>
            <span class="chip">湿度 {{ data.facts.humidity }}%</span>
            <span class="chip">降水 {{ data.facts.precipitation }} mm</span>
            <span class="chip">PM2.5 {{ data.facts.pm25 }}</span>
            <span class="chip">降水概率 {{ data.facts.rain_probability }}%</span>
            <span v-if="data.facts.condition" class="chip">实况：{{ displayCondition(data.facts.condition) }}</span>
          </div>
          <p class="summary">{{ data.summary }}</p>
        </section>
      </div>
      <section class="card indices">
        <div class="card-head"><h2>六项生活指数 · {{ data.city }}（{{ data.country }}）</h2></div>
        <div class="index-grid">
          <div v-for="item in data.indices" :key="item.key" class="index">
            <span class="name">{{ item.name }}</span>
            <b :class="`tone-${item.tone}`">{{ item.level }}</b>
            <p>{{ item.text }}</p>
          </div>
        </div>
      </section>
      <p v-if="error" class="refresh-error">{{ error }}（数据仍为上一次结果，可稍后重试）</p>
    </template>
  </div>
</template>

<style scoped>
.page-head { margin-bottom: 16px; }
.kicker { margin: 0; color: #1b8278; font-size: 10px; font-weight: 700; letter-spacing: .14em; }
h1 { margin: 6px 0; font-size: 22px; color: #123c39; }
.desc { margin: 0; font-size: 12px; color: #71807e; }
.card { background: #fff; border: 1px solid #e1e9e6; border-radius: 4px; padding: 14px 16px; box-shadow: 0 8px 24px rgba(23,59,53,.05); margin-bottom: 14px; }
.card-head { display: flex; justify-content: space-between; align-items: center; }
.card-head h2 { margin: 0 0 8px; font-size: 14px; color: #123c39; }
.card-head span { font-size: 10px; color: #97a5a2; }
.toolbar-card { display: flex; gap: 10px; }
select, .toolbar-card button { padding: 10px 14px; border: 1px solid #d7e2dd; border-radius: 3px; font: inherit; font-size: 13px; background: #fff; }
.toolbar-card button { background: #1b8278; color: #fff; border: 0; cursor: pointer; min-width: 110px; }
.toolbar-card button:disabled { opacity: .6; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
.gauge { height: 210px; }
.facts { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.chip { padding: 5px 10px; border: 1px solid #d7e2dd; border-radius: 14px; font-size: 11px; color: #51635f; }
.summary { margin: 0; font-size: 12px; line-height: 1.8; color: #51635f; background: #fff9e8; padding: 10px 12px; border-radius: 3px; }
.index-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.index { border: 1px solid #e1e9e6; border-radius: 4px; padding: 12px; }
.index .name { display: block; font-size: 10px; color: #71807e; letter-spacing: .12em; }
.index b { display: block; margin: 5px 0; font-size: 15px; }
.tone-ok { color: #1b8278; }
.tone-warn { color: #b8891d; }
.tone-issue { color: #c4552f; }
.index p { margin: 0; font-size: 11px; color: #51635f; line-height: 1.6; }
.state { padding: 46px 0; text-align: center; color: #71807e; font-size: 13px; }
.error-panel strong { color: #c4552f; }
.refresh-error { margin: 0 0 14px; font-size: 12px; color: #b8891d; }
.spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid #d7e2dd; border-top-color: #1b8278; border-radius: 50%; margin-right: 8px; vertical-align: -3px; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 980px) { .grid, .index-grid { grid-template-columns: 1fr; } }
</style>
