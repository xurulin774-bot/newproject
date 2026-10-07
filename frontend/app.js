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
};

const routes = {
  "/dashboard": { title: "数据仪表盘", section: "数据总览" },
  "/city-data": { title: "城市数据管理", section: "数据管理" },
  "/recommend": { title: "出行推荐中心", section: "智能推荐" },
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
    items: [{ path: "/city-data", icon: "⌁", label: "城市数据" }],
  },
  {
    label: "智能推荐",
    items: [{ path: "/recommend", icon: "✦", label: "推荐中心" }],
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

const edaFigures = [
  ["01_temporal_coverage.png", "时间覆盖", "数据更新日期与记录规模"],
  ["02_global_temperature_trend.png", "全球温度趋势", "每日温度均值及分位区间"],
  ["03_seasonal_city_profiles.png", "城市季节画像", "不同城市的季节温度差异"],
  ["04_weather_conditions.png", "天气状况分布", "天气文本条件的频数统计"],
  ["05_air_quality.png", "空气质量分析", "PM2.5 与主要空气指标"],
  ["06_feature_correlation.png", "特征相关性", "天气变量之间的相关关系"],
  ["07_latest_geospatial_snapshot.png", "全球空间分布", "最新观测的城市坐标快照"],
  ["08_humidity_precipitation_visibility.png", "环境指标关系", "湿度、降水与能见度"],
  ["09_domain_quality_checks.png", "领域质量检查", "异常值规则检查结果"],
];

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
    <div class="dashboard-grid"><section class="content-card trend-card"><div class="card-heading"><div><p class="kicker">TIME SERIES</p><h2>全球平均温度趋势</h2></div><span class="muted">最近 180 天</span></div>${trendSvg(state.trend)}</section><section class="content-card condition-card"><div class="card-heading"><div><p class="kicker">CONDITIONS</p><h2>天气状况分布</h2></div></div>${conditionList(state.conditions)}</section></div>
    <div class="dashboard-grid second-row"><section class="content-card map-card"><div class="card-heading"><div><p class="kicker">LATEST SNAPSHOT</p><h2>全球城市观测分布</h2></div><span class="muted">${fmt(state.map.length, 0)} 个城市</span></div>${mapSvg(state.map)}</section><section class="content-card"><div class="card-heading"><div><p class="kicker">TRAVEL PICKS</p><h2>舒适度推荐 Top 5</h2></div><a class="text-link" href="#/recommend">查看全部 →</a></div>${recommendCompact(state.recommend)}</section></div>
    <section class="notice-panel"><div><p class="kicker">DATA COVERAGE</p><strong>${dateText(s.time_start)} 至 ${dateText(s.time_end)}</strong><span>统一以 UTC 时间轴整理的全球城市天气观测数据</span></div><div class="notice-stat"><span>重复行</span><strong>${fmt(s.duplicate_rows, 0)}</strong></div><div class="notice-stat"><span>异常规则</span><strong class="${Object.values(s.quality_rules || {}).some((v) => v > 0) ? "warning-text" : "ok-text"}">${Object.values(s.quality_rules || {}).filter((v) => v > 0).length} 项需复核</strong></div></section>`;
  document.getElementById("refresh-dashboard").addEventListener("click", loadDashboard);
}

function trendSvg(items) {
  if (!items.length) return '<div class="empty-state">暂无趋势数据</div>';
  const width = 760, height = 260, pad = { l: 44, r: 18, t: 18, b: 34 };
  const values = items.map((item) => Number(item.temperature_mean));
  const low = Math.floor(Math.min(...values) - 2), high = Math.ceil(Math.max(...values) + 2);
  const x = (i) => pad.l + i * (width - pad.l - pad.r) / Math.max(items.length - 1, 1);
  const y = (v) => pad.t + (high - v) * (height - pad.t - pad.b) / (high - low);
  const points = values.map((value, i) => `${x(i).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
  const area = `${pad.l},${height - pad.b} ${points} ${x(values.length - 1)},${height - pad.b}`;
  const labels = [0, Math.floor(items.length / 2), items.length - 1].map((i) => `<text x="${x(i)}" y="${height - 8}" class="axis-label">${esc(String(items[i].date).slice(0, 10))}</text>`).join("");
  const lines = [0, 1, 2, 3].map((i) => { const value = low + (high - low) * i / 3; return `<line x1="${pad.l}" x2="${width - pad.r}" y1="${y(value)}" y2="${y(value)}" class="grid-line"/><text x="${pad.l - 8}" y="${y(value) + 4}" text-anchor="end" class="axis-label">${value}°</text>`; }).join("");
  return `<div class="chart-wrap"><svg class="line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="全球平均温度趋势">${lines}<polygon points="${area}" class="trend-area"/><polyline points="${points}" class="trend-path"/>${labels}</svg><div class="chart-key"><span><i class="key-line"></i>平均温度</span><span><i class="key-area"></i>波动区间</span></div></div>`;
}

function conditionList(items) {
  if (!items.length) return '<div class="empty-state">暂无状况数据</div>';
  const max = Math.max(...items.map((item) => item.records));
  return `<div class="condition-list">${items.slice(0, 8).map((item, index) => `<div class="condition-row"><div><span class="rank">0${index + 1}</span><strong title="${esc(displayCondition(item.condition))}">${esc(displayCondition(item.condition))}</strong></div><div class="bar-track"><i style="width:${Math.max(3, item.records / max * 100)}%"></i></div><span class="condition-count">${fmt(item.share)}%</span></div>`).join("")}</div>`;
}

function mapSvg(items) {
  if (!items.length) return '<div class="empty-state">暂无坐标数据</div>';
  const points = items.filter((item) => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude))).map((item) => { const cx = 18 + (Number(item.longitude) + 180) / 360 * 604; const cy = 24 + (90 - Number(item.latitude)) / 180 * 214; const temp = Number(item.temperature); const color = temp < 5 ? "#4d81be" : temp > 28 ? "#dc775d" : "#d4a94e"; return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="2.5" fill="${color}" opacity=".72"><title>${esc(displayCity(item.city))} / ${esc(displayCountry(item.country))} · ${fmt(item.temperature)}°C</title></circle>`; }).join("");
  return `<div class="map-wrap"><svg viewBox="0 0 640 260" class="map-chart" role="img" aria-label="全球城市观测分布"><rect x="18" y="24" width="604" height="214" rx="3" class="map-bg"/><path d="M70 85l35-28 47 4 23 25 42 12 25 36-15 35-44-8-31 28-28-31-42-8-14-32zm196-22 28-20 39 8 10 31-22 22 9 34-42-3-20-34zm126 12 43-12 42 20-5 25-28 13-36-19zm122 24 34-9 32 28-18 31-40-8-20-22z" class="map-land"/>${points}</svg><div class="map-key"><span><i class="temp-dot cool"></i>低温</span><span><i class="temp-dot mild"></i>舒适</span><span><i class="temp-dot hot"></i>高温</span></div></div>`;
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

function renderEda() {
  document.getElementById("page-root").innerHTML = `${pageHeader("EXPLORATORY DATA ANALYSIS", "EDA 分析图谱", "九张分析图从时间、空间、天气、空气质量和数据质量多个维度审视数据集。", '<span class="data-badge">9 张分析图</span>')}<section class="eda-grid">${edaFigures.map(([file, title, desc]) => `<figure class="eda-card"><a href="/figures/${file}" target="_blank"><img src="/figures/${file}" alt="${esc(title)}" loading="lazy" /></a><figcaption><strong>${esc(title)}</strong><span>${esc(desc)}</span><a href="/figures/${file}" target="_blank">放大查看 ↗</a></figcaption></figure>`).join("")}</section>`;
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
  document.getElementById("page-root").innerHTML = `${pageHeader("SYSTEM INFORMATION", "系统说明", "项目部署、数据替换与算法逻辑说明，方便后续扩展为新的数据分析项目。", '<span class="data-badge">本地部署</span>')}<div class="system-grid"><section class="content-card system-hero"><span class="system-logo">WX</span><div><p class="kicker">PROJECT TITLE</p><h2>全球城市天气数据分析与出行推荐系统</h2><p>面向全球城市天气观测数据的分析型后台，提供数据概览、城市查询、规则推荐、EDA 图谱与质量检查。</p></div></section><section class="content-card"><div class="card-heading"><div><p class="kicker">PROJECT MODULES</p><h2>功能模块</h2></div></div><div class="module-list"><div><b>01</b><span><strong>数据仪表盘</strong><small>规模、趋势、天气状况、全球空间分布</small></span></div><div><b>02</b><span><strong>城市数据管理</strong><small>支持国家或城市关键词查询与分页浏览</small></span></div><div><b>03</b><span><strong>出行推荐中心</strong><small>四种策略的可解释规则评分</small></span></div><div><b>04</b><span><strong>EDA 与质量检查</strong><small>图表资产和数据边界检查集中呈现</small></span></div></div></section><section class="content-card data-replace"><div class="card-heading"><div><p class="kicker">DATA REPLACEMENT</p><h2>更换数据集</h2></div></div><p>将新的 CSV 文件放入 <code>data/raw/</code>，并保持后端必需字段名称；重新运行 EDA 脚本即可生成新的画像与图表。项目不依赖 Downloads 目录中的原始文件。</p><div class="code-line">python algorithm/run_eda.py --data data/raw/GlobalWeatherRepository.csv</div></section><section class="content-card account-card"><div class="card-heading"><div><p class="kicker">DEMO ACCESS</p><h2>当前登录账号</h2></div></div><div class="account-row"><span class="avatar large">A</span><div><strong>admin</strong><small>系统管理员 / 本地演示账号</small></div><span class="login-state">已登录</span></div></section></div>`;
}

function renderError(message) { document.getElementById("page-root").innerHTML = `<div class="error-panel"><strong>页面加载失败</strong><p>${esc(message)}</p><button class="primary-button" onclick="window.location.reload()">重新加载</button></div>`; }

async function renderPage() {
  const root = document.getElementById("page-root");
  if (!root) return;
  root.innerHTML = '<div class="loading-state"><span class="spinner"></span>正在加载数据...</div>';
  if (state.route === "/dashboard") return loadDashboard();
  if (state.route === "/city-data") { try { await loadCities(); } catch (error) { renderError(error.message); } return; }
  if (state.route === "/recommend") return loadRecommend();
  if (state.route === "/eda") return renderEda();
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
