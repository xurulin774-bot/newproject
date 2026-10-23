<script setup>
// 出行规划：选月份与策略，按历史同期均值评分推荐城市。
import { onMounted, ref } from 'vue'
import http, { errorMessage } from '../api/http'
import { displayCountry, displayCity } from '../api/i18n'

const months = Array.from({ length: 12 }, (_, i) => i + 1)
const modes = [['comfort', '综合舒适'], ['clean_air', '清新空气'], ['warm_sunny', '温暖晴朗'], ['cool_escape', '清凉避暑']]
const month = ref(new Date().getMonth() + 1)
const mode = ref('comfort')
const items = ref([])
const loading = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const body = await http.get('/api/plan', { params: { month: month.value, mode: mode.value, limit: 8 } })
    items.value = body.items || []
  } catch (e) { error.value = errorMessage(e) } finally { loading.value = false }
}
onMounted(load)
</script>

<template>
  <div>
    <div class="page-head">
      <div><p class="kicker">TRAVEL PLANNER</p><h1>出行规划</h1>
        <p class="desc">选择出行月份，用各城市历史同月的均温、湿度、降水与空气质量进行规则评分。</p></div>
    </div>
    <section class="card">
      <div class="segments">
        <button v-for="m in months" :key="m" :class="{ active: month === m }" @click="month = m; load()">{{ m }}月</button>
      </div>
      <div class="segments">
        <button v-for="[value, label] in modes" :key="value" :class="{ active: mode === value }" @click="mode = value; load()">{{ label }}</button>
      </div>
      <div v-if="loading" class="state"><span class="spinner" />正在按历史同期均值评分...</div>
      <div v-else-if="error" class="state error">{{ error }}</div>
      <div v-else class="cards">
        <article v-for="(item, index) in items" :key="item.city_key" class="item">
          <span class="rank">{{ String(index + 1).padStart(2, '0') }}</span>
          <div class="body">
            <strong>{{ displayCity(item.city) }}<small>（{{ displayCountry(item.country) }}）</small></strong>
            <small class="meta">{{ item.temperature }} °C · 湿度 {{ item.humidity }}% · 降水 {{ item.precipitation }} mm · PM2.5 {{ item.pm25 }}</small>
            <p>{{ item.reason }}</p>
          </div>
          <b>{{ item.score }}<em> 分</em></b>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.item { display: flex; gap: 10px; border: 1px solid var(--line); border-radius: 4px; padding: 12px; }
.item .rank { color: var(--teal); font-weight: 700; font-size: 13px; }
.item .body { flex: 1; min-width: 0; }
.item strong { color: var(--deep); font-size: 13px; }
.item strong small { color: #97a5a2; font-weight: 400; }
.item .meta { display: block; margin: 4px 0; font-size: 10px; color: var(--muted); }
.item p { margin: 0; font-size: 11px; color: #51635f; }
.item b { color: var(--teal); white-space: nowrap; }
.item em { font-style: normal; font-size: 10px; }
@media (max-width: 980px) { .cards { grid-template-columns: 1fr; } }
</style>
