const app = document.getElementById("app");

const state = {
  user: null,
  route: window.location.hash.replace("#", "") || "/dashboard",
  summary: null,
  cleaning: null,
  trend: [],
  conditions: [],
  map: [],
  recommend: [],
  cities: [],
  loading: false,
  error: "",
  cityQuery: "",
  cityPage: 1,
  recommendMode: "comfort",
  recommendQuery: "",
  similarQuery: "",
  similarResult: null,
  planMonth: new Date().getMonth() + 1,
  planMode: "comfort",
  planItems: null,
  compareQuery: "",
  compareKeys: [],
  compareData: null,
  forecastData: null,
};

const routes = {
  "/dashboard": { title: "数据仪表盘", section: "数据总览" },
  "/city-data": { title: "城市数据管理", section: "数据管理" },
  "/compare": { title: "城市对比", section: "数据管理" },
  "/recommend": { title: "出行推荐中心", section: "智能推荐" },
  "/similar": { title: "相似城市", section: "智能推荐" },
  "/plan": { title: "出行规划", section: "智能推荐" },
  "/eda": { title: "EDA 分析图谱", section: "分析洞察" },
  "/quality": { title: "数据质量检查", section: "分析洞察" },
  "/system": { title: "系统说明", section: "系统管理" },
};

const navGroups = [
  {
    label: "数据总览",
    items: [{ path: "/dashboard", icon: "▦", label: "数据仪表盘" }],
  },
  {
    label: "数据管理",
    items: [
      { path: "/city-data", icon: "⌁", label: "城市数据" },
      { path: "/compare", icon: "⇄", label: "城市对比" },
    ],
  },
  {
    label: "智能推荐",
    items: [
      { path: "/recommend", icon: "✦", label: "推荐中心" },
      { path: "/similar", icon: "◈", label: "相似城市" },
      { path: "/plan", icon: "◔", label: "出行规划" },
    ],
  },
  {
    label: "分析洞察",
    items: [
      { path: "/eda", icon: "◫", label: "EDA 分析" },
      { path: "/quality", icon: "✓", label: "数据质量" },
    ],
  },
  {
    label: "系统管理",
    items: [{ path: "/system", icon: "⚙", label: "系统说明" }],
  },
];

const edaCharts = [
  ["eda-temporal", "时间覆盖", "每日记录量与活跃城市数"],
  ["eda-trend", "全球温度趋势", "每日温度均值及 10-90 分位区间"],
  ["eda-seasonal", "城市季节画像", "观测记录最多的 8 个城市逐月均温"],
  ["eda-conditions", "天气状况分布", "天气文本条件的频数统计"],
  ["eda-air", "空气质量分析", "PM2.5 与 PM10 关系及 EPA 等级分布"],
  ["eda-corr", "特征相关性", "天气变量皮尔逊相关系数矩阵"],
  ["eda-geo", "全球空间分布", "最新观测的城市温度快照"],
  ["eda-comfort", "环境指标关系", "湿度区间下的能见度与降水"],
  ["eda-quality", "领域质量检查", "异常值边界规则检查结果"],
  ["eda-clusters", "气候分区（KMeans 聚类）", "按逐月气候向量将城市聚为 5 个气候带，图例可开关"],
];

// ---- ECharts 基础设施：实例登记、销毁、世界地图懒加载 ----
const chartPalette = ["#1b8278", "#dd765b", "#d5a842", "#4c80ba", "#116057", "#8db6ad", "#c98a6b", "#6f9d92"];
const charts = [];
let worldMapReady = null;

function ensureWorldMap() {
  if (!worldMapReady) {
    worldMapReady = fetch("/vendor/world.json")
      .then((response) => response.json())
      .then((json) => echarts.registerMap("world", json));
    worldMapReady.catch(() => { worldMapReady = null; });
  }
  return worldMapReady;
}

function disposeCharts() {
  while (charts.length) charts.pop().dispose();
}

function mountChart(id, option) {
  const el = document.getElementById(id);
  if (!el || typeof echarts === "undefined") return;
  const chart = echarts.init(el);
  chart.setOption(option);
  charts.push(chart);
}

window.addEventListener("resize", () => charts.forEach((chart) => chart.resize()));

function tempColor(value) {
  return value < 5 ? "#4c80ba" : value > 28 ? "#dd765b" : "#d5a842";
}

