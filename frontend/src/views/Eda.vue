<script setup>
// EDA 分析图谱：九张 EDA 图 + 气候分区地图页，直接复用后端 figures 静态资产。
const figures = [
  ['01_temporal_coverage.png', '时间覆盖', '每日记录量与活跃城市数'],
  ['02_global_temperature_trend.png', '全球温度趋势', '每日温度均值及分位区间'],
  ['03_seasonal_city_profiles.png', '城市季节画像', '主要城市逐月均温'],
  ['04_weather_conditions.png', '天气状况分布', '状况频数统计'],
  ['05_air_quality.png', '空气质量分析', 'PM2.5 与空气指标'],
  ['06_feature_correlation.png', '特征相关性', '天气变量相关系数'],
  ['07_latest_geospatial_snapshot.png', '全球空间分布', '最新观测城市快照'],
  ['08_humidity_precipitation_visibility.png', '环境指标关系', '湿度、降水与能见度'],
  ['09_domain_quality_checks.png', '领域质量检查', '边界规则检查结果'],
]
</script>

<template>
  <div>
    <div class="page-head">
      <div><p class="kicker">EXPLORATORY DATA ANALYSIS</p><h1>EDA 分析图谱</h1>
        <p class="desc">九张分析图从时间、空间、天气、空气质量与数据质量维度审视数据集（点击放大）。</p></div>
    </div>
    <div class="eda-grid">
      <figure v-for="[file, title, desc] in figures" :key="file" class="eda-card">
        <a :href="`/figures/${file}`" target="_blank"><img :src="`/figures/${file}`" :alt="title" loading="lazy" /></a>
        <figcaption><strong>{{ title }}</strong><span>{{ desc }}</span></figcaption>
      </figure>
    </div>
  </div>
</template>

<style scoped>
.eda-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.eda-card { margin: 0; background: #fff; border: 1px solid var(--line); box-shadow: var(--shadow); }
.eda-card img { display: block; width: 100%; height: 170px; object-fit: contain; background: #fafcfb; }
.eda-card figcaption { padding: 10px 12px; }
.eda-card figcaption strong { display: block; font-size: 12px; color: var(--deep); }
.eda-card figcaption span { font-size: 10px; color: var(--muted); }
@media (max-width: 980px) { .eda-grid { grid-template-columns: 1fr; } }
</style>
