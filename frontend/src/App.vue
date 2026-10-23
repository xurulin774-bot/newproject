<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { navGroups } from './router'

const route = useRoute()
const router = useRouter()

const isLogin = computed(() => route.meta.public === true)
const currentTitle = computed(() => route.meta.title || '')
const user = computed(() => {
  try { return JSON.parse(localStorage.getItem('wx_user') || 'null') } catch { return null }
})

function isActive(path) {
  return route.path === path
}
function logout() {
  localStorage.removeItem('wx_user')
  router.push('/login')
}
</script>

<template>
  <router-view v-if="isLogin" />
  <div v-else class="app-shell">
    <aside class="sidebar">
      <div class="brand"><span class="logo">WX</span><div><strong>天气实验室</strong><small>Vue 前端 · 实验五</small></div></div>
      <nav>
        <div v-for="group in navGroups" :key="group.label" class="nav-group">
          <p>{{ group.label }}</p>
          <router-link
            v-for="item in group.items"
            :key="item.path"
            :to="item.path"
            class="nav-item"
            :class="{ active: isActive(item.path) }"
          >
            <span class="icon">{{ item.icon }}</span><span>{{ item.label }}</span>
            <i v-if="isActive(item.path)" class="active-line" />
          </router-link>
        </div>
      </nav>
      <div class="sidebar-bottom"><span class="dot" /> 数据服务正常</div>
    </aside>
    <div class="main-shell">
      <header class="topbar">
        <div class="crumb"><span>天气实验室</span><b>/</b><strong>{{ currentTitle }}</strong></div>
        <div class="actions">
          <span class="user-chip"><span class="avatar">{{ (user?.displayName || user?.username || 'A').slice(0, 1) }}</span>
            <span><strong>{{ user?.displayName || user?.username || 'admin' }}</strong><small>{{ user?.role || 'USER' }}</small></span></span>
          <button class="ghost" @click="logout">退出登录</button>
        </div>
      </header>
      <main class="page"><router-view /></main>
    </div>
  </div>
</template>

<style scoped>
.app-shell { display: flex; min-height: 100vh; }
.sidebar { width: 220px; flex: 0 0 auto; display: flex; flex-direction: column; background: #123c39; color: #e8f0ee; padding: 18px 14px; }
.brand { display: flex; gap: 10px; align-items: center; padding: 4px 6px 16px; border-bottom: 1px solid rgba(255,255,255,.12); }
.logo { width: 38px; height: 38px; display: grid; place-items: center; border: 1px solid rgba(245,204,113,.6); color: #f5cc71; font-weight: 800; font-size: 12px; }
.brand strong { display: block; font-size: 14px; }
.brand small { color: rgba(232,240,238,.55); font-size: 10px; }
nav { flex: 1; padding-top: 14px; }
.nav-group + .nav-group { margin-top: 18px; }
.nav-group > p { margin: 0 0 8px; font-size: 10px; letter-spacing: .14em; color: rgba(232,240,238,.45); }
.nav-item { position: relative; display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 4px; color: rgba(232,240,238,.78); font-size: 13px; text-decoration: none; margin-bottom: 4px; }
.nav-item:hover { background: rgba(255,255,255,.07); color: #fff; }
.nav-item.active { background: rgba(27,130,120,.55); color: #fff; }
.nav-item .icon { width: 16px; text-align: center; }
.nav-item .active-line { position: absolute; right: 8px; width: 4px; height: 16px; border-radius: 2px; background: #f5cc71; }
.sidebar-bottom { font-size: 11px; color: rgba(232,240,238,.55); padding: 10px 6px 0; border-top: 1px solid rgba(255,255,255,.12); }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #35b8a2; margin-right: 6px; }
.main-shell { flex: 1; min-width: 0; display: flex; flex-direction: column; background: #f5f7f6; }
.topbar { display: flex; justify-content: space-between; align-items: center; padding: 14px 24px; background: #fff; border-bottom: 1px solid #e1e9e6; }
.crumb { font-size: 14px; color: #71807e; }
.crumb b { margin: 0 8px; font-weight: 400; }
.crumb strong { color: #182928; }
.actions { display: flex; align-items: center; gap: 14px; }
.user-chip { display: flex; align-items: center; gap: 8px; }
.user-chip strong { display: block; font-size: 12px; color: #182928; }
.user-chip small { font-size: 10px; color: #71807e; }
.avatar { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 50%; background: #1b8278; color: #fff; font-size: 13px; }
.ghost { border: 1px solid #d7e2dd; background: #fff; border-radius: 3px; padding: 7px 12px; font-size: 12px; color: #51635f; cursor: pointer; }
.ghost:hover { border-color: #1b8278; color: #1b8278; }
.page { flex: 1; padding: 22px 24px; }
@media (max-width: 860px) {
  .app-shell { flex-direction: column; }
  .sidebar { width: 100%; flex-direction: row; flex-wrap: wrap; align-items: center; }
  nav { display: flex; gap: 4px; padding-top: 0; }
  .nav-group { display: flex; align-items: center; gap: 4px; margin: 0 !important; }
  .nav-group > p { display: none; }
  .sidebar-bottom { display: none; }
}
</style>