function geoScatterOption(items, symbolSize) {
  return {
    tooltip: {
      trigger: "item",
      textStyle: { fontSize: 11 },
      formatter: (params) => `${displayCity(params.data[3])} · ${displayCountry(params.data[4])}<br/>温度 ${fmt(params.data[2])} °C · PM2.5 ${fmt(params.data[5])}`,
    },
    visualMap: {
      min: -10, max: 38, left: 6, bottom: 4, text: ["热", "冷"], calculable: false,
      inRange: { color: ["#4c80ba", "#d5a842", "#dd765b"] }, textStyle: { fontSize: 10 },
    },
    geo: {
      map: "world", roam: true, scaleLimit: { min: 0.7, max: 10 },
      itemStyle: { areaColor: "#eef4f1", borderColor: "#c9dcd3" },
      emphasis: { label: { show: false } },
    },
    series: [{
      type: "scatter", coordinateSystem: "geo", symbolSize,
      data: items.map((item) => [Number(item.longitude), Number(item.latitude), Number(item.temperature), item.city, item.country, item.pm25]),
    }],
  };
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const countryZh = {
  Afghanistan: "阿富汗", Albania: "阿尔巴尼亚", Algeria: "阿尔及利亚", Andorra: "安道尔",
  Angola: "安哥拉", Argentina: "阿根廷", Armenia: "亚美尼亚", Australia: "澳大利亚",
  Austria: "奥地利", Azerbaijan: "阿塞拜疆", Bahamas: "巴哈马", Bahrain: "巴林",
  Bangladesh: "孟加拉国", Barbados: "巴巴多斯", Belarus: "白俄罗斯", Belgium: "比利时",
  Belize: "伯利兹", Benin: "贝宁", Bhutan: "不丹", Bolivia: "玻利维亚",
  "Bosnia and Herzegovina": "波斯尼亚和黑塞哥维那", Botswana: "博茨瓦纳", Brazil: "巴西",
  Brunei: "文莱", "Brunei Darussalam": "文莱", Bulgaria: "保加利亚", Burkina: "布基纳法索",
  "Burkina Faso": "布基纳法索", Burundi: "布隆迪", Cambodia: "柬埔寨", Cameroon: "喀麦隆",
  Canada: "加拿大", "Cape Verde": "佛得角", Chad: "乍得", Chile: "智利",
  China: "中国", Colombia: "哥伦比亚", Comoros: "科摩罗", Congo: "刚果（布）",
  "Costa Rica": "哥斯达黎加", Croatia: "克罗地亚", Cuba: "古巴", Cyprus: "塞浦路斯",
  "Czech Republic": "捷克", Denmark: "丹麦", Djibouti: "吉布提", Dominica: "多米尼克",
  "Dominican Republic": "多米尼加共和国", Ecuador: "厄瓜多尔", Egypt: "埃及",
  "El Salvador": "萨尔瓦多", Eritrea: "厄立特里亚", Estonia: "爱沙尼亚", Ethiopia: "埃塞俄比亚",
  Fiji: "斐济", "Fiji Islands": "斐济", Finland: "芬兰", France: "法国",
  Gabon: "加蓬", Gambia: "冈比亚", Georgia: "格鲁吉亚", Germany: "德国",
  Ghana: "加纳", Greece: "希腊", Grenada: "格林纳达", Guatemala: "危地马拉",
  Guinea: "几内亚", "Guinea-Bissau": "几内亚比绍", Guyana: "圭亚那", Haiti: "海地",
  Honduras: "洪都拉斯", Hungary: "匈牙利", Iceland: "冰岛", India: "印度",
  Indonesia: "印度尼西亚", Iran: "伊朗", Iraq: "伊拉克", Ireland: "爱尔兰",
  Israel: "以色列", Italy: "意大利", Jamaica: "牙买加", Japan: "日本",
  Jordan: "约旦", Kazakhstan: "哈萨克斯坦", Kenya: "肯尼亚", Kiribati: "基里巴斯",
  Kosovo: "科索沃", Kuwait: "科威特", Kyrghyzstan: "吉尔吉斯斯坦", Kyrgyzstan: "吉尔吉斯斯坦",
  Laos: "老挝", Latvia: "拉脱维亚", Lebanon: "黎巴嫩", Lesotho: "莱索托",
  Liberia: "利比里亚", Libya: "利比亚", Liechtenstein: "列支敦士登", Lithuania: "立陶宛",
  Luxembourg: "卢森堡", Macedonia: "北马其顿", Madagascar: "马达加斯加", Malawi: "马拉维",
  Malaysia: "马来西亚", Maldives: "马尔代夫", Mali: "马里", Malta: "马耳他",
  Mauritania: "毛里塔尼亚", Mauritius: "毛里求斯", Mexico: "墨西哥", Micronesia: "密克罗尼西亚",
  Monaco: "摩纳哥", Mongolia: "蒙古", Montenegro: "黑山", Morocco: "摩洛哥",
  Mozambique: "莫桑比克", Myanmar: "缅甸", Namibia: "纳米比亚", Nepal: "尼泊尔",
  Netherlands: "荷兰", "New Zealand": "新西兰", Nicaragua: "尼加拉瓜", Niger: "尼日尔",
  Nigeria: "尼日利亚", "North Korea": "朝鲜", Norway: "挪威", Oman: "阿曼",
  Pakistan: "巴基斯坦", Palau: "帕劳", Panama: "巴拿马", "Papua New Guinea": "巴布亚新几内亚",
  Paraguay: "巴拉圭", Peru: "秘鲁", Philippines: "菲律宾", Poland: "波兰",
  Portugal: "葡萄牙", Qatar: "卡塔尔", Romania: "罗马尼亚", Russia: "俄罗斯",
  Rwanda: "卢旺达", Samoa: "萨摩亚", "Saudi Arabia": "沙特阿拉伯", Senegal: "塞内加尔",
  Serbia: "塞尔维亚", Seychelles: "塞舌尔", Singapore: "新加坡", Slovakia: "斯洛伐克",
  Slovenia: "斯洛文尼亚", Somalia: "索马里", "South Africa": "南非", "South Korea": "韩国",
  Spain: "西班牙", "Sri Lanka": "斯里兰卡", Sudan: "苏丹", Suriname: "苏里南",
  Sweden: "瑞典", Switzerland: "瑞士", Syria: "叙利亚", Taiwan: "中国台湾",
  Tajikistan: "塔吉克斯坦", Tanzania: "坦桑尼亚", Thailand: "泰国", Togo: "多哥",
  Tonga: "汤加", Tunisia: "突尼斯", Turkey: "土耳其", Turkmenistan: "土库曼斯坦",
  Uganda: "乌干达", Ukraine: "乌克兰", "United Arab Emirates": "阿联酋",
  "United Kingdom": "英国", "United States": "美国", "United States of America": "美国",
  Uruguay: "乌拉圭", Uzbekistan: "乌兹别克斯坦", Vanuatu: "瓦努阿图", Vatican: "梵蒂冈",
  Venezuela: "委内瑞拉", Vietnam: "越南", Yemen: "也门", Zambia: "赞比亚", Zimbabwe: "津巴布韦",
};

const cityZh = {
  Kabul: "喀布尔", Tirana: "地拉那", Algiers: "阿尔及尔", "Andorra La Vella": "安道尔城",
  Luanda: "罗安达", "Saint John's": "圣约翰", "Buenos Aires": "布宜诺斯艾利斯", Yerevan: "埃里温",
  Canberra: "堪培拉", Melbourne: "墨尔本", Vienna: "维也纳", Baku: "巴库", Nassau: "拿骚",
  Manama: "麦纳麦", Dhaka: "达卡", Bridgetown: "布里奇敦", Minsk: "明斯克", Brussels: "布鲁塞尔",
  Belmopan: "贝尔莫潘", "Porto-Novo": "波多诺伏", Thimphu: "廷布", Sucre: "苏克雷",
  Sarajevo: "萨拉热窝", Gaborone: "哈博罗内", Brasilia: "巴西利亚", Bras: "巴西利亚",
  "Sao Paulo": "圣保罗", "Bandar Seri Begawan": "斯里巴加湾市", Sofia: "索非亚", Ouagadougou: "瓦加杜古",
  Bujumbura: "布琼布拉", "Phnom Penh": "金边", Douala: "杜阿拉", Yaounde: "雅温得", Ottawa: "渥太华",
  Praia: "普拉亚", Bangui: "班吉", "N'Djamena": "恩贾梅纳", Santiago: "圣地亚哥", Beijing: "北京",
  "Beijing Shi": "北京", Bogota: "波哥大", Moroni: "莫罗尼", Brazzaville: "布拉柴维尔", Havana: "哈瓦那",
  Nicosia: "尼科西亚", Prague: "布拉格", Kinshasa: "金沙萨", Copenhagen: "哥本哈根", Djibouti: "吉布提市",
  Roseau: "罗索", "Santo Domingo": "圣多明各", Quito: "基多", Cairo: "开罗", "San Salvador": "圣萨尔瓦多",
  Malabo: "马拉博", Asmara: "阿斯马拉", Tallinn: "塔林", "Addis Ababa": "亚的斯亚贝巴", "Addis Abeba": "亚的斯亚贝巴",
  Suva: "苏瓦", Helsinki: "赫尔辛基", Paris: "巴黎", Libreville: "利伯维尔", Banjul: "班珠尔",
  Tbilisi: "第比利斯", Berlin: "柏林", Accra: "阿克拉", Athens: "雅典", "Saint George's": "圣乔治",
  "Guatemala City": "危地马拉城", Conakry: "科纳克里", Bissau: "比绍", Georgetown: "乔治敦",
  "Port-Au-Prince": "太子港", Tegucigalpa: "特古西加尔巴", Budapest: "布达佩斯", Reykjavik: "雷克雅未克",
  "New Delhi": "新德里", Bali: "巴厘岛", Jakarta: "雅加达", Tehran: "德黑兰", Baghdad: "巴格达",
  Dublin: "都柏林", Jerusalem: "耶路撒冷", Rome: "罗马", Kingston: "金斯敦", Tokyo: "东京", Sanaa: "萨那",
  Amman: "安曼", Astana: "阿斯塔纳", Nairobi: "内罗毕", Tarawa: "塔拉瓦", Pristina: "普里什蒂纳",
  Kuwait: "科威特城", "Kuwait City": "科威特城", Bishkek: "比什凯克", Vientiane: "万象", Riga: "里加",
  Beirut: "贝鲁特", Maseru: "马塞卢", Monrovia: "蒙罗维亚", Tripoli: "的黎波里", Vaduz: "瓦杜兹",
  Vilnius: "维尔纽斯", Luxembourg: "卢森堡市", Skopje: "斯科普里", Antananarivo: "塔那那利佛", Lilongwe: "利隆圭",
  "Kuala Lumpur": "吉隆坡", Male: "马累", Bamako: "巴马科", Valletta: "瓦莱塔", Majuro: "马朱罗",
  Nouakchott: "努瓦克肖特", "Port Louis": "路易港", "Mexico City": "墨西哥城", Palikir: "帕利基尔",
  Ulaanbaatar: "乌兰巴托", Podgorica: "波德戈里察", Rabat: "拉巴特", Maputo: "马普托", Yangon: "仰光",
  Windhoek: "温得和克", Kathmandu: "加德满都", Amsterdam: "阿姆斯特丹", Wellington: "惠灵顿", Managua: "马那瓜",
  Niamey: "尼亚美", Abuja: "阿布贾", Pyongyang: "平壤", Oslo: "奥斯陆", Muscat: "马斯喀特",
  Islamabad: "伊斯兰堡", Koror: "科罗尔", "Panama City": "巴拿马城", "Port Moresby": "莫尔兹比港",
  Asuncion: "亚松森", Lima: "利马", Manila: "马尼拉", Warsaw: "华沙", Lisbon: "里斯本", Doha: "多哈",
  Bucharest: "布加勒斯特", Moscow: "莫斯科", Kigali: "基加利", Castries: "卡斯特里", Apia: "阿皮亚",
  Singapore: "新加坡", Bratislava: "布拉迪斯拉发", Ljubljana: "卢布尔雅那", Madrid: "马德里", Colombo: "科伦坡",
  Stockholm: "斯德哥尔摩", Bern: "伯尔尼", Dushanbe: "杜尚别", Bangkok: "曼谷", Lome: "洛美",
  Tunis: "突尼斯", Ashgabat: "阿什哈巴德", Kampala: "坎帕拉", Kyiv: "基辅", "Abu Dhabi": "阿布扎比",
  London: "伦敦", Washington: "华盛顿", Montevideo: "蒙得维的亚", Tashkent: "塔什干", "Port Vila": "维拉港",
  Caracas: "加拉加斯", Hanoi: "河内", Sanaa: "萨那", Lusaka: "卢萨卡", Harare: "哈拉雷",
};

const conditionZh = {
  Clear: "晴朗", Sunny: "晴", Cloudy: "多云", Overcast: "阴天", Mist: "薄雾", Fog: "雾",
  "Partly Cloudy": "局部多云", "Patchy Rain Nearby": "附近有零星降雨", "Light Rain": "小雨",
  "Moderate Rain": "中雨", "Heavy Rain": "大雨", "Light Rain Shower": "小阵雨", "Moderate Rain at Times": "间歇性中雨",
  "Heavy Rain at Times": "间歇性大雨", "Patchy Light Rain": "局部小雨", "Patchy Moderate Rain": "局部中雨",
  "Patchy Heavy Rain": "局部大雨", "Light Drizzle": "小毛毛雨", "Moderate Drizzle": "中等毛毛雨",
  "Patchy Light Drizzle": "局部小毛毛雨", "Freezing Drizzle": "冻毛毛雨", "Thundery Outbreaks Possible": "可能有雷暴",
  Thunderstorm: "雷暴", "Patchy Snow": "局部降雪", "Light Snow": "小雪", "Moderate Snow": "中雪",
  "Heavy Snow": "大雪", Sleet: "雨夹雪", "Ice Pellets": "冰粒", Blizzard: "暴风雪", "Freezing Fog": "冻雾",
};

function displayCountry(value) { return countryZh[String(value ?? "").trim()] || String(value ?? ""); }
function displayCity(value) {
  const raw = String(value ?? "").trim();
  return cityZh[raw] || raw.replace(/\s+Shi$/i, "");
}
function displayCondition(value) { return conditionZh[String(value ?? "").trim()] || String(value ?? ""); }

function fmt(value, digits = 1) {
  if (value === null || value === undefined || value === "" || Number.isNaN(Number(value))) return "-";
  return Number(value).toLocaleString("zh-CN", { maximumFractionDigits: digits });
}

function dateText(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
  return date.toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

async function api(path, options = {}) {
  const response = await fetch(path, { headers: { "Content-Type": "application/json" }, ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || body.error || `请求失败（${response.status}）`);
  return body;
}

function setRoute(path) {
  const next = routes[path] ? path : "/dashboard";
  if (window.location.hash !== `#${next}`) window.location.hash = next;
  state.route = next;
  document.querySelector(".sidebar")?.classList.remove("is-open");
  renderApp();
}

function renderLogin(message = "") {
  app.innerHTML = `
    <main class="login-page">
      <section class="login-intro">
        <div class="intro-top"><span class="logo-mark">WX</span><span>WEATHER ANALYTICS</span></div>
        <div class="intro-content">
          <p class="kicker">GLOBAL CITY WEATHER DATA</p>
          <h1>全球城市天气<br /><em>分析与出行推荐系统</em></h1>
          <p class="intro-copy">用数据观察全球城市的天气状态、空气质量与环境变化，为城市研究和出行决策提供清晰的分析视角。</p>
        </div>
        <div class="intro-foot"><span>DATASET / 166K+ RECORDS</span><span>LOCAL ANALYTICS CONSOLE</span></div>
      </section>
      <section class="login-panel">
        <div class="login-box">
          <p class="kicker">ADMIN CONSOLE</p>
          <h2>欢迎回来</h2>
          <p class="login-subtitle">登录后进入天气数据分析工作台</p>
          <form id="login-form" class="login-form">
            <label>用户名<input id="login-username" name="username" autocomplete="username" placeholder="请输入用户名" required /></label>
            <label>密码<input id="login-password" name="password" type="password" autocomplete="current-password" placeholder="请输入密码" required /></label>
            ${message ? `<p class="form-error">${esc(message)}</p>` : ""}
            <button class="primary-button login-button" type="submit">登录系统 <span>→</span></button>
          </form>
          <div class="demo-account"><span>演示账号</span><strong>admin</strong><span>演示密码</span><strong>123456</strong></div>
          <p class="login-note">本系统为本地部署演示环境，账号仅用于项目功能展示。</p>
        </div>
      </section>
    </main>`;
  document.getElementById("login-form").addEventListener("submit", handleLogin);
  document.getElementById("login-username").focus();
}

async function handleLogin(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const button = event.currentTarget.querySelector("button");
  button.disabled = true;
  button.textContent = "登录中...";
  try {
    const result = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ username: form.get("username"), password: form.get("password") }) });
    state.user = result.user;
    state.error = "";
    setRoute("/dashboard");
  } catch (error) {
    renderLogin(error.message || "用户名或密码错误");
  }
}

