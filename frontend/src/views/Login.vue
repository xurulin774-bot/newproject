<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import http, { errorMessage } from '../api/http'

const router = useRouter()
const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  if (!username.value || !password.value) {
    error.value = '请输入用户名和密码'
    return
  }
  loading.value = true
  try {
    const result = await http.post('/api/auth/login', { username: username.value, password: password.value })
    localStorage.setItem('wx_user', JSON.stringify(result.user || { username: username.value }))
    router.push('/dashboard')
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <section class="intro">
      <div class="intro-top"><span class="logo">WX</span><span>WEATHER LAB · VUE</span></div>
      <h1>全球城市天气<br /><em>分析与出行推荐系统</em></h1>
      <p class="copy">Vue 3 + Vite + ECharts 前端实验：组件化开发、路由导航与数据可视化。</p>
      <div class="intro-foot"><span>SPRING BOOT BACKEND · 8091</span><span>AXIOS / VUE ROUTER</span></div>
    </section>
    <section class="panel">
      <form class="box" @submit.prevent="submit">
        <p class="kicker">ADMIN CONSOLE</p>
        <h2>欢迎回来</h2>
        <label>用户名<input v-model.trim="username" autocomplete="username" placeholder="请输入用户名" /></label>
        <label>密码<input v-model.trim="password" type="password" autocomplete="current-password" placeholder="请输入密码" /></label>
        <p v-if="error" class="error">{{ error }}</p>
        <button :disabled="loading" type="submit">{{ loading ? '登录中...' : '登录系统 →' }}</button>
        <div class="demo"><span>演示账号</span><strong>admin</strong><span>密码</span><strong>123456</strong></div>
      </form>
    </section>
  </main>
</template>

<style scoped>
.login-page { display: grid; grid-template-columns: 1.15fr 1fr; min-height: 100vh; }
.intro { background: #123c39; color: #e8f0ee; padding: 48px 56px; display: flex; flex-direction: column; }
.intro-top { display: flex; gap: 10px; align-items: center; font-size: 12px; letter-spacing: .2em; color: rgba(232,240,238,.6); }
.logo { width: 38px; height: 38px; display: grid; place-items: center; border: 1px solid rgba(245,204,113,.6); color: #f5cc71; font-weight: 800; }
h1 { margin: auto 0 12px; font-size: 44px; line-height: 1.25; }
h1 em { color: #f5cc71; font-style: normal; }
.copy { max-width: 420px; color: rgba(232,240,238,.72); line-height: 1.8; }
.intro-foot { display: flex; justify-content: space-between; font-size: 11px; letter-spacing: .12em; color: rgba(232,240,238,.4); }
.panel { display: grid; place-items: center; background: #f5f7f6; }
.box { width: min(360px, 86%); background: #fff; border: 1px solid #e1e9e6; box-shadow: 0 12px 35px rgba(23,59,53,.08); padding: 30px 28px; }
.kicker { margin: 0 0 6px; color: #1b8278; font-size: 10px; font-weight: 700; letter-spacing: .16em; }
h2 { margin: 0 0 18px; font-size: 20px; color: #123c39; }
label { display: block; font-size: 12px; color: #51635f; margin-bottom: 14px; }
input { display: block; width: 100%; margin-top: 6px; padding: 10px 12px; border: 1px solid #d7e2dd; border-radius: 3px; font: inherit; box-sizing: border-box; }
input:focus { outline: none; border-color: #1b8278; }
.error { margin: 0 0 12px; padding: 8px 10px; background: #fdf0ec; color: #c4552f; font-size: 12px; border-radius: 3px; }
button { width: 100%; padding: 11px; border: 0; border-radius: 3px; background: #1b8278; color: #fff; font: inherit; cursor: pointer; }
button:disabled { opacity: .6; cursor: default; }
.demo { margin-top: 16px; display: flex; gap: 8px; justify-content: center; font-size: 11px; color: #71807e; align-items: center; }
.demo strong { color: #123c39; }
@media (max-width: 860px) { .login-page { grid-template-columns: 1fr; } .intro { display: none; } }
</style>
