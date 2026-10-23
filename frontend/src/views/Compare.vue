<script setup>
// 城市对比：最多 4 个城市的逐月气温曲线、指标雷达与趋势外推。
import { nextTick, onMounted, ref } from 'vue'
import http, { errorMessage } from '../api/http'
import { mountChart } from '../api/charts'

const palette = ['#1b8278', '#dd765b', '#d5a842', '#4c80ba']
const query = ref('')
const suggestions = ref([])
const keys = ref([])
const profiles = ref([])
const forecast = ref(null)
const loading = ref(false)
const error = ref('')

async function search() {
  try {
    const body = await http.get('/api/cities', { params: { q: query.value, limit: 8 } })
    suggestions.value = (body.items || [])
      .map((item) => `${item.country} | ${item.city}`)
      .filter((key) => !keys.value.includes(key))
  } catch (e) { error.value = errorMessage(e) }
}

function add(key) {
  if (keys.value.length >= 4 || keys.value.includes(key)) return
  keys.value.push(key)
  suggestions.value = []
  refresh()
}

function remove(key) {
  keys.value = keys.value.filter((item) => item !== key)
  refresh()
}

async function refresh() {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams()
    keys.value.forEach((key) => params.append('k', key))
    const request = keys.value.length
      ? http.get('/api/compare', { params })
      : http.get('/api/compare')
    const [compareBody, forecastBody] = await Promise.all([
      request,
      http.get('/api/forecast', { params: keys.value.length ? { k: keys.value[0], days: 30 } : { days: 30 } }),
    ])
    profiles.value = compareBody.items || []
    forecast.value = forecastBody
    loading.value = false // 先让 v-else 分支渲染出图表容器
    await nextTick()
    render()
  } catch (e) { error.value = errorMessage(e) } finally { loading.value = false }
}

function render() {
  if (profiles.value.length) {
    mountChart('compare-months', {
      tooltip: { trigger: 'axis', valueFormatter: (v) => `${Number(v).toFixed(1)} °C` },
      legend: { top: 0, textStyle: { fontSize: 10 } },
      grid: { left: 34, right: 12, top: 30, bottom: 22 },
      xAxis: { type: 'category', data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'], axisLabel: { fontSize: 10 } },
      yAxis: { type: 'value', scale: true, axisLabel: { fontSize: 10, formatter: '{value}°' } },
      series: profiles.value.map((profile, index) => ({
        name: profile.city, type: 'line', smooth: true, showSymbol: false, data: profile.monthly_temp,
        lineStyle: { width: 2.2, color: palette[index] }, itemStyle: { color: palette[index] },
      })),
    })
    mountChart('compare-radar', {
      legend: { top: 0, textStyle: { fontSize: 10 } },
      radar: {
        indicator: [
          { name: '温度 °C', max: 45 }, { name: '湿度 %', max: 100 }, { name: '降水 mm', max: 50 },
          { name: '风速 kph', max: 40 }, { name: '能见度 km', max: 20 }, { name: 'PM2.5', max: 150 },
        ],
        radius: '58%', axisName: { fontSize: 10, color: '#51635f' },
      },
      series: [{ type: 'radar', data: profiles.value.map((profile, index) => ({
        name: profile.city,
        value: [profile.temperature, profile.humidity, profile.precipitation, profile.wind, profile.visibility, profile.pm25],
        lineStyle: { width: 2, color: palette[index] }, itemStyle: { color: palette[index] }, areaStyle: { opacity: .12 },
      })) }],
    })
  }
  const forecastData = forecast.value
  if (!forecastData) return
  const historyLength = forecastData.history.length
  mountChart('compare-forecast', {
    tooltip: { trigger: 'axis', valueFormatter: (v) => (v === null || v === '-' ? '-' : `${Number(v).toFixed(1)} °C`) },
    legend: { data: ['30 日滑动均值', '线性外推', '±2σ 区间'], top: 0, textStyle: { fontSize: 10 } },
    grid: { left: 40, right: 14, top: 30, bottom: 38 },
    xAxis: { type: 'category', data: [...forecastData.history.map((item) => item.date), ...forecastData.forecast.map((item) => item.date)], axisLabel: { fontSize: 9 } },
    yAxis: { type: 'value', scale: true, axisLabel: { fontSize: 10, formatter: '{value}°' } },
    dataZoom: [{ type: 'inside' }],
    series: [
      { name: '下界', type: 'line', stack: 'band', data: [...Array(historyLength).fill(null), ...forecastData.forecast.map((item) => item.lower)], lineStyle: { opacity: 0 }, symbol: 'none', silent: true },
      { name: '区间', type: 'line', stack: 'band', data: [...Array(historyLength).fill(null), ...forecastData.forecast.map((item) => item.upper - item.lower)], lineStyle: { opacity: 0 }, symbol: 'none', silent: true, areaStyle: { color: 'rgba(75,128,186,.16)' } },
      { name: '30 日滑动均值', type: 'line', data: forecastData.history.map((item) => item.value), showSymbol: false, z: 3, lineStyle: { width: 2, color: '#1b8278' }, itemStyle: { color: '#1b8278' } },
      { name: '线性外推', type: 'line', data: [...Array(historyLength).fill(null), ...forecastData.forecast.map((item) => item.value)], showSymbol: false, z: 3, lineStyle: { width: 2, color: '#dd765b', type: 'dashed' }, itemStyle: { color: '#dd765b' } },
    ],
  })
}
onMounted(refresh)
</script>

<template>
  <div>
    <div class="page-head">
      <div><p class="kicker">CITY COMPARISON</p><h1>城市对比</h1>
        <p class="desc">选择 1~4 个城市对比逐月气温、指标雷达与温度趋势外推；不选时展示全球平均。</p></div>
    </div>
    <section class="card">
      <div class="toolbar">
        <input v-model.trim="query" placeholder="搜索要加入对比的城市" @keyup.enter="search" />
        <button class="primary" @click="search">搜索</button>
      </div>
      <div class="chips">
        <button v-for="key in keys" :key="key" class="chip active" @click="remove(key)">{{ key.split(' | ')[1] }} ✕</button>
        <button v-for="key in suggestions" :key="'s-' + key" class="chip" @click="add(key)">{{ key.split(' | ')[1] }} · {{ key.split(' | ')[0] }}</button>
      </div>
    </section>
    <div v-if="loading" class="state"><span class="spinner" />正在加载对比数据...</div>
    <div v-else-if="error" class="state error">{{ error }}</div>
    <template v-else>
      <div class="grid2">
        <section class="card"><div class="card-head"><h2>逐月平均气温对比</h2></div>
          <div v-if="profiles.length" id="compare-months" class="chart" />
          <div v-else class="state">尚未选择对比城市</div></section>
        <section class="card"><div class="card-head"><h2>最新观测指标雷达</h2></div>
          <div v-if="profiles.length" id="compare-radar" class="chart" />
          <div v-else class="state">选择城市后展示</div></section>
      </div>
      <section class="card"><div class="card-head"><h2>温度趋势外推 · {{ forecast?.target }}</h2><span>30 日滑动均值 + 线性回归，演示用途</span></div>
        <div id="compare-forecast" class="chart" /></section>
    </template>
  </div>
</template>

<style scoped>
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
</style>