function renderApp() {
  disposeCharts();
  const route = routes[state.route] || routes["/dashboard"];
  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="sidebar-brand"><span class="logo-mark">WX</span><div><strong>WeatherLab</strong><small>天气数据分析系统</small></div></div>
        <div class="sidebar-rule"></div>
        <nav>${navGroups.map((group) => `<div class="nav-group"><p>${group.label}</p>${group.items.map((item) => `<a href="#${item.path}" class="nav-item ${state.route === item.path ? "active" : ""}" data-route="${item.path}"><span class="nav-icon">${item.icon}</span><span>${item.label}</span>${state.route === item.path ? '<i class="active-line"></i>' : ""}</a>`).join("")}</div>`).join("")}</nav>
        <div class="sidebar-bottom"><div class="dataset-status"><span class="status-dot"></span><span>数据服务正常</span></div><small>Local workspace / v1.0</small></div>
      </aside>
      <div class="main-shell">
        <header class="topbar"><button class="icon-button menu-button" id="menu-toggle" title="打开菜单">☰</button><div class="breadcrumb"><span>WeatherLab</span><b>/</b><strong>${route.title}</strong></div><div class="top-actions"><span class="top-date">数据快照 · ${new Date().toLocaleDateString("zh-CN")}</span><div class="user-chip"><span class="avatar">A</span><span><strong>${esc(state.user?.display_name || "天气分析管理员")}</strong><small>${esc(state.user?.role || "系统管理员")}</small></span></div><button class="logout-button" id="logout-button">退出登录</button></div></header>
        <main class="page-content"><div id="page-root"></div></main>
      </div>
    </div>`;
  document.querySelectorAll("[data-route]").forEach((link) => link.addEventListener("click", (event) => { event.preventDefault(); setRoute(link.dataset.route); }));
  document.getElementById("menu-toggle").addEventListener("click", () => document.querySelector(".sidebar").classList.toggle("is-open"));
  document.getElementById("logout-button").addEventListener("click", handleLogout);
  renderPage();
}

async function handleLogout() {
  await api("/api/auth/logout", { method: "POST" }).catch(() => {});
  state.user = null;
  renderLogin();
}

function pageHeader(eyebrow, title, desc, action = "") {
  return `<div class="page-header"><div><p class="kicker">${eyebrow}</p><h1>${title}</h1><p class="page-description">${desc}</p></div>${action}</div>`;
}

function metricCard(label, value, note, tone = "") {
  return `<article class="metric-card ${tone}"><span class="metric-icon">${tone === "warm" ? "°" : tone === "clean" ? "◌" : "▦"}</span><p>${label}</p><strong>${value}</strong><small>${note}</small></article>`;
}

async function loadDashboard() {
  state.loading = true;
  try {
    const [summary, trend, conditions, map, recommend] = await Promise.all([
      api("/api/summary"), api("/api/trend?days=180"), api("/api/conditions?limit=8"), api("/api/map"), api("/api/recommend?mode=comfort&limit=5"),
    ]);
    state.summary = summary; state.trend = trend.items || []; state.conditions = conditions.items || []; state.map = map.items || []; state.recommend = recommend.items || [];
    renderDashboard();
  } catch (error) { renderError(error.message); }
  finally { state.loading = false; }
}

function renderDashboard() {
  const s = state.summary || {};
  document.getElementById("page-root").innerHTML = `${pageHeader("OVERVIEW / DASHBOARD", "全球天气数据总览", "从全球城市最新天气快照出发，查看数据规模、趋势、环境状态与出行推荐。", '<button class="secondary-button" id="refresh-dashboard">↻ 刷新数据</button>')}
    <div class="metric-grid">${metricCard("数据记录", fmt(s.records, 0), `${fmt(s.fields, 0)} 个原始字段`)}${metricCard("城市国家", fmt(s.city_country_pairs, 0), `${fmt(s.countries, 0)} 个国家或地区`)}${metricCard("平均温度", `${fmt(s.temperature_mean)} °C`, `中位数 ${fmt(s.temperature_median)} °C`, "warm")}${metricCard("PM2.5 中位数", `${fmt(s.air_quality_pm25_median)} μg/m³`, "空气质量指标", "clean")}</div>
    <div class="dashboard-grid"><section class="content-card trend-card"><div class="card-heading"><div><p class="kicker">TIME SERIES</p><h2>全球平均温度趋势</h2></div><span class="muted">最近 180 天 · 悬停查看</span></div><div id="dash-trend" class="echart-box"></div></section><section class="content-card condition-card"><div class="card-heading"><div><p class="kicker">CONDITIONS</p><h2>天气状况分布</h2></div></div><div id="dash-conditions" class="echart-box"></div></section></div>
    <div class="dashboard-grid second-row"><section class="content-card map-card"><div class="card-heading"><div><p class="kicker">LATEST SNAPSHOT</p><h2>全球城市观测分布</h2></div><span class="muted">${fmt(state.map.length, 0)} 个城市 · 滚轮缩放</span></div><div id="dash-map" class="echart-box"></div></section><section class="content-card"><div class="card-heading"><div><p class="kicker">TRAVEL PICKS</p><h2>舒适度推荐 Top 5</h2></div><a class="text-link" href="#/recommend">查看全部 →</a></div>${recommendCompact(state.recommend)}</section></div>
    <section class="notice-panel"><div><p class="kicker">DATA COVERAGE</p><strong>${dateText(s.time_start)} 至 ${dateText(s.time_end)}</strong><span>统一以 UTC 时间轴整理的全球城市天气观测数据</span></div><div class="notice-stat"><span>重复行</span><strong>${fmt(s.duplicate_rows, 0)}</strong></div><div class="notice-stat"><span>异常规则</span><strong class="${Object.values(s.quality_rules || {}).some((v) => v > 0) ? "warning-text" : "ok-text"}">${Object.values(s.quality_rules || {}).filter((v) => v > 0).length} 项需复核</strong></div></section>`;
  document.getElementById("refresh-dashboard").addEventListener("click", loadDashboard);
  mountDashboardCharts();
}

function mountDashboardCharts() {
  const items = state.trend;
  if (items.length) {
    const dates = items.map((item) => item.date);
    const mean = items.map((item) => Number(item.temperature_mean));
    const p10 = items.map((item) => Number(item.temperature_p10));
    const p90 = items.map((item) => Number(item.temperature_p90));
    mountChart("dash-trend", {
      tooltip: { trigger: "axis", textStyle: { fontSize: 11 }, valueFormatter: (value) => `${fmt(value)} °C` },
      legend: { data: ["平均温度", "波动区间"], top: 0, textStyle: { fontSize: 10 } },
      grid: { left: 40, right: 12, top: 26, bottom: 42 },
      xAxis: { type: "category", data: dates, boundaryGap: false, axisLabel: { fontSize: 10 } },
      yAxis: { type: "value", scale: true, axisLabel: { fontSize: 10, formatter: "{value}°" }, splitLine: { lineStyle: { color: "#e7efec" } } },
      dataZoom: [{ type: "inside" }, { type: "slider", height: 14, bottom: 4, textStyle: { fontSize: 9 } }],
      series: [
        { name: "p10", type: "line", data: p10, stack: "band", lineStyle: { opacity: 0 }, symbol: "none", silent: true },
        { name: "p90", type: "line", data: p90.map((value, index) => value - p10[index]), stack: "band", lineStyle: { opacity: 0 }, symbol: "none", silent: true, areaStyle: { color: "rgba(27,130,120,.14)" } },
        { name: "平均温度", type: "line", data: mean, smooth: true, showSymbol: false, z: 3, lineStyle: { width: 2.5, color: "#1b8278" }, itemStyle: { color: "#1b8278" } },
      ],
    });
  } else {
    document.getElementById("dash-trend").innerHTML = '<div class="empty-state">暂无趋势数据</div>';
  }
  const conditions = state.conditions.slice(0, 8);
  if (conditions.length) {
    const max = Math.max(...conditions.map((item) => item.records));
    mountChart("dash-conditions", {
      tooltip: { trigger: "item", textStyle: { fontSize: 11 }, formatter: (params) => `${displayCondition(params.name)}<br/>${fmt(params.value, 0)} 条 · ${fmt(params.data.share)}%` },
      grid: { left: 6, right: 44, top: 8, bottom: 8, containLabel: true },
      xAxis: { type: "value", show: false },
      yAxis: { type: "category", inverse: true, data: conditions.map((item) => item.condition), axisLabel: { fontSize: 10, color: "#51635f", formatter: (value) => displayCondition(value) }, axisLine: { show: false }, axisTick: { show: false } },
      series: [{
        type: "bar", barWidth: 12, data: conditions.map((item) => ({ value: item.records, share: item.share, itemStyle: { color: "#1b8278", borderRadius: [0, 6, 6, 0], opacity: 0.45 + 0.55 * item.records / max } })),
        label: { show: true, position: "right", fontSize: 10, color: "#51635f", formatter: (params) => `${fmt(params.data.share)}%` },
      }],
    });
  } else {
    document.getElementById("dash-conditions").innerHTML = '<div class="empty-state">暂无状况数据</div>';
  }
  if (state.map.length) {
    ensureWorldMap().then(() => mountChart("dash-map", geoScatterOption(state.map, 7))).catch(() => {
      document.getElementById("dash-map").innerHTML = '<div class="empty-state">世界地图资源加载失败</div>';
    });
  } else {
    document.getElementById("dash-map").innerHTML = '<div class="empty-state">暂无坐标数据</div>';
  }
}

function recommendCompact(items) {
  if (!items.length) return '<div class="empty-state">暂无推荐数据</div>';
  return `<div class="compact-list">${items.map((item, i) => `<div class="compact-item"><span class="compact-rank">${String(i + 1).padStart(2, "0")}</span><div><strong>${esc(displayCity(item.city))}</strong><small>${esc(displayCountry(item.country))} · ${esc(displayCondition(item.condition))}</small></div><b>${fmt(item.score)}<em>分</em></b></div>`).join("")}</div>`;
}

async function loadCities() {
  const result = await api(`/api/cities?q=${encodeURIComponent(state.cityQuery)}&limit=100`);
  state.cities = result.items || []; renderCityData();
}

function cityTable(items) {
  const pageSize = 10, start = (state.cityPage - 1) * pageSize, pageItems = items.slice(start, start + pageSize), totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  if (!pageItems.length) return '<div class="empty-state">没有匹配的城市数据</div>';
  return `<div class="table-wrap"><table><thead><tr><th>国家 / 城市</th><th>当前天气</th><th>温度</th><th>体感</th><th>湿度</th><th>降水</th><th>PM2.5</th><th>能见度</th><th>更新时间</th></tr></thead><tbody>${pageItems.map((item) => `<tr><td><strong>${esc(displayCity(item.city))}</strong><small>${esc(displayCountry(item.country))}</small></td><td><span class="weather-tag">${esc(displayCondition(item.condition))}</span></td><td class="number-cell">${fmt(item.temperature)} °C</td><td class="number-cell">${fmt(item.feels_like)} °C</td><td class="number-cell">${fmt(item.humidity, 0)}%</td><td class="number-cell">${fmt(item.precipitation)} mm</td><td class="number-cell">${fmt(item.pm25)}</td><td class="number-cell">${fmt(item.visibility)} km</td><td class="muted">${dateText(item.updated)}</td></tr>`).join("")}</tbody></table></div><div class="pagination"><span>共 ${fmt(items.length, 0)} 条记录</span><div><button class="page-button" data-page="${state.cityPage - 1}" ${state.cityPage <= 1 ? "disabled" : ""}>上一页</button><b>${state.cityPage} / ${totalPages}</b><button class="page-button" data-page="${state.cityPage + 1}" ${state.cityPage >= totalPages ? "disabled" : ""}>下一页</button></div></div>`;
}

function renderCityData() {
  const root = document.getElementById("page-root");
  root.innerHTML = `${pageHeader("DATA MANAGEMENT", "城市数据管理", "查询全球城市最新天气观测，快速对比温度、空气质量与环境指标。", '<span class="data-badge">最新城市快照</span>')}<section class="content-card table-card"><div class="filter-bar"><label class="search-field"><span>⌕</span><input id="city-search" value="${esc(state.cityQuery)}" placeholder="搜索国家或城市" /></label><button class="primary-button" id="city-search-button">查询数据</button><span class="filter-hint">显示当前数据集中可用城市的最新记录</span></div><div id="city-table">${cityTable(state.cities)}</div></section>`;
  document.getElementById("city-search-button").addEventListener("click", () => { state.cityQuery = document.getElementById("city-search").value.trim(); state.cityPage = 1; loadCities().catch((e) => renderError(e.message)); });
  document.getElementById("city-search").addEventListener("keydown", (event) => { if (event.key === "Enter") document.getElementById("city-search-button").click(); });
  document.querySelectorAll(".page-button").forEach((button) => button.addEventListener("click", () => { state.cityPage = Number(button.dataset.page); renderCityData(); }));
}

async function loadRecommend() {
  try { const result = await api(`/api/recommend?mode=${state.recommendMode}&q=${encodeURIComponent(state.recommendQuery)}&limit=30`); state.recommend = result.items || []; renderRecommend(); translateRecommendData(); } catch (error) { renderError(error.message); }
}

function renderRecommend() {
  const modes = { comfort: "综合舒适", clean_air: "清新空气", warm_sunny: "温暖晴朗", cool_escape: "清凉避暑" };
  document.getElementById("page-root").innerHTML = `${pageHeader("INTELLIGENT RECOMMENDATION", "出行推荐中心", "基于温度、湿度、降水、能见度和空气质量的规则评分，为出行筛选城市。", '<span class="rule-badge">规则评分 · 非天气预报</span>')}<section class="content-card recommend-card"><div class="recommend-toolbar"><div class="segmented-control">${Object.entries(modes).map(([value, label]) => `<button class="segment ${state.recommendMode === value ? "active" : ""}" data-mode="${value}">${label}</button>`).join("")}</div><label class="search-field recommend-search"><span>⌕</span><input id="recommend-search" value="${esc(state.recommendQuery)}" placeholder="按国家或城市筛选" /></label><button class="secondary-button" id="recommend-search-button">筛选</button></div><div class="recommend-grid">${state.recommend.length ? state.recommend.map((item, index) => `<article class="recommend-card-item"><div class="recommend-number">${String(index + 1).padStart(2, "0")}</div><div class="recommend-main"><div class="recommend-title"><div><p>${esc(item.country)}</p><h3>${esc(item.city)}</h3></div><strong>${fmt(item.score)}<small> / 100</small></strong></div><div class="recommend-meta"><span>${esc(item.condition)}</span><span>${fmt(item.temperature)}°C</span><span>PM2.5 ${fmt(item.pm25)}</span></div><p class="recommend-reason">推荐理由：${esc(item.reason)}</p></div></article>`).join("") : '<div class="empty-state">没有匹配的推荐城市</div>'}</div></section>`;
  document.querySelectorAll(".segment").forEach((button) => button.addEventListener("click", () => { state.recommendMode = button.dataset.mode; loadRecommend(); }));
  document.getElementById("recommend-search-button").addEventListener("click", () => { state.recommendQuery = document.getElementById("recommend-search").value.trim(); loadRecommend(); });
  document.getElementById("recommend-search").addEventListener("keydown", (event) => { if (event.key === "Enter") document.getElementById("recommend-search-button").click(); });
}

function translateRecommendData() {
  document.querySelectorAll(".recommend-card-item").forEach((card, index) => {
    const item = state.recommend[index];
    if (!item) return;
    const country = card.querySelector(".recommend-title p");
    const city = card.querySelector(".recommend-title h3");
    const condition = card.querySelector(".recommend-meta span");
    if (country) country.textContent = displayCountry(item.country);
    if (city) city.textContent = displayCity(item.city);
    if (condition) condition.textContent = displayCondition(item.condition);
  });
}

// ---------------- 相似城市（余弦相似度） ----------------

function renderSimilar() {
  document.getElementById("page-root").innerHTML = `${pageHeader("SIMILAR CITIES", "相似城市", "基于逐月气温、湿度、降水曲线与空气质量的标准化向量，用余弦相似度寻找气候最相近的城市。", '<span class="rule-badge">余弦相似度 · 37 维气候向量</span>')}<section class="content-card"><div class="filter-bar"><label class="search-field"><span>⌕</span><input id="similar-search" value="${esc(state.similarQuery)}" placeholder="搜索目标城市，如 Beijing / Paris / 中国" /></label><button class="primary-button" id="similar-search-button">查找城市</button><span class="filter-hint">选择一个目标城市，找出与其气候最相似的其他城市</span></div><div id="similar-suggestions" class="chip-row"></div></section><div id="similar-result"></div>`;
  document.getElementById("similar-search-button").addEventListener("click", searchSimilarCities);
  document.getElementById("similar-search").addEventListener("keydown", (event) => { if (event.key === "Enter") searchSimilarCities(); });
  if (state.similarResult) renderSimilarResult();
}

async function searchSimilarCities() {
  state.similarQuery = document.getElementById("similar-search").value.trim();
  const box = document.getElementById("similar-suggestions");
  if (!box) return;
  box.innerHTML = '<span class="muted">搜索中...</span>';
  try {
    const result = await api(`/api/cities?q=${encodeURIComponent(state.similarQuery)}&limit=10`);
    const items = result.items || [];
    box.innerHTML = items.length
      ? items.map((item) => `<button class="chip" data-key="${esc(`${item.country} | ${item.city}`)}">${esc(displayCity(item.city))} · ${esc(displayCountry(item.country))}</button>`).join("")
      : '<span class="muted">没有匹配的城市</span>';
    box.querySelectorAll(".chip").forEach((chip) => chip.addEventListener("click", () => runSimilar(chip.dataset.key)));
  } catch (error) { box.innerHTML = `<span class="warning-text">${esc(error.message)}</span>`; }
}

async function runSimilar(key) {
  state.similarKey = key;
  const box = document.getElementById("similar-result");
  if (!box) return;
  box.innerHTML = '<div class="loading-state"><span class="spinner"></span>正在计算气候相似度...</div>';
  try {
    state.similarResult = await api(`/api/similar?k=${encodeURIComponent(key)}&limit=8`);
    renderSimilarResult();
  } catch (error) { box.innerHTML = `<div class="error-panel"><strong>计算失败</strong><p>${esc(error.message)}</p></div>`; }
}

function renderSimilarResult() {
  const box = document.getElementById("similar-result");
  if (!box || !state.similarResult) return;
  const result = state.similarResult;
  const target = result.target;
  box.innerHTML = `
    <div class="dashboard-grid"><section class="content-card"><div class="card-heading"><div><p class="kicker">TARGET</p><h2>目标城市 · ${esc(displayCity(target.city))}</h2></div><span class="muted">${esc(displayCountry(target.country))}</span></div><div id="similar-chart" class="echart-box"></div></section>
    <section class="content-card"><div class="card-heading"><div><p class="kicker">MATCHES</p><h2>气候相似城市 Top ${result.items.length}</h2></div><span class="muted">余弦相似度 0-100</span></div><div class="compact-list">${result.items.map((item, index) => `<div class="compact-item"><span class="compact-rank">${String(index + 1).padStart(2, "0")}</span><div><strong>${esc(displayCity(item.city))}</strong><small>${esc(displayCountry(item.country))} · ${fmt(item.temperature)}°C · 湿度 ${fmt(item.humidity, 0)}%</small></div><b>${fmt(item.similarity)}<em>分</em></b></div>`).join("")}</div></section></div>
    <p class="page-description" style="margin-top:14px">折线图为目标城市与相似度前 5 城市的逐月平均气温对比，曲线越接近表示气候节律越一致。</p>`;
  mountSimilarChart();
}

function mountSimilarChart() {
  const result = state.similarResult;
  if (!result || !document.getElementById("similar-chart")) return;
  const series = [
    {
      name: `${displayCity(result.target.city)}（目标）`, type: "line", smooth: true, showSymbol: false,
      data: result.target.monthly_temp, z: 3, lineStyle: { width: 3, color: "#123c39" }, itemStyle: { color: "#123c39" },
    },
    ...result.items.slice(0, 5).map((item, index) => ({
      name: displayCity(item.city), type: "line", smooth: true, showSymbol: false,
      data: item.monthly_temp, lineStyle: { width: 1.6, color: chartPalette[index % chartPalette.length] }, itemStyle: { color: chartPalette[index % chartPalette.length] },
    })),
  ];
  mountChart("similar-chart", {
    tooltip: { trigger: "axis", textStyle: { fontSize: 11 }, valueFormatter: (value) => `${fmt(value)} °C` },
    legend: { top: 0, textStyle: { fontSize: 9 }, type: "scroll" },
    grid: { left: 36, right: 14, top: 32, bottom: 24 },
    xAxis: { type: "category", data: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"], axisLabel: { fontSize: 10 }, axisLine: { lineStyle: { color: "#d7e2dd" } } },
    yAxis: { type: "value", scale: true, axisLabel: { fontSize: 10, formatter: "{value}°" }, splitLine: { lineStyle: { color: "#e7efec" } } },
    series,
  });
}

// ---------------- 出行规划（按月份的历史同期均值评分） ----------------

function renderPlan() {
  const months = Array.from({ length: 12 }, (_, index) => index + 1);
  const modes = { comfort: "综合舒适", clean_air: "清新空气", warm_sunny: "温暖晴朗", cool_escape: "清凉避暑" };
  document.getElementById("page-root").innerHTML = `${pageHeader("TRAVEL PLANNER", "出行规划", "选择出行月份，系统用各城市历史同月的均温、湿度、降水与空气质量进行规则评分，回答“这个月去哪里最舒服”。", '<span class="rule-badge">历史同期均值 · 非天气预报</span>')}<section class="content-card"><div class="recommend-toolbar"><div class="segmented-control">${months.map((month) => `<button class="segment ${state.planMonth === month ? "active" : ""}" data-month="${month}">${month}月</button>`).join("")}</div></div><div class="recommend-toolbar"><div class="segmented-control">${Object.entries(modes).map(([value, label]) => `<button class="segment ${state.planMode === value ? "active" : ""}" data-mode="${value}">${label}</button>`).join("")}</div></div></section><div id="plan-result"></div>`;
  document.querySelectorAll("[data-month]").forEach((button) => button.addEventListener("click", () => { state.planMonth = Number(button.dataset.month); renderPlan(); loadPlan(); }));
  document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => { state.planMode = button.dataset.mode; renderPlan(); loadPlan(); }));
  if (state.planItems) renderPlanResult(); else loadPlan();
}

async function loadPlan() {
  const box = document.getElementById("plan-result");
  if (!box) return;
  box.innerHTML = '<div class="loading-state"><span class="spinner"></span>正在按历史同期均值评分...</div>';
  try {
    const result = await api(`/api/plan?month=${state.planMonth}&mode=${state.planMode}&limit=8`);
    state.planItems = result.items || [];
    renderPlanResult();
  } catch (error) { box.innerHTML = `<div class="error-panel"><strong>加载失败</strong><p>${esc(error.message)}</p></div>`; }
}

function renderPlanResult() {
  const box = document.getElementById("plan-result");
  if (!box) return;
  const items = state.planItems || [];
  box.innerHTML = `<section class="content-card recommend-card"><div class="card-heading"><div><p class="kicker">${state.planMonth}月 · ${ { comfort: "综合舒适", clean_air: "清新空气", warm_sunny: "温暖晴朗", cool_escape: "清凉避暑" }[state.planMode] }</p><h2>推荐出行城市</h2></div><span class="muted">基于 ${dateText(state.summary?.time_start)} 至 ${dateText(state.summary?.time_end)} 的历史同期观测</span></div><div class="recommend-grid">${items.length ? items.map((item, index) => `<article class="recommend-card-item"><div class="recommend-number">${String(index + 1).padStart(2, "0")}</div><div class="recommend-main"><div class="recommend-title"><div><p>${esc(displayCountry(item.country))}</p><h3>${esc(displayCity(item.city))}</h3></div><strong>${fmt(item.score)}<small> / 100</small></strong></div><div class="recommend-meta"><span>均温 ${fmt(item.temperature)}°C</span><span>湿度 ${fmt(item.humidity, 0)}%</span><span>降水 ${fmt(item.precipitation)}mm</span><span>PM2.5 ${fmt(item.pm25)}</span></div><p class="recommend-reason">推荐理由：${esc(item.reason)}</p></div></article>`).join("") : '<div class="empty-state">没有匹配的推荐城市</div>'}</div></section>`;
}

// ---------------- 城市对比（逐月曲线 + 指标雷达 + 趋势外推） ----------------

function renderCompare() {
  document.getElementById("page-root").innerHTML = `${pageHeader("CITY COMPARISON", "城市对比", "选择 1~4 个城市，对比逐月气温曲线、最新观测指标雷达图与温度趋势外推；不选城市时展示全球平均。", '<span class="data-badge">最多 4 城</span>')}<section class="content-card"><div class="filter-bar"><label class="search-field"><span>⌕</span><input id="compare-search" value="${esc(state.compareQuery)}" placeholder="搜索要加入对比的城市" /></label><button class="primary-button" id="compare-search-button">搜索</button><span class="filter-hint">点击候选城市加入对比（${state.compareKeys.length}/4）</span></div><div id="compare-suggestions" class="chip-row"></div><div id="compare-selected" class="chip-row"></div></section><div id="compare-result"></div>`;
  document.getElementById("compare-search-button").addEventListener("click", searchCompareCities);
  document.getElementById("compare-search").addEventListener("keydown", (event) => { if (event.key === "Enter") searchCompareCities(); });
  renderCompareSelected();
  refreshCompare();
}

function renderCompareSelected() {
  const box = document.getElementById("compare-selected");
  if (!box) return;
  box.innerHTML = state.compareKeys.map((key) => `<button class="chip active" data-remove="${esc(key)}">${esc(displayCity(key.split(" | ")[1]))} ✕</button>`).join("");
  box.querySelectorAll("[data-remove]").forEach((chip) => chip.addEventListener("click", () => {
    state.compareKeys = state.compareKeys.filter((key) => key !== chip.dataset.remove);
    renderCompareSelected();
    refreshCompare();
  }));
}

async function searchCompareCities() {
  state.compareQuery = document.getElementById("compare-search").value.trim();
  const box = document.getElementById("compare-suggestions");
  if (!box) return;
  box.innerHTML = '<span class="muted">搜索中...</span>';
  try {
    const result = await api(`/api/cities?q=${encodeURIComponent(state.compareQuery)}&limit=10`);
    const items = (result.items || []).filter((item) => !state.compareKeys.includes(`${item.country} | ${item.city}`));
    box.innerHTML = items.length
      ? items.map((item) => `<button class="chip" data-key="${esc(`${item.country} | ${item.city}`)}">${esc(displayCity(item.city))} · ${esc(displayCountry(item.country))}</button>`).join("")
      : '<span class="muted">没有匹配的城市</span>';
    box.querySelectorAll(".chip").forEach((chip) => chip.addEventListener("click", () => {
      if (state.compareKeys.length >= 4 || state.compareKeys.includes(chip.dataset.key)) return;
      state.compareKeys.push(chip.dataset.key);
      renderCompareSelected();
      refreshCompare();
    }));
  } catch (error) { box.innerHTML = `<span class="warning-text">${esc(error.message)}</span>`; }
}

async function refreshCompare() {
  const container = document.getElementById("compare-result");
  if (!container) return;
  container.innerHTML = '<div class="loading-state"><span class="spinner"></span>正在加载对比数据...</div>';
  try {
    const params = state.compareKeys.map((key) => `k=${encodeURIComponent(key)}`).join("&");
    const [profiles, forecast] = await Promise.all([
      state.compareKeys.length ? api(`/api/compare?${params}`) : api("/api/compare"),
      api(`/api/forecast?${state.compareKeys.length ? `k=${encodeURIComponent(state.compareKeys[0])}&` : ""}days=30`),
    ]);
    state.compareData = profiles.items || [];
    state.forecastData = forecast;
    renderCompareResult();
  } catch (error) { container.innerHTML = `<div class="error-panel"><strong>加载失败</strong><p>${esc(error.message)}</p></div>`; }
}

function renderCompareResult() {
  const container = document.getElementById("compare-result");
  if (!container || !state.forecastData) return;
  const profiles = state.compareData || [];
  const forecast = state.forecastData;
  const metrics = [
    ["温度", "temperature", "°C"], ["体感", "feels_like", "°C"], ["湿度", "humidity", "%"],
    ["降水", "precipitation", "mm"], ["风速", "wind", "kph"], ["能见度", "visibility", "km"],
    ["紫外线", "uv", ""], ["PM2.5", "pm25", ""],
  ];
  container.innerHTML = `
    <div class="dashboard-grid"><section class="content-card"><div class="card-heading"><div><p class="kicker">MONTHLY PROFILE</p><h2>逐月平均气温对比</h2></div></div><div id="compare-months" class="echart-box"></div></section>
    <section class="content-card"><div class="card-heading"><div><p class="kicker">LATEST INDICATORS</p><h2>最新观测指标雷达</h2></div></div><div id="compare-radar" class="echart-box"></div></section></div>
    <section class="content-card" style="margin-top:18px"><div class="card-heading"><div><p class="kicker">TREND EXTRAPOLATION</p><h2>温度趋势外推 · ${esc(forecast.target)}</h2></div><span class="muted">30 日滑动均值 + 线性回归，演示用途非气象预报</span></div><div id="compare-forecast" class="echart-box"></div></section>
    <section class="content-card" style="margin-top:18px"><div class="card-heading"><div><p class="kicker">SUMMARY TABLE</p><h2>关键指标对照</h2></div></div><div class="table-wrap"><table><thead><tr><th>指标</th>${profiles.map((profile) => `<th>${esc(displayCity(profile.city))}<small style="display:block;color:var(--muted);font-weight:400">${esc(displayCountry(profile.country))}</small></th>`).join("") || "<th>全球平均</th>"}</tr></thead><tbody>${metrics.map(([label, field, unit]) => `<tr><td>${label}</td>${profiles.length ? profiles.map((profile) => `<td class="number-cell">${fmt(profile[field])} ${unit}</td>`).join("") : "<td>-</td>"}</tr>`).join("")}</tbody></table></div></section>`;
  mountCompareCharts();
}

function mountCompareCharts() {
  const profiles = state.compareData || [];
  if (profiles.length) {
    mountChart("compare-months", {
      tooltip: { trigger: "axis", textStyle: { fontSize: 11 }, valueFormatter: (value) => `${fmt(value)} °C` },
      legend: { top: 0, textStyle: { fontSize: 10 } },
      grid: { left: 36, right: 14, top: 32, bottom: 24 },
      xAxis: { type: "category", data: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"], axisLabel: { fontSize: 10 }, axisLine: { lineStyle: { color: "#d7e2dd" } } },
      yAxis: { type: "value", scale: true, axisLabel: { fontSize: 10, formatter: "{value}°" }, splitLine: { lineStyle: { color: "#e7efec" } } },
      series: profiles.map((profile, index) => ({
        name: displayCity(profile.city), type: "line", smooth: true, showSymbol: false, data: profile.monthly_temp,
        lineStyle: { width: 2.2, color: chartPalette[index % chartPalette.length] }, itemStyle: { color: chartPalette[index % chartPalette.length] },
      })),
    });
    mountChart("compare-radar", {
      legend: { top: 0, textStyle: { fontSize: 10 } },
      tooltip: { textStyle: { fontSize: 11 } },
      radar: {
        indicator: [
          { name: "温度 °C", max: 45 }, { name: "湿度 %", max: 100 }, { name: "降水 mm", max: 50 },
          { name: "风速 kph", max: 40 }, { name: "能见度 km", max: 20 }, { name: "PM2.5", max: 150 },
        ],
        radius: "58%", axisName: { fontSize: 10, color: "#51635f" },
        splitLine: { lineStyle: { color: "#e1e9e6" } }, splitArea: { show: false },
      },
      series: [{
        type: "radar",
        data: profiles.map((profile, index) => ({
          name: displayCity(profile.city),
          value: [profile.temperature, profile.humidity, profile.precipitation, profile.wind, profile.visibility, profile.pm25],
          lineStyle: { width: 2, color: chartPalette[index % chartPalette.length] },
          itemStyle: { color: chartPalette[index % chartPalette.length] },
          areaStyle: { opacity: 0.12 },
        })),
      }],
    });
  } else {
    const months = document.getElementById("compare-months");
    const radar = document.getElementById("compare-radar");
    if (months) months.innerHTML = '<div class="empty-state">尚未选择对比城市，展示全球平均见下方趋势图</div>';
    if (radar) radar.innerHTML = '<div class="empty-state">选择城市后展示指标雷达图</div>';
  }
  const forecast = state.forecastData;
  if (!forecast || !document.getElementById("compare-forecast")) return;
  const historyLength = forecast.history.length;
  const dates = [...forecast.history.map((item) => item.date), ...forecast.forecast.map((item) => item.date)];
  mountChart("compare-forecast", {
    tooltip: { trigger: "axis", textStyle: { fontSize: 11 }, valueFormatter: (value) => `${fmt(value)} °C` },
    legend: { data: ["30 日滑动均值", "线性外推", "±2σ 区间"], top: 0, textStyle: { fontSize: 10 } },
    grid: { left: 40, right: 14, top: 32, bottom: 42 },
    xAxis: { type: "category", data: dates, boundaryGap: false, axisLabel: { fontSize: 9 } },
    yAxis: { type: "value", scale: true, axisLabel: { fontSize: 10, formatter: "{value}°" }, splitLine: { lineStyle: { color: "#e7efec" } } },
    dataZoom: [{ type: "inside" }, { type: "slider", height: 14, bottom: 4, textStyle: { fontSize: 9 } }],
    series: [
      { name: "下界", type: "line", stack: "band", data: [...Array(historyLength).fill(null), ...forecast.forecast.map((item) => item.lower)], lineStyle: { opacity: 0 }, symbol: "none", silent: true },
      { name: "区间", type: "line", stack: "band", data: [...Array(historyLength).fill(null), ...forecast.forecast.map((item) => item.upper - item.lower)], lineStyle: { opacity: 0 }, symbol: "none", silent: true, areaStyle: { color: "rgba(75,128,186,.16)" } },
      { name: "30 日滑动均值", type: "line", data: forecast.history.map((item) => item.value), showSymbol: false, z: 3, lineStyle: { width: 2, color: "#1b8278" }, itemStyle: { color: "#1b8278" } },
      { name: "线性外推", type: "line", data: [...Array(historyLength).fill(null), ...forecast.forecast.map((item) => item.value)], showSymbol: false, z: 3, lineStyle: { width: 2, color: "#dd765b", type: "dashed" }, itemStyle: { color: "#dd765b" } },
    ],
  });
}

function renderEda(data) {
  document.getElementById("page-root").innerHTML = `${pageHeader("EXPLORATORY DATA ANALYSIS", "EDA 分析图谱", "九组交互图表从时间、空间、天气、空气质量和数据质量多个维度审视数据集。", '<span class="data-badge">ECharts 交互图表</span>')}<section class="eda-grid">${edaCharts.map(([id, title, desc]) => `<figure class="eda-card"><div class="eda-chart" id="${id}"></div><figcaption><strong>${esc(title)}</strong><span>${esc(desc)}</span></figcaption></figure>`).join("")}</section>`;
  mountEdaCharts(data);
}

function mountEdaCharts(data) {
  const axisStyle = { axisLabel: { fontSize: 10 }, axisLine: { lineStyle: { color: "#d7e2dd" } } };

  if (data.temporal?.length) {
    mountChart("eda-temporal", {
      tooltip: { trigger: "axis", textStyle: { fontSize: 11 } },
      legend: { data: ["记录数", "活跃城市"], top: 0, textStyle: { fontSize: 10 } },
      grid: { left: 44, right: 14, top: 30, bottom: 42 },
      xAxis: { type: "category", data: data.temporal.map((item) => item.date), boundaryGap: false, ...axisStyle },
      yAxis: { type: "value", ...axisStyle, splitLine: { lineStyle: { color: "#e7efec" } } },
      dataZoom: [{ type: "inside" }, { type: "slider", height: 14, bottom: 4, textStyle: { fontSize: 9 } }],
      series: [
        { name: "记录数", type: "line", data: data.temporal.map((item) => item.records), showSymbol: false, smooth: true, lineStyle: { width: 2, color: "#1b8278" }, itemStyle: { color: "#1b8278" } },
        { name: "活跃城市", type: "line", data: data.temporal.map((item) => item.locations), showSymbol: false, smooth: true, lineStyle: { width: 2, color: "#dd765b" }, itemStyle: { color: "#dd765b" } },
      ],
    });
  } else { document.getElementById("eda-temporal").innerHTML = '<div class="empty-state">暂无数据</div>'; }

  if (data.temperature_trend?.length) {
    const trend = data.temperature_trend;
    const p10 = trend.map((item) => item.p10);
    mountChart("eda-trend", {
      tooltip: { trigger: "axis", textStyle: { fontSize: 11 }, valueFormatter: (value) => `${fmt(value)} °C` },
      legend: { data: ["温度均值", "10-90 分位区间"], top: 0, textStyle: { fontSize: 10 } },
      grid: { left: 40, right: 14, top: 30, bottom: 42 },
      xAxis: { type: "category", data: trend.map((item) => item.date), boundaryGap: false, ...axisStyle },
      yAxis: { type: "value", scale: true, ...axisStyle, splitLine: { lineStyle: { color: "#e7efec" } } },
      dataZoom: [{ type: "inside" }, { type: "slider", height: 14, bottom: 4, textStyle: { fontSize: 9 } }],
      series: [
        { name: "p10", type: "line", data: p10, stack: "band", lineStyle: { opacity: 0 }, symbol: "none", silent: true },
        { name: "band", type: "line", data: trend.map((item) => item.p90 - item.p10), stack: "band", lineStyle: { opacity: 0 }, symbol: "none", silent: true, areaStyle: { color: "rgba(75,128,186,.18)" } },
        { name: "温度均值", type: "line", data: trend.map((item) => item.mean), smooth: true, showSymbol: false, z: 3, lineStyle: { width: 2, color: "#4c80ba" }, itemStyle: { color: "#4c80ba" } },
      ],
    });
  } else { document.getElementById("eda-trend").innerHTML = '<div class="empty-state">暂无数据</div>'; }

  if (data.seasonal_profiles?.length) {
    mountChart("eda-seasonal", {
      tooltip: { trigger: "axis", textStyle: { fontSize: 11 }, valueFormatter: (value) => `${fmt(value)} °C` },
      legend: { top: 0, textStyle: { fontSize: 9 }, type: "scroll", pageIconSize: 8 },
      grid: { left: 34, right: 12, top: 34, bottom: 24 },
      xAxis: { type: "category", data: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"], ...axisStyle },
      yAxis: { type: "value", ...axisStyle, splitLine: { lineStyle: { color: "#e7efec" } } },
      series: data.seasonal_profiles.map((profile, index) => ({
        name: displayCity(profile.city),
        type: "line", smooth: true, showSymbol: false,
        data: profile.months,
        lineStyle: { width: 1.8, color: chartPalette[index % chartPalette.length] },
        itemStyle: { color: chartPalette[index % chartPalette.length] },
      })),
    });
  } else { document.getElementById("eda-seasonal").innerHTML = '<div class="empty-state">暂无数据</div>'; }

  if (data.conditions?.length) {
    const conditions = [...data.conditions].reverse();
    mountChart("eda-conditions", {
      tooltip: { trigger: "item", textStyle: { fontSize: 11 }, formatter: (params) => `${displayCondition(params.name)}<br/>${fmt(params.value, 0)} 条 · ${fmt(params.data.share)}%` },
      grid: { left: 6, right: 46, top: 8, bottom: 8, containLabel: true },
      xAxis: { type: "value", show: false },
      yAxis: { type: "category", inverse: false, data: conditions.map((item) => item.condition), axisLabel: { fontSize: 10, color: "#51635f", formatter: (value) => displayCondition(value) }, axisLine: { show: false }, axisTick: { show: false } },
      series: [{
        type: "bar", barWidth: 11,
        data: conditions.map((item) => ({ value: item.records, share: item.share, itemStyle: { color: "#1b8278", borderRadius: [0, 6, 6, 0] } })),
        label: { show: true, position: "right", fontSize: 10, color: "#51635f", formatter: (params) => `${fmt(params.data.share)}%` },
      }],
    });
  } else { document.getElementById("eda-conditions").innerHTML = '<div class="empty-state">暂无数据</div>'; }

  if (data.air_quality?.scatter?.length) {
    mountChart("eda-air", {
      tooltip: {
        trigger: "item", textStyle: { fontSize: 11 },
        formatter: (params) => params.data.name ? params.data.name : `PM2.5 ${params.data.value[0]} · PM10 ${params.data.value[1]}`,
      },
      grid: { left: 6, right: 14, top: 22, bottom: 6, containLabel: true },
      xAxis: { type: "value", name: "PM2.5", nameTextStyle: { fontSize: 10 }, ...axisStyle, splitLine: { lineStyle: { color: "#e7efec" } } },
      yAxis: { type: "value", name: "PM10", nameTextStyle: { fontSize: 10 }, ...axisStyle, splitLine: { lineStyle: { color: "#e7efec" } } },
      series: [
        { type: "scatter", symbolSize: 9, itemStyle: { color: "rgba(27,130,120,.45)" }, data: data.air_quality.scatter.map((item) => [item.pm25, item.pm10]) },
      ],
    });
  } else { document.getElementById("eda-air").innerHTML = '<div class="empty-state">暂无数据</div>'; }

  if (data.correlation?.fields?.length) {
    const fields = data.correlation.fields;
    const matrix = data.correlation.matrix;
    const cells = [];
    matrix.forEach((row, i) => row.forEach((value, j) => cells.push([j, i, value])));
    mountChart("eda-corr", {
      tooltip: { position: "top", textStyle: { fontSize: 11 }, formatter: (params) => `${fields[params.data.value[1]]} × ${fields[params.data.value[0]]}<br/>相关系数 ${params.data.value[2]}` },
      grid: { left: 6, right: 8, top: 8, bottom: 6, containLabel: true },
      xAxis: { type: "category", data: fields, splitArea: { show: true }, axisLabel: { fontSize: 9, rotate: 40 }, axisLine: { show: false } },
      yAxis: { type: "category", data: fields, splitArea: { show: true }, axisLabel: { fontSize: 9 }, axisLine: { show: false } },
      visualMap: { min: -1, max: 1, calculable: false, orient: "horizontal", left: "center", bottom: -4, itemHeight: 60, textStyle: { fontSize: 9 }, inRange: { color: ["#4c80ba", "#ffffff", "#dd765b"] } },
      series: [{ type: "heatmap", data: cells, label: { show: true, fontSize: 7, formatter: (params) => params.value[2] } }],
    });
  } else { document.getElementById("eda-corr").innerHTML = '<div class="empty-state">暂无数据</div>'; }

  if (data.geospatial?.length) {
    ensureWorldMap().then(() => mountChart("eda-geo", geoScatterOption(data.geospatial, 6))).catch(() => {
      document.getElementById("eda-geo").innerHTML = '<div class="empty-state">世界地图资源加载失败</div>';
    });
  } else { document.getElementById("eda-geo").innerHTML = '<div class="empty-state">暂无数据</div>'; }

  if (data.comfort?.length) {
    mountChart("eda-comfort", {
      tooltip: { trigger: "axis", textStyle: { fontSize: 11 } },
      legend: { data: ["平均能见度", "平均降水"], top: 0, textStyle: { fontSize: 10 } },
      grid: { left: 40, right: 40, top: 30, bottom: 24 },
      xAxis: { type: "category", data: data.comfort.map((item) => item.bin), ...axisStyle },
      yAxis: [
        { type: "value", name: "km", nameTextStyle: { fontSize: 9 }, ...axisStyle, splitLine: { lineStyle: { color: "#e7efec" } } },
        { type: "value", name: "mm", nameTextStyle: { fontSize: 9 }, ...axisStyle, splitLine: { show: false } },
      ],
      series: [
        { name: "平均能见度", type: "line", smooth: true, data: data.comfort.map((item) => item.visibility), lineStyle: { width: 2, color: "#4c80ba" }, itemStyle: { color: "#4c80ba" } },
        { name: "平均降水", type: "bar", yAxisIndex: 1, barWidth: 12, data: data.comfort.map((item) => item.precipitation), itemStyle: { color: "rgba(213,168,66,.7)", borderRadius: [3, 3, 0, 0] } },
      ],
    });
  } else { document.getElementById("eda-comfort").innerHTML = '<div class="empty-state">暂无数据</div>'; }

  const checks = Object.entries(data.domain_checks || {});
  if (checks.length) {
    mountChart("eda-quality", {
      tooltip: { trigger: "item", textStyle: { fontSize: 11 }, formatter: (params) => `${params.name}<br/>异常记录 ${fmt(params.value, 0)} 条` },
      grid: { left: 6, right: 40, top: 8, bottom: 8, containLabel: true },
      xAxis: { type: "value", show: false },
      yAxis: { type: "category", inverse: true, data: checks.map(([label]) => label), axisLabel: { fontSize: 10, color: "#51635f" }, axisLine: { show: false }, axisTick: { show: false } },
      series: [{
        type: "bar", barWidth: 12,
        data: checks.map(([, value]) => ({ value, itemStyle: { color: value > 0 ? "#dd765b" : "#1b8278", borderRadius: [0, 6, 6, 0] } })),
        label: { show: true, position: "right", fontSize: 10, color: "#51635f" },
      }],
    });
  } else { document.getElementById("eda-quality").innerHTML = '<div class="empty-state">暂无数据</div>'; }

  const clusters = data.clusters;
  if (clusters?.points?.length) {
    ensureWorldMap().then(() => mountChart("eda-clusters", clusterMapOption(clusters))).catch(() => {
      document.getElementById("eda-clusters").innerHTML = '<div class="empty-state">世界地图资源加载失败</div>';
    });
  } else { document.getElementById("eda-clusters").innerHTML = '<div class="empty-state">暂无数据</div>'; }
}

function clusterMapOption(clusters) {
  return {
    tooltip: {
      trigger: "item", textStyle: { fontSize: 11 },
      formatter: (params) => `${displayCity(params.data[2])} · ${displayCountry(params.data[3])}<br/>${params.seriesName}`,
    },
    legend: { type: "scroll", top: 0, textStyle: { fontSize: 9 }, pageIconSize: 8 },
    geo: {
      map: "world", roam: true, scaleLimit: { min: 0.7, max: 10 },
      itemStyle: { areaColor: "#eef4f1", borderColor: "#c9dcd3" },
      emphasis: { label: { show: false } },
    },
    series: clusters.profiles.map((profile, index) => ({
      name: `气候带${profile.cluster}：均温 ${profile.mean_temp}°C · ${profile.count} 城`,
      type: "scatter", coordinateSystem: "geo", symbolSize: 7,
      itemStyle: { color: chartPalette[index % chartPalette.length], opacity: 0.8 },
      data: clusters.points.filter((point) => point.cluster === profile.cluster).map((point) => [point.longitude, point.latitude, point.city, point.country]),
    })),
  };
}

function renderQuality() {
  const s = state.summary || {};
  const c = state.cleaning || {};
  const rules = Object.entries(s.quality_rules || {});
  const qualityBadge = `<span class="quality-badge">${rules.filter(([, value]) => value > 0).length ? "存在待复核项" : "检查通过"}</span>`;
  const cleaningStats = [
    ["清洗前行数", fmt(c.rows_before, 0)],
    ["清洗后行数", fmt(c.rows_after, 0)],
    ["剔除位置错乱行", fmt(c.mismatch_removed, 0)],
    ["剔除垃圾行（人工复核）", fmt(c.junk_removed, 0)],
    ["国家名拼写归并", `${fmt(c.country_rename_count, 0)} 项`],
    ["城市拼写归并", `${fmt(c.label_merge_count, 0)} 组`],
    ["城市数", `${fmt(c.cities_before, 0)} → ${fmt(c.cities_after, 0)}`],
    ["国家数", `${fmt(c.countries_before, 0)} → ${fmt(c.countries_after, 0)}`],
  ];
  const detail = c.detail || {};
  const cleaningCard = `<section class="content-card"><div class="card-heading"><div><p class="kicker">CLEANING REPORT</p><h2>数据清洗报告</h2></div><span class="muted">仅修正身份字段，不改动气象数值</span></div><div class="profile-list">${cleaningStats.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("")}</div><div class="quality-note"><strong>剔除的位置错乱组（同名城市坐标远离主位置）</strong><p>${esc((detail.dropped_mismatch || []).join("；")) || "无"}</p><strong>人工复核确认的垃圾城市</strong><p>${esc((detail.dropped_junk_keys || []).join("；")) || "无"}</p></div></section>`;
  document.getElementById("page-root").innerHTML = `${pageHeader("DATA QUALITY", "数据质量检查", "把模型训练和推荐使用前需要关注的边界规则集中展示，便于后续更换数据集时复用。", qualityBadge)}<div class="quality-grid"><section class="content-card"><div class="card-heading"><div><p class="kicker">VALIDATION RULES</p><h2>字段边界检查</h2></div></div><div class="quality-table">${rules.map(([label, value]) => `<div class="quality-check"><span class="check-icon ${value > 0 ? "issue" : "pass"}">${value > 0 ? "!" : "✓"}</span><div><strong>${esc(label)}</strong><small>${value > 0 ? "检测到异常记录，建议复核来源或清洗规则" : "未检测到越界记录"}</small></div><b class="${value > 0 ? "warning-text" : "ok-text"}">${fmt(value, 0)}</b></div>`).join("")}</div></section><section class="content-card quality-summary"><div class="card-heading"><div><p class="kicker">PROFILE SUMMARY</p><h2>数据集概况</h2></div></div><div class="profile-list"><div><span>原始文件</span><strong>${esc(s.source_file)}</strong></div><div><span>重复行</span><strong>${fmt(s.duplicate_rows, 0)}</strong></div><div><span>缺失值</span><strong class="ok-text">无缺失记录</strong></div><div><span>时间轴</span><strong>last_updated_epoch / UTC</strong></div></div><div class="quality-note"><strong>使用提示</strong><p>当前数据无缺失值、无重复行；检测到的异常边界值应在建模前复核。推荐结果为规则评分，不代表天气预报。</p></div></section></div>${cleaningCard}`;
}

function renderSystem() {
  document.getElementById("page-root").innerHTML = `${pageHeader("SYSTEM INFORMATION", "系统说明", "项目部署、数据替换与算法逻辑说明，方便后续扩展为新的数据分析项目。", '<span class="data-badge">本地部署</span>')}<div class="system-grid"><section class="content-card system-hero"><span class="system-logo">WX</span><div><p class="kicker">PROJECT TITLE</p><h2>全球城市天气数据分析与出行推荐系统</h2><p>面向全球城市天气观测数据的分析型后台，提供数据概览、城市查询、规则推荐、EDA 图谱与质量检查。</p></div></section><section class="content-card"><div class="card-heading"><div><p class="kicker">PROJECT MODULES</p><h2>功能模块</h2></div></div><div class="module-list"><div><b>01</b><span><strong>数据仪表盘</strong><small>规模、趋势、天气状况、全球空间分布</small></span></div><div><b>02</b><span><strong>城市数据管理</strong><small>支持国家或城市关键词查询与分页浏览</small></span></div><div><b>03</b><span><strong>出行推荐中心</strong><small>四种策略的可解释规则评分</small></span></div><div><b>04</b><span><strong>EDA 与质量检查</strong><small>图表资产和数据边界检查集中呈现</small></span></div></div></section><section class="content-card data-replace"><div class="card-heading"><div><p class="kicker">DATA REPLACEMENT</p><h2>更换数据集</h2></div></div><p>将新的 CSV 文件放入 <code>data/raw/</code>，并保持后端必需字段名称；重新运行 EDA 脚本即可生成新的画像与图表。项目不依赖 Downloads 目录中的原始文件。</p><div class="code-line">python algorithm/run_eda.py --data data/raw/GlobalWeatherRepository.csv</div><div class="filter-bar" style="margin-top:14px"><button class="secondary-button" id="reload-data-button">↻ 重新加载数据集</button><span id="reload-data-message" class="muted">替换 data/raw 下的 CSV 后，点击即可热重载，无需重启服务</span></div></section><section class="content-card account-card"><div class="card-heading"><div><p class="kicker">DEMO ACCESS</p><h2>当前登录账号</h2></div></div><div class="account-row"><span class="avatar large">A</span><div><strong>admin</strong><small>系统管理员 / 本地演示账号</small></div><span class="login-state">已登录</span></div></section></div>`;
  const reloadButton = document.getElementById("reload-data-button");
  if (reloadButton) {
    reloadButton.addEventListener("click", async () => {
      const message = document.getElementById("reload-data-message");
      reloadButton.disabled = true;
      if (message) message.textContent = "正在重新读取 CSV 并清洗...";
      try {
        const result = await api("/api/admin/reload", { method: "POST" });
        if (message) message.textContent = result.message || "数据已重载";
        state.summary = null;
      } catch (error) { if (message) message.textContent = `重载失败：${error.message}`; }
      reloadButton.disabled = false;
    });
  }
}

function renderError(message) { document.getElementById("page-root").innerHTML = `<div class="error-panel"><strong>页面加载失败</strong><p>${esc(message)}</p><button class="primary-button" onclick="window.location.reload()">重新加载</button></div>`; }

async function renderPage() {
  const root = document.getElementById("page-root");
  if (!root) return;
  root.innerHTML = '<div class="loading-state"><span class="spinner"></span>正在加载数据...</div>';
  if (state.route === "/dashboard") return loadDashboard();
  if (state.route === "/city-data") { try { await loadCities(); } catch (error) { renderError(error.message); } return; }
  if (state.route === "/recommend") return loadRecommend();
  if (state.route === "/similar") { renderSimilar(); return; }
  if (state.route === "/plan") { renderPlan(); return; }
  if (state.route === "/compare") { renderCompare(); return; }
  if (state.route === "/eda") {
    try {
      const data = await api("/api/eda");
      renderEda(data);
    } catch (error) { renderError(error.message); }
    return;
  }
  if (state.route === "/quality") {
    try {
      const [summary, cleaning] = await Promise.all([
        state.summary ? Promise.resolve(state.summary) : api("/api/summary"),
        api("/api/cleaning"),
      ]);
      state.summary = summary;
      state.cleaning = cleaning.report;
    } catch (error) { return renderError(error.message); }
    return renderQuality();
  }
  return renderSystem();
}

async function boot() {
  window.addEventListener("hashchange", () => { state.route = window.location.hash.replace("#", "") || "/dashboard"; if (state.user) renderApp(); });
  try {
    const result = await api("/api/auth/me");
    if (result.authenticated) { state.user = result.user; renderApp(); return; }
  } catch (_) { /* unauthenticated is the expected initial state */ }
  renderLogin();
}

boot();
