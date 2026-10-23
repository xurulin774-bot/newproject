import { createRouter, createWebHashHistory } from 'vue-router'
import { disposeCharts } from '../api/charts'
import Dashboard from '../views/Dashboard.vue'
import Cities from '../views/Cities.vue'
import Datasets from '../views/Datasets.vue'
import Compare from '../views/Compare.vue'
import Recommend from '../views/Recommend.vue'
import Similar from '../views/Similar.vue'
import Plan from '../views/Plan.vue'
import Advice from '../views/Advice.vue'
import Eda from '../views/Eda.vue'
import Ml from '../views/Ml.vue'
import Quality from '../views/Quality.vue'
import System from '../views/System.vue'
import Login from '../views/Login.vue'

// 侧边导航的分组结构（多级菜单由此驱动渲染）：
// meta.title 用于顶栏面包屑，路由路径即高亮判据（hash 模式下刷新后高亮自然同步）
export const navGroups = [
  {
    label: '数据总览',
    items: [{ path: '/dashboard', icon: '▦', label: '数据仪表盘', title: '数据仪表盘' }],
  },
  {
    label: '数据管理',
    items: [
      { path: '/cities', icon: '⌁', label: '城市数据', title: '城市数据管理' },
      { path: '/datasets', icon: '⇪', label: '天气数据集', title: '天气数据集' },
      { path: '/compare', icon: '⇄', label: '城市对比', title: '城市对比' },
    ],
  },
  {
    label: '智能推荐',
    items: [
      { path: '/recommend', icon: '✦', label: '推荐中心', title: '出行推荐中心' },
      { path: '/similar', icon: '◈', label: '相似城市', title: '相似城市' },
      { path: '/plan', icon: '◔', label: '出行规划', title: '出行规划' },
      { path: '/advice', icon: '☂', label: '出行助手', title: '出行助手' },
    ],
  },
  {
    label: '分析洞察',
    items: [
      { path: '/eda', icon: '◫', label: 'EDA 分析', title: 'EDA 分析图谱' },
      { path: '/ml', icon: '⚗', label: '算法实验', title: '算法实验' },
      { path: '/quality', icon: '✓', label: '数据质量', title: '数据质量检查' },
    ],
  },
  {
    label: '系统管理',
    items: [{ path: '/system', icon: '⚙', label: '系统说明', title: '系统说明' }],
  },
]

const router = createRouter({
  // hash 模式：刷新后 URL 携带路由信息，配合 beforeEach 守卫解决状态丢失与高亮同步
  history: createWebHashHistory(),
  routes: [
    { path: '/login', component: Login, meta: { public: true, title: '登录' } },
    { path: '/', redirect: '/dashboard' },
    { path: '/dashboard', component: Dashboard, meta: { title: '数据仪表盘' } },
    { path: '/cities', component: Cities, meta: { title: '城市数据管理' } },
    { path: '/datasets', component: Datasets, meta: { title: '天气数据集' } },
    { path: '/compare', component: Compare, meta: { title: '城市对比' } },
    { path: '/recommend', component: Recommend, meta: { title: '出行推荐中心' } },
    { path: '/similar', component: Similar, meta: { title: '相似城市' } },
    { path: '/plan', component: Plan, meta: { title: '出行规划' } },
    { path: '/advice', component: Advice, meta: { title: '出行助手' } },
    { path: '/eda', component: Eda, meta: { title: 'EDA 分析图谱' } },
    { path: '/ml', component: Ml, meta: { title: '算法实验' } },
    { path: '/quality', component: Quality, meta: { title: '数据质量检查' } },
    { path: '/system', component: System, meta: { title: '系统说明' } },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
})

// 全局前置守卫：未登录一律重定向到登录页
router.beforeEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · 天气实验室` : '天气实验室'
  if (to.meta.public) return true
  return localStorage.getItem('wx_user') ? true : { path: '/login' }
})

// 路由切换后销毁上一页的 ECharts 实例，避免内存泄漏
router.afterEach(() => disposeCharts())

export default router
