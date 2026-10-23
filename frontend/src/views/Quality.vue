<script setup>
// 数据质量：边界规则检查 + 清洗报告。
import { onMounted, ref } from 'vue'
import http, { errorMessage } from '../api/http'

const summary = ref(null)
const cleaning = ref(null)
const error = ref('')

onMounted(async () => {
  try {
    const [summaryBody, cleaningBody] = await Promise.all([http.get('/api/summary'), http.get('/api/cleaning')])
    summary.value = summaryBody
    cleaning.value = cleaningBody.report
  } catch (e) { error.value = errorMessage(e) }
})
</script>

<template>
  <div>
    <div class="page-head">
      <div><p class="kicker">DATA QUALITY</p><h1>数据质量检查</h1>
        <p class="desc">字段边界规则与共享清洗模块的处理报告，便于更换数据集时复用。</p></div>
    </div>
    <div v-if="error" class="state error">{{ error }}</div>
    <div v-else-if="!summary" class="state"><span class="spinner" />正在加载质量报告...</div>
    <template v-else>
      <section class="card">
        <div class="card-head"><h2>字段边界检查</h2></div>
        <div class="rules">
          <div v-for="(value, label) in summary.quality_rules" :key="label" class="rule">
            <span class="mark" :class="value > 0 ? 'bad' : 'ok'">{{ value > 0 ? '!' : '✓' }}</span>
            <div><strong>{{ label }}</strong><small>{{ value > 0 ? '检测到异常记录，建议复核来源' : '未检测到越界记录' }}</small></div>
            <b :class="value > 0 ? 'warn' : 'ok-text'">{{ value }}</b>
          </div>
        </div>
      </section>
      <div class="grid2" v-if="cleaning">
        <section class="card">
          <div class="card-head"><h2>数据清洗报告</h2><span>仅修正身份字段，不改动气象数值</span></div>
          <div class="profile">
            <div><span>清洗前后行数</span><strong>{{ (cleaning.rows_before ?? 0).toLocaleString() }} → {{ (cleaning.rows_after ?? 0).toLocaleString() }}</strong></div>
            <div><span>剔除位置错乱行</span><strong>{{ cleaning.mismatch_removed }}</strong></div>
            <div><span>剔除垃圾行</span><strong>{{ cleaning.junk_removed }}</strong></div>
            <div><span>国家名拼写归并</span><strong>{{ cleaning.country_rename_count }} 项</strong></div>
            <div><span>城市拼写归并</span><strong>{{ cleaning.label_merge_count }} 组</strong></div>
            <div><span>城市数</span><strong>{{ cleaning.cities_before }} → {{ cleaning.cities_after }}</strong></div>
            <div><span>国家数</span><strong>{{ cleaning.countries_before }} → {{ cleaning.countries_after }}</strong></div>
          </div>
        </section>
        <section class="card">
          <div class="card-head"><h2>数据集概况</h2></div>
          <div class="profile">
            <div><span>原始文件</span><strong>{{ summary.source_file }}</strong></div>
            <div><span>重复行</span><strong>{{ summary.duplicate_rows }}</strong></div>
            <div><span>时间轴</span><strong>last_updated_epoch / UTC</strong></div>
          </div>
          <div class="note"><strong>使用提示</strong>
            <p>当前数据无缺失值、无重复行；检测到的异常边界值应在建模前复核。推荐结果为规则评分，不代表天气预报。</p>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.rules { display: flex; flex-direction: column; }
.rule { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #edf2f0; }
.rule .mark { width: 22px; height: 22px; display: grid; place-items: center; border-radius: 50%; font-size: 12px; }
.rule .mark.ok { background: rgba(27, 130, 120, .12); color: var(--teal); }
.rule .mark.bad { background: #fdf0ec; color: #c4552f; }
.rule strong { display: block; font-size: 12px; color: var(--deep); }
.rule small { font-size: 10px; color: var(--muted); }
.rule b { margin-left: auto; font-size: 13px; }
.warn { color: #dd765b; }
.ok-text { color: var(--teal); }
.profile div { display: flex; justify-content: space-between; gap: 14px; padding: 10px 0; border-bottom: 1px solid #edf2f0; font-size: 12px; }
.profile span { color: var(--muted); font-size: 11px; }
.profile strong { color: var(--deep); font-size: 11px; text-align: right; }
.note { margin-top: 12px; padding: 12px; background: #fff9e8; font-size: 11px; color: #856731; line-height: 1.7; }
.note p { margin: 6px 0 0; }
</style>
