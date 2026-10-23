import * as echarts from 'echarts'

// 图表实例登记表：路由切换时统一销毁，避免内存泄漏。
// 同一容器重复 mountChart 时复用已有实例并 setOption 更新。
const instances = []

export function mountChart(id, option) {
  const el = document.getElementById(id)
  if (!el) return null
  const existing = echarts.getInstanceByDom(el)
  const chart = existing || echarts.init(el)
  chart.setOption(option, true)
  if (!instances.includes(chart)) instances.push(chart)
  return chart
}

export function disposeCharts() {
  while (instances.length) instances.pop().dispose()
}

export function resizeCharts() {
  instances.forEach((chart) => chart.resize())
}

window.addEventListener('resize', resizeCharts)
