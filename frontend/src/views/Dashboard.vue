<script setup>
// 数据仪表盘：并行请求三个接口，ECharts 渲染趋势折线图、状况柱状图与占比饼图。
// 展示加载动画、异常提示与空数据兜底三种页面状态。
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import * as echarts from 'echarts'
import http, { errorMessage } from '../api/http'
import { displayCondition } from '../api/i18n'

const loading = ref(true)
const error = ref('')
const summary = ref({})
const charts = []

function renderCharts(trendItems, conditionItems) {
  const mount = (id) => {
    const el = document.getElementById(id)
    if (!el) return null
    const chart = echarts.init(el)
    charts.push(chart)
    return chart
  }
  const trend = mount('trend-chart')
  if (trend && trendItems.length) {
    const dates = trendItems.map((item) => item.date)
    const mean = trendItems.map((item) => Number(item.temperature_mean))
    const p10 = trendItems.map((item) => Number(item.temperature_p10))
    trend.setOption({
      tooltip: { trigger: 'axis', valueFormatter: (v) => `${Number(v).toFixed(1)} °C` },
      legend: { data: ['平均温度', 'P10-P90 区间'], top: 0, textStyle: { fontSize: 10 } },
      grid: { left: 42, right: 14, top: 30, bottom: 40 },
      xAxis: { type: 'category', data: dates, boundaryGap: false, axisLabel: { fontSize: 10 } },
      yAxis: { type: 'value', scale: true, axisLabel: { fontSize: 10, formatter: '{value}°' } },
      dataZoom: [{ type: 'inside' }],
      series: [
        { name: 'p10-base', type: 'line', data: p10, stack: 'band', lineStyle: { opacity: 0 }, symbol: 'none', silent: true },
        { name: 'P10-P90 区间', type: 'line', data: trendItems.map((item) => Number(item.temperature_p90) - Number(item.temperature_p10)),
          stack: 'band', lineStyle: { opacity: 0 }, symbol: 'none', silent: true,
          areaStyle: { color: 'rgba(75,128,186,.18)' } },
        { name: '平均温度', type: 'line', data: mean, smooth: true, showSymbol: false, z: 3,
          lineStyle: { width: 2.4, color: '#1b8278' }, itemStyle: { color: '#1b8278' } },
      ],
    })
  }
  const bar = mount('condition-chart')
  if (bar && conditionItems.length) {
    const items = [...conditionItems].reverse()
    bar.setOption({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v) => `${Number(v).toFixed(1)}%` },
      grid: { left: 8, right: 42, top: 10, bottom: 10, containLabel: true },
      xAxis: { type: 'value', show: false },
      yAxis: { type: 'category', data: items.map((item) => displayCondition(item.condition)), axisLabel: { fontSize: 10 }, axisTick: { show: false }, axisLine: { show: false } },
      series: [{ type: 'bar', barWidth: 12, data: items.map((item) => item.share),
        itemStyle: { color: '#1b8278', borderRadius: [0, 6, 6, 0] },
        label: { show: true, position: 'right', fontSize: 10, formatter: '{c}%' } }],
    })
  }
  const pie = mount('condition-pie')
  if (pie && conditionItems.length) {
    const palette = ['#1b8278', '#dd765b', '#d5a842', '#4c80ba', '#116057', '#8db6ad']
    pie.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
      legend: { orient: 'vertical', right: 4, top: 'center', textStyle: { fontSize: 10 }, type: 'scroll' },
      series: [{ type: 'pie', radius: ['42%', '68%'], center: ['38%', '50%'],
        data: conditionItems.slice(0, 6).map((item, index) => ({ name: displayCondition(item.condition), value: item.share, itemStyle: { color: palette[index % palette.length] } })),
        label: { show: false } }],
    })
  }
}

function onResize() { charts.forEach((chart) => chart.resize()) }

