<script setup>
// 系统说明：项目模块、技术栈与数据集更换说明（静态页）。
const modules = [
  ['01', '数据仪表盘', '概览指标、趋势折线图、状况柱状图与占比饼图'],
  ['02', '城市数据 / 城市对比', '关键词检索、表格分页、多城雷达与趋势外推'],
  ['03', '智能推荐四页', '推荐中心、相似城市（余弦相似度）、出行规划、出行助手'],
  ['04', 'EDA 与算法实验', 'EDA 图谱、8 算法对比、降水模型在线推理与风险榜'],
  ['05', '数据质量与系统说明', '边界规则检查、清洗报告、部署与数据集更换说明'],
]
</script>

<template>
  <div>
    <div class="page-head">
      <div><p class="kicker">SYSTEM INFORMATION</p><h1>系统说明</h1>
        <p class="desc">前端 Vue 3 + Vite + Vue Router + Axios + ECharts；后端 Spring Boot（8091）。</p></div>
    </div>
    <section class="card">
      <div class="card-head"><h2>功能模块</h2><span>Vue 前端 · 实验五</span></div>
      <div class="modules">
        <div v-for="[no, name, desc] in modules" :key="no" class="module">
          <b>{{ no }}</b>
          <div><strong>{{ name }}</strong><small>{{ desc }}</small></div>
        </div>
      </div>
    </section>
    <section class="card">
      <div class="card-head"><h2>开发与部署</h2></div>
      <div class="code">npm install &amp;&amp; npm run dev    # 开发环境 http://localhost:5173（/api 代理到 8091）</div>
      <div class="code">npm run build               # 生产构建输出 dist/</div>
      <p class="muted">更换数据集：替换后端 data/raw 下的 CSV 并运行 run-eda.cmd 与 ml_train.py，前端无需改动。</p>
    </section>
  </div>
</template>

<style scoped>
.modules { display: flex; flex-direction: column; gap: 10px; }
.module { display: flex; gap: 12px; align-items: flex-start; border-bottom: 1px solid #edf2f0; padding-bottom: 10px; }
.module b { color: var(--teal); font-size: 13px; }
.module strong { display: block; font-size: 13px; color: var(--deep); }
.module small { font-size: 11px; color: var(--muted); }
.code { margin: 6px 0; padding: 9px 12px; background: #f5f5f5; font-family: Consolas, monospace; font-size: 12px; color: #1a1a1a; }
</style>
