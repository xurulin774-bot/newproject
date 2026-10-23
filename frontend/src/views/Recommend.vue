<script setup>
// 推荐中心：四种策略切换，调用 /api/recommend 渲染推荐卡片。
import { nextTick, onMounted, ref } from 'vue'
import http, { errorMessage } from '../api/http'
import { displayCountry, displayCity, displayCondition } from '../api/i18n'
import { mountChart, disposeCharts } from '../api/charts'

const modes = [
  ['comfort', '综合舒适'], ['clean_air', '清新空气'], ['warm_sunny', '温暖晴朗'], ['cool_escape', '清凉避暑'],
]
const mode = ref('comfort')
const items = ref([])
const loading = ref(false)
const error = ref('')


async function load() {
  loading.value = true
  error.value = ''
  try {
    const body = await http.get('/api/recommend', { params: { mode: mode.value, limit: 12 } })
    items.value = body.items || []
    loading.value = false // 先让 v-else 分支渲染出图表容器
    await nextTick()
    const chart = mountChart('rec-chart', {
      tooltip: { trigger: 'axis', textStyle: { fontSize: 11 } },
      grid: { left: 44, right: 16, top: 10, bottom: 24 },
      xAxis: { type: 'value', max: 100, show: false },
      yAxis: { type: 'category', inverse: true, data: items.value.map((item) => displayCity(item.city)),
        axisLabel: { fontSize: 10 }, axisTick: { show: false }, axisLine: { show: false } },
      series: [{ type: 'bar', barWidth: 12, data: items.value.map((item) => item.score),
        itemStyle: { color: '#1b8278', borderRadius: [0, 6, 6, 0] },
        label: { show: true, position: 'right', fontSize: 10, formatter: '{c} 分' } }],
    })
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
      <div><p class="kicker">INTELLIGENT RECOMMENDATION</p><h1>出行推荐中心</h1>
        <p class="desc">基于温度、湿度、降水、能见度与空气质量的规则评分（数据驱动，非天气预报）。</p></div>
    </div>
    <section class="card">
      <div class="segments">
        <button v-for="[value, label] in modes" :key="value" :class="{ active: mode === value }" @click="mode = value; load()">{{ label }}</button>
      </div>
      <div v-if="loading" class="state"><span class="spinner" />评分计算中...</div>
      <div v-else-if="error" class="state error">{{ error }}</div>
      <template v-else>
        <div id="rec-chart" class="chart" />
        <div class="cards">
          <article v-for="(item, index) in items" :key="item.city" class="item">
            <span class="rank">{{ String(index + 1).padStart(2, '0') }}</span>
            <div><strong>{{ displayCity(item.city) }}</strong><small>{{ displayCountry(item.country) }} · {{ displayCondition(item.condition) }}</small></div>
            <b>{{ item.score }}<em> 分</em></b>
          </article>
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
.segments { display: flex; gap: 0; margin-bottom: 14px; }
.segments button { padding: 9px 18px; border: 1px solid #d7e2dd; background: #fff; font-size: 12px; cursor: pointer; }
.segments button:first-child { border-radius: 3px 0 0 3px; }
.segments button:last-child { border-radius: 0 3px 3px 0; }
.segments button + button { margin-left: -1px; }
.segments button.active { background: #1b8278; border-color: #1b8278; color: #fff; }
.chart { height: 240px; }
.cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 14px; }
.item { display: flex; align-items: center; gap: 10px; border: 1px solid #e1e9e6; border-radius: 4px; padding: 10px 12px; }
.item .rank { color: #1b8278; font-weight: 700; font-size: 12px; }
.item strong { display: block; font-size: 13px; color: #123c39; }
.item small { font-size: 10px; color: #97a5a2; }
.item b { margin-left: auto; color: #1b8278; }
.item em { font-style: normal; font-size: 10px; }
.state { padding: 40px 0; text-align: center; color: #71807e; font-size: 13px; }
.error { color: #c4552f; }
.spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid #d7e2dd; border-top-color: #1b8278; border-radius: 50%; margin-right: 8px; vertical-align: -3px; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 980px) { .cards { grid-template-columns: 1fr; } }
</style>
