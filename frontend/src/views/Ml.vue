<script setup>
// 算法实验：八种算法评估对比 + 实时降水概率预测器 + 全城风险榜。
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import * as echarts from 'echarts'
import http, { errorMessage } from '../api/http'
import { displayCountry, displayCity, displayCondition } from '../api/i18n'
import { mountChart } from '../api/charts'

const metrics = ref(null)
const risk = ref([])
const gauge = ref(null)
const sliders = [
  ['month', '月份', 1, 12, 1], ['temperature', '温度 °C', -15, 45, 1],
  ['humidity', '湿度 %', 0, 100, 1], ['cloud', '云量 %', 0, 100, 1],
  ['pressure', '气压 mb', 970, 1050, 1], ['wind', '风速 kph', 0, 60, 1],
  ['visibility', '能见度 km', 0, 24, 1], ['pm25', 'PM2.5', 0, 150, 1],
]
const inputs = ref({ month: new Date().getMonth() + 1, temperature: 20, humidity: 60, cloud: 50, pressure: 1013, wind: 15, visibility: 12, pm25: 35 })
const probability = ref(null)
const predictModel = ref('')
const timer = ref(null)

async function loadMetrics() {
  const body = await http.get('/api/ml')
  metrics.value = body.metrics
  await nextTick()
  mountChart('ml-compare', {
    tooltip: { trigger: 'axis' },
    legend: { top: 0, textStyle: { fontSize: 10 } },
    grid: { left: 44, right: 14, top: 34, bottom: 28 },
    xAxis: { type: 'category', data: metrics.value.models.map((item) => item.name), axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', max: 1, axisLabel: { fontSize: 10 } },
    series: [
      { name: '准确率', type: 'bar', barWidth: 14, data: metrics.value.models.map((item) => item.accuracy), itemStyle: { color: '#1b8278' } },
      { name: '召回率', type: 'bar', barWidth: 14, data: metrics.value.models.map((item) => item.recall), itemStyle: { color: '#d5a842' } },
      { name: 'F1', type: 'bar', barWidth: 14, data: metrics.value.models.map((item) => item.f1), itemStyle: { color: '#dd765b' } },
    ],
  })
}

async function loadRisk() {
  const body = await http.get('/api/ml/risk_rank', { params: { limit: 8 } })
  risk.value = body.items || []
  predictModel.value = body.model || ''
}

function schedulePredict() {
  clearTimeout(timer.value)
  timer.value = setTimeout(manualPredict, 300)
}

async function manualPredict() {
  try {
    const body = await http.post('/api/ml/predict', inputs.value)
    if (!body.available) return
    probability.value = body.probability
    predictModel.value = body.model
    if (!gauge.value) gauge.value = echarts.getInstanceByDom(document.getElementById('predict-gauge'))
    gauge.value?.setOption({ series: [{ data: [{ value: body.probability, name: '降水概率' }],
      progress: { show: true, width: 14, itemStyle: { color: body.probability >= 50 ? '#dd765b' : '#1b8278' } } }] })
  } catch { /* 滑块连续拖动期间静默失败 */ }
}

onMounted(async () => {
  await nextTick()
  mountChart('predict-gauge', {
    series: [{ type: 'gauge', min: 0, max: 100, startAngle: 200, endAngle: -20, radius: '95%',
      progress: { show: true, width: 14, itemStyle: { color: '#1b8278' } },
      axisLine: { lineStyle: { width: 14, color: [[1, '#e1e9e6']] } },
      axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
      pointer: { show: false }, anchor: { show: false },
      detail: { fontSize: 26, offsetCenter: [0, '8%'], formatter: '{value}%', color: '#123c39' },
      title: { fontSize: 11, offsetCenter: [0, '45%'], color: '#71807e' },
      data: [{ value: 0, name: '降水概率' }] }],
  })
  gauge.value = echarts.getInstanceByDom(document.getElementById('predict-gauge'))
  try {
    await loadMetrics()
    await loadRisk()
    await manualPredict()
  } catch (e) { metrics.value = { models: [], error: errorMessage(e) } }
})
onBeforeUnmount(() => clearTimeout(timer.value))
</script>

<template>
  <div>
    <div class="page-head">
      <div><p class="kicker">MACHINE LEARNING EXPERIMENT</p><h1>算法实验 · 降水预测</h1>
        <p class="desc">实验三：8 种算法训练对比 + 最佳模型在线推理（Java 后端桥接 Python）。</p></div>
    </div>

    <div class="grid2">
      <section class="card"><div class="card-head"><h2>实时降水概率预测器</h2><span v-if="predictModel">模型：{{ predictModel }}</span></div>
        <div id="predict-gauge" style="height: 200px" /></section>
      <section class="card">
        <div class="card-head"><h2>手动参数预测</h2><span>拖动滑块实时调用模型</span></div>
        <div v-for="[key, label, min, max, step] in sliders" :key="key" class="slider">
          <span>{{ label }}</span>
          <input v-model.number="inputs[key]" type="range" :min="min" :max="max" :step="step" @input="schedulePredict" />
          <b>{{ inputs[key] }}</b>
        </div>
      </section>
    </div>

    <section class="card">
      <div class="card-head"><h2>八种算法性能对比</h2><span>测试集 10,000 条（分层抽样）</span></div>
      <div v-if="!metrics" class="state"><span class="spinner" />加载实验结果...</div>
      <div v-else-if="metrics.error" class="state error">{{ metrics.error }}</div>
      <template v-else>
        <div id="ml-compare" class="chart" />
        <div class="table-wrap">
          <table>
            <thead><tr><th>算法</th><th>准确率</th><th>精确率</th><th>召回率</th><th>F1</th><th>AUC</th><th>耗时</th></tr></thead>
            <tbody>
              <tr v-for="item in metrics.models" :key="item.key" :class="{ best: item.name === metrics.best_model }">
                <td><strong>{{ item.name }}</strong></td>
                <td>{{ item.accuracy.toFixed(4) }}</td><td>{{ item.precision.toFixed(4) }}</td>
                <td>{{ item.recall.toFixed(4) }}</td><td>{{ item.f1.toFixed(4) }}</td>
                <td>{{ item.auc.toFixed(4) }}</td><td>{{ item.train_seconds }}s</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="muted">最佳模型按 F1 选取：{{ metrics.best_model }}；完整分析见 data/profile/ML_REPORT.md</p>
      </template>
    </section>

    <section class="card">
      <div class="card-head"><h2>全城降水风险榜</h2><span>模型推理 · 最新观测</span></div>
      <div class="risk">
        <div v-for="(item, index) in risk" :key="item.city_key" class="risk-item">
          <span class="rank">{{ String(index + 1).padStart(2, '0') }}</span>
          <div><strong>{{ displayCity(item.city) }}</strong><small>{{ displayCountry(item.country) }} · {{ displayCondition(item.condition) }} · {{ item.temperature }} °C</small></div>
          <b>{{ item.probability }}%</b>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.slider { display: grid; grid-template-columns: 70px 1fr 42px; align-items: center; gap: 10px; font-size: 11px; color: var(--muted); margin: 9px 0; }
.slider input { width: 100%; accent-color: var(--teal); }
.slider b { color: var(--deep); text-align: right; }
.table-wrap { overflow-x: auto; margin: 10px 0; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th, td { padding: 9px 12px; text-align: left; border-bottom: 1px solid #edf2f0; white-space: nowrap; }
th { background: #f4f8f6; color: #51635f; }
tr.best { background: rgba(27, 130, 120, .08); }
tr.best strong { color: var(--teal); }
.risk { display: flex; flex-direction: column; gap: 8px; }
.risk-item { display: flex; align-items: center; gap: 10px; border: 1px solid var(--line); border-radius: 4px; padding: 9px 12px; }
.risk-item .rank { color: var(--teal); font-weight: 700; font-size: 12px; }
.risk-item strong { display: block; font-size: 13px; color: var(--deep); }
.risk-item small { font-size: 10px; color: #97a5a2; }
.risk-item b { margin-left: auto; color: #dd765b; }
</style>