onMounted(async () => {
  try {
    const [summaryBody, trendBody, conditionBody] = await Promise.all([
      http.get('/api/summary'),
      http.get('/api/trend', { params: { days: 180 } }),
      http.get('/api/conditions', { params: { limit: 8 } }),
    ])
    summary.value = summaryBody
    // 关键：先关掉 loading 让 v-if 渲染出图表容器，再等 nextTick（DOM 更新完成后）才能 init ECharts
    loading.value = false
    await nextTick()
    renderCharts(trendBody.items || [], conditionBody.items || [])
    window.addEventListener('resize', onResize)
  } catch (e) {
    error.value = errorMessage(e)
    loading.value = false
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  charts.forEach((chart) => chart.dispose())
})
</script>

<template>
  <div>
    <div class="page-head">
      <div><p class="kicker">OVERVIEW / DASHBOARD</p><h1>全球天气数据总览</h1>
        <p class="desc">组件化布局 + ECharts 可视化：数据概览、趋势图与占比图。</p></div>
    </div>

    <div v-if="loading" class="state loading"><span class="spinner" />正在加载数据...</div>
    <div v-else-if="error" class="state error-panel"><strong>加载失败</strong><p>{{ error }}</p>
      <button @click="$router.go(0)">重新加载</button></div>
    <template v-else>
      <div class="metrics">
        <div class="metric"><span class="m-icon">▦</span><p>数据记录</p><strong>{{ (summary.records ?? 0).toLocaleString() }}</strong><small>{{ summary.fields ?? '-' }} 个原始字段</small></div>
        <div class="metric"><span class="m-icon">◌</span><p>国家地区</p><strong>{{ summary.countries ?? '-' }}</strong><small>覆盖 {{ summary.locations ?? '-' }} 个城市</small></div>
        <div class="metric warm"><span class="m-icon">°</span><p>平均温度</p><strong>{{ summary.temperature_mean ?? '-' }} °C</strong><small>中位数 {{ summary.temperature_median ?? '-' }} °C</small></div>
        <div class="metric clean"><span class="m-icon">◌</span><p>PM2.5 中位数</p><strong>{{ summary.air_quality_pm25_median ?? '-' }}</strong><small>μg/m³</small></div>
      </div>
      <div class="grid">
        <section class="card"><div class="card-head"><h2>全球平均温度趋势</h2><span>最近 180 天 · 可缩放</span></div><div id="trend-chart" class="chart tall" /></section>
        <section class="card"><div class="card-head"><h2>天气状况分布</h2></div><div id="condition-chart" class="chart" /></section>
        <section class="card"><div class="card-head"><h2>主要状况占比</h2></div><div id="condition-pie" class="chart" /></section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 18px; }
.kicker { margin: 0; color: #1b8278; font-size: 10px; font-weight: 700; letter-spacing: .14em; }
h1 { margin: 6px 0; font-size: 22px; color: #123c39; }
.desc { margin: 0; font-size: 12px; color: #71807e; }
.metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 16px; }
.m-icon { float: right; width: 26px; height: 26px; display: grid; place-items: center; border-radius: 50%; background: #eef4f1; color: var(--teal); font-size: 13px; }
.metric.warm .m-icon { background: #fdf0ec; color: #dd765b; }
.metric { background: #fff; border: 1px solid #e1e9e6; border-radius: 4px; padding: 16px; box-shadow: 0 8px 24px rgba(23,59,53,.05); }
.metric p { margin: 0; font-size: 11px; color: #71807e; }
.metric strong { display: block; margin: 6px 0 2px; font-size: 24px; color: #123c39; }
.metric.warm strong { color: #dd765b; }
.metric.clean strong { color: #1b8278; }
.metric small { font-size: 10px; color: #97a5a2; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.card { background: #fff; border: 1px solid #e1e9e6; border-radius: 4px; padding: 14px; box-shadow: 0 8px 24px rgba(23,59,53,.05); }
.card:first-child { grid-column: 1 / 2; }
.card-head { display: flex; justify-content: space-between; align-items: center; }
.card-head h2 { margin: 0; font-size: 14px; color: #123c39; }
.card-head span { font-size: 10px; color: #97a5a2; }
.chart { height: 230px; }
.chart.tall { height: 260px; }
.state { padding: 60px 0; text-align: center; color: #71807e; font-size: 13px; }
.error-panel strong { color: #c4552f; }
.error-panel button { margin-top: 10px; padding: 8px 16px; border: 0; border-radius: 3px; background: #1b8278; color: #fff; cursor: pointer; }
.spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid #d7e2dd; border-top-color: #1b8278; border-radius: 50%; margin-right: 8px; vertical-align: -3px; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 980px) { .metrics { grid-template-columns: repeat(2, 1fr); } .grid { grid-template-columns: 1fr; } }
</style>
