<script setup>
// 相似城市：搜索目标城市，基于 37 维气候向量的余弦相似度寻找相似城市。
import { nextTick, onMounted, ref } from 'vue'
import http, { errorMessage } from '../api/http'
import { displayCountry, displayCity } from '../api/i18n'
import { mountChart } from '../api/charts'

const query = ref('')
const suggestions = ref([])
const result = ref(null)
const loading = ref(false)
const error = ref('')
const palette = ['#1b8278', '#dd765b', '#d5a842', '#4c80ba', '#116057', '#8db6ad']

async function search() {
  error.value = ''
  try {
    const body = await http.get('/api/cities', { params: { q: query.value, limit: 8 } })
    suggestions.value = (body.items || []).map((item) => `${item.country} | ${item.city}`)
  } catch (e) { error.value = errorMessage(e) }
}

async function run(key) {
  loading.value = true
  error.value = ''
  try {
    result.value = await http.get('/api/similar', { params: { k: key, limit: 8 } })
    loading.value = false // 先让 v-else 分支渲染出图表容器
    await nextTick()
    const target = result.value.target
    const series = [
      { name: `${displayCity(target.city)}（目标）`, type: 'line', smooth: true, showSymbol: false, data: target.monthly_temp,
        z: 3, lineStyle: { width: 3, color: '#123c39' }, itemStyle: { color: '#123c39' } },
      ...result.value.items.slice(0, 5).map((item, index) => ({
        name: displayCity(item.city), type: 'line', smooth: true, showSymbol: false, data: item.monthly_temp,
        lineStyle: { width: 1.6, color: palette[index] }, itemStyle: { color: palette[index] } })),
    ]
    mountChart('similar-chart', {
      tooltip: { trigger: 'axis', valueFormatter: (v) => `${Number(v).toFixed(1)} °C` },
      legend: { top: 0, textStyle: { fontSize: 9 }, type: 'scroll' },
      grid: { left: 34, right: 12, top: 32, bottom: 22 },
      xAxis: { type: 'category', data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'], axisLabel: { fontSize: 10 } },
      yAxis: { type: 'value', scale: true, axisLabel: { fontSize: 10, formatter: '{value}°' } },
      series,
    })
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(() => run('China | Beijing'))
</script>

<template>
  <div>
    <div class="page-head">
      <div><p class="kicker">SIMILAR CITIES</p><h1>相似城市</h1>
        <p class="desc">逐月气温/湿度/降水曲线 + 年均 PM2.5 共 37 维标准化向量的余弦相似度匹配。</p></div>
    </div>
    <section class="card">
      <div class="toolbar">
        <input v-model.trim="query" placeholder="搜索目标城市，如 Beijing / Paris" @keyup.enter="search" />
        <button class="primary" @click="search">查找城市</button>
      </div>
      <div class="chips">
        <button v-for="key in suggestions" :key="key" class="chip" @click="run(key)">{{ key.split(' | ')[1] }} · {{ key.split(' | ')[0] }}</button>
      </div>
    </section>
    <div v-if="loading" class="state"><span class="spinner" />正在计算气候相似度...</div>
    <div v-else-if="error" class="state error">{{ error }}</div>
    <template v-else-if="result">
      <div class="grid2">
        <section class="card"><div class="card-head"><h2>目标城市 · {{ result.target.city }}</h2></div><div id="similar-chart" class="chart" /></section>
        <section class="card"><div class="card-head"><h2>气候相似城市 Top 8</h2><span>余弦相似度 0-100</span></div>
          <div class="matches">
            <div v-for="(item, index) in result.items" :key="item.city" class="match">
              <span class="rank">{{ String(index + 1).padStart(2, '0') }}</span>
              <div><strong>{{ displayCity(item.city) }}</strong><small>{{ displayCountry(item.country) }} · {{ item.temperature }} °C</small></div>
              <b>{{ item.similarity }} 分</b>
            </div>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.matches { display: flex; flex-direction: column; gap: 8px; }
.match { display: flex; align-items: center; gap: 10px; border: 1px solid var(--line); border-radius: 4px; padding: 9px 12px; }
.match .rank { color: var(--teal); font-weight: 700; font-size: 12px; }
.match strong { display: block; font-size: 13px; color: var(--deep); }
.match small { font-size: 10px; color: #97a5a2; }
.match b { margin-left: auto; color: var(--teal); }
</style>
