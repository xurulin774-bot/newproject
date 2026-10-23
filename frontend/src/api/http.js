import axios from 'axios'

// 接口封装：统一 baseURL、超时、登录态失效处理与错误信息提取。
// 组件里只调用 request()，不直接操作 axios，便于集中维护。
const http = axios.create({
  baseURL: '',            // 开发环境由 Vite 代理转发，生产环境同源部署
  timeout: 90000,         // 模型推理接口较慢，放宽超时
  withCredentials: true,  // 携带登录会话 Cookie
})

// 响应拦截：后端统一返回 { code, message, ... }，非 2xx 或 code!==200 抛出可读错误
http.interceptors.response.use(
  (response) => {
    const body = response.data
    if (body && typeof body === 'object' && 'code' in body && body.code !== 200) {
      return Promise.reject(new Error(body.message || `请求失败（${body.code}）`))
    }
    return body
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('wx_user')
      window.location.hash = '#/login'
      return Promise.reject(new Error('登录已失效，请重新登录'))
    }
    const message = error.response?.data?.message || error.message || '网络异常'
    return Promise.reject(new Error(message))
  },
)

export function errorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

export default http
