const app = document.getElementById("app");

const kickerTranslations = {
  "GLOBAL CITY WEATHER DATA": "全球城市天气数据", "ADMIN CONSOLE": "天气数据管理平台",
  "OVERVIEW / DASHBOARD": "数据总览", "TIME SERIES": "时间趋势", CONDITIONS: "天气状况",
  "LATEST SNAPSHOT": "最新观测", "TRAVEL PICKS": "出行推荐", "DATA COVERAGE": "数据覆盖",
  "DATA MANAGEMENT": "数据管理", "INTELLIGENT RECOMMENDATION": "智能推荐", "SIMILAR CITIES": "气候相似城市",
  TARGET: "目标城市", MATCHES: "相似结果", "TRAVEL PLANNER": "出行规划", "CITY COMPARISON": "城市对比",
  "MONTHLY PROFILE": "月度气候", "LATEST INDICATORS": "最新指标", "TREND EXTRAPOLATION": "趋势外推",
  "SUMMARY TABLE": "指标汇总", "EXPLORATORY DATA ANALYSIS": "探索性数据分析",
  "MACHINE LEARNING EXPERIMENT": "机器学习实验", "LIVE INFERENCE": "实时推理", "MANUAL INPUT": "手动输入",
  "RAIN RISK RANK": "降水风险榜", "MODEL COMPARISON": "模型对比", "EVALUATION TABLE": "评估指标",
  VISUALIZATIONS: "可视化结果", REPRODUCE: "复现实验", "TRAVEL ASSISTANT": "出行助手",
  "OVERALL SCORE": "综合评分", "MONTHLY CONTEXT": "月度气候", "LIFE INDICES": "生活指数",
  "CLEANING REPORT": "数据清洗", "DATA QUALITY": "数据质量", "VALIDATION RULES": "校验规则",
  "PROFILE SUMMARY": "数据集概况", "SYSTEM INFORMATION": "系统说明", "PROJECT TITLE": "项目名称",
  "PROJECT MODULES": "功能模块", "DATA REPLACEMENT": "更换数据集", "DEMO ACCESS": "演示账号",
};

const searchPlaceholders = {
  "city-search": "输入中文或英文国家、城市名",
  "recommend-search": "输入中文或英文国家、城市名",
  "similar-search": "输入中文或英文城市名",
  "compare-search": "输入中文或英文城市名",
  "ml-city-search": "输入中文或英文城市名，读取最新观测",
  "advice-search": "输入中文或英文城市名",
};

const interfaceObserver = new MutationObserver(() => {
  app.querySelectorAll(".kicker").forEach((element) => {
    const translation = kickerTranslations[element.textContent.trim()];
    if (translation) element.textContent = translation;
  });
  app.querySelectorAll("h2").forEach((element) => {
    const current = element.textContent;
    const translated = current.replace(/\bTop\s+(\d+)\b/gi, "前$1名");
    if (translated !== current) element.textContent = translated;
  });
  app.querySelectorAll(".eda-card figcaption strong").forEach((element) => {
    const current = element.textContent;
    const translated = current.replace(/\bTop\s*(\d+)\b/gi, "前$1项");
    if (translated !== current) element.textContent = translated;
  });
  app.querySelectorAll("input[id]").forEach((element) => {
    const placeholder = searchPlaceholders[element.id];
    if (placeholder && element.placeholder !== placeholder) element.placeholder = placeholder;
  });
  app.querySelectorAll(".profile-list strong").forEach((element) => {
    if (element.textContent.trim() === "last_updated_epoch / UTC") element.textContent = "更新时间戳（UTC）";
  });
});
interfaceObserver.observe(app, { childList: true, subtree: true });

const state = {
  user: null,
  authMode: "login",
  route: window.location.hash.replace("#", "") || "/dashboard",
  summary: null,
  cleaning: null,
  trend: [],
  conditions: [],
  map: [],
  recommend: [],
  recommendWeights: [],
  cities: [],
  loading: false,
  error: "",
  cityQuery: "",
  cityPage: 1,
  cityTotal: 0,
  cityPageSize: 10,
  recommendMode: "comfort",
  recommendQuery: "",
  similarQuery: "",
  similarResult: null,
  adviceQuery: "",
  adviceCity: null,
  adviceMonth: null,
  adviceData: null,
  mlTimer: null,
  planMonth: new Date().getMonth() + 1,
  planMode: "comfort",
  planItems: null,
  planWeights: [],
  compareQuery: "",
  compareKeys: [],
  compareData: null,
  forecastData: null,
  datasets: [],
  datasetPage: 1,
  datasetTotal: 0,
  datasetPageSize: 10,
  datasetUploading: false,
  datasetPreview: null,
  datasetPreviewValidation: null,
  datasetActivating: false,
  mlTrainingTaskId: null,
  mlTrainingTimer: null,
};

const routes = {
  "/dashboard": { title: "数据仪表盘", section: "数据总览" },
  "/city-data": { title: "城市数据管理", section: "数据管理" },
  "/datasets": { title: "天气数据集", section: "数据管理" },
  "/compare": { title: "城市对比", section: "数据管理" },
  "/recommend": { title: "出行推荐中心", section: "智能推荐" },
  "/similar": { title: "相似城市", section: "智能推荐" },
  "/plan": { title: "出行规划", section: "智能推荐" },
  "/advice": { title: "出行助手", section: "智能推荐" },
  "/eda": { title: "EDA 分析图谱", section: "分析洞察" },
  "/ml": { title: "算法实验", section: "分析洞察" },
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
    label: "管理员专属",
    adminOnly: true,
    items: [{ path: "/datasets", icon: "⇧", label: "数据集管理" }],
  },
  {
    label: "智能推荐",
    items: [
      { path: "/recommend", icon: "✦", label: "推荐中心" },
      { path: "/similar", icon: "◈", label: "相似城市" },
      { path: "/plan", icon: "◔", label: "出行规划" },
      { path: "/advice", icon: "☂", label: "出行助手" },
    ],
  },
  {
    label: "分析洞察",
    items: [
      { path: "/eda", icon: "◫", label: "EDA 分析" },
      { path: "/ml", icon: "⚗", label: "算法实验" },
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
  "Antigua and Barbuda": "安提瓜和巴布达", "Bélgica": "比利时", "Central African Republic": "中非共和国",
  "Cote d'Ivoire": "科特迪瓦", "Democratic Republic of Congo": "刚果民主共和国", "Equatorial Guinea": "赤道几内亚",
  Estonie: "爱沙尼亚", Inde: "印度", Jemen: "也门", Komoren: "科摩罗", "Lao People's Democratic Republic": "老挝",
  Letonia: "拉脱维亚", "Malásia": "马来西亚", Marrocos: "摩洛哥", "Marshall Islands": "马绍尔群岛",
  Mexique: "墨西哥", "Polônia": "波兰", "Saint Kitts and Nevis": "圣基茨和尼维斯", "Saint Lucia": "圣卢西亚",
  "Saint Vincent and the Grenadines": "圣文森特和格林纳丁斯", "Saint-Vincent-et-les-Grenadines": "圣文森特和格林纳丁斯",
  "San Marino": "圣马力诺", "Saudi Arabien": "沙特阿拉伯", "Seychelles Islands": "塞舌尔", "Sierra Leone": "塞拉利昂",
  "Solomon Islands": "所罗门群岛", Swaziland: "斯威士兰", "Südkorea": "韩国", "Timor-Leste": "东帝汶",
  "Trinidad and Tobago": "特立尼达和多巴哥", "Turkménistan": "土库曼斯坦", Tuvalu: "图瓦卢",
  "USA United States of America": "美国", "Vatican City": "梵蒂冈", "Гватемала": "危地马拉", "Польша": "波兰",
  "Турция": "土耳其", "كولومبيا": "哥伦比亚", "火鸡": "土耳其",
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
  "'S Gravenjansdijk": "斯赫拉芬赞代克", "'S Gravenjansdyk": "斯赫拉芬赞代克", "'S Gravenstaffel": "斯赫拉芬斯塔费尔",
  "'S-Gravenbrakel": "斯赫拉芬布拉克尔", National: "国家地区", Bogot: "波哥大", Lom: "洛美", "Phnum Penh": "金边",
  Aba: "阿巴", Bafoussam: "巴富萨姆", Ngaoundere: "恩冈代雷", Ninga: "宁加", "N'djamena": "恩贾梅纳",
  "San Andres": "圣安德烈斯", "San Ignacio": "圣伊格纳西奥", "San Jose": "圣何塞", "San Juan": "圣胡安",
  Yamoussoukro: "亚穆苏克罗", Zagreb: "萨格勒布", Abaer: "阿拜尔", Grindavik: "格林达维克",
  Vestmannaeyjar: "韦斯特曼纳群岛", Laos: "老挝", Surabaya: "泗水", "Chi Chi Khvar": "基希瓦尔",
  "Bournemouth Gardens": "伯恩茅斯花园", "Newport East": "纽波特东区", "Norman Gardens": "诺曼花园",
  "Port Royal": "皇家港", Mombasa: "蒙巴萨", Ivory: "科特迪瓦", Dhidhdhoo: "迪迪杜", Felidhoo: "费利杜",
  "Ivory Ivory Ban": "科特迪瓦班", "Morocco City": "摩洛哥城", "Mexico (Grupo Mexico)": "墨西哥（墨西哥集团）",
  Monaco: "摩纳哥", Abazu: "阿巴祖", Namawbin: "纳马宾", Pathein: "勃生", Rangoon: "仰光", Yanngwa: "仰光",
  Aakip: "阿基普", Achelap: "阿切拉普", Adkip: "阿德基普", Airai: "艾莱", Meyungs: "梅永斯",
  Aguaray: "阿瓜雷", Aurora: "奥罗拉", Carreria: "卡雷里亚", Garrapata: "加拉帕塔", Pasto: "帕斯托",
  Sartorio: "萨托里奥", Kiyabo: "基亚博", Moldova: "摩尔多瓦", "Chi-Chi-Erh": "齐齐哈尔",
  "Saint Petersburg": "圣彼得堡", Basseterre: "巴斯特尔", Kingstown: "金斯敦", "City Of San Marino": "圣马力诺市",
  "San Marino": "圣马力诺", Riyadh: "利雅得", "Ar Riyadh": "利雅得", Dakar: "达喀尔", Mbabane: "姆巴巴内",
  Belgrade: "贝尔格莱德", Victoria: "维多利亚", Freetown: "弗里敦", Honiara: "霍尼亚拉", Mogadishu: "摩加迪沙",
  Pretoria: "比勒陀利亚", Seoul: "首尔", Juba: "朱巴", Khartoum: "喀土穆", Paramaribo: "帕拉马里博",
  "S-Chanf": "尚凡", Damascus: "大马士革", Dodoma: "多多马", Nan: "南府", Dili: "帝力",
  "Nuku'alofa": "努库阿洛法", "Nuku`Aloia": "努库阿洛法", "Port Of Spain": "西班牙港", Ankara: "安卡拉",
  Yaren: "雅连", "Krasnyy Turkmenistan": "克拉斯内土库曼斯坦", Funafuti: "富纳富提", Grenada: "格林纳达",
  Palau: "帕劳", "New York": "纽约", "Washington Harbor": "华盛顿港", "Washington Park": "华盛顿公园",
  "Vatican City": "梵蒂冈城", "Ban Lom": "班洛姆", "Ho Chi Minh City": "胡志明市", "S. Manian": "S. Manian",
  "New Guatemala": "新危地马拉", "Costa Rica": "哥斯达黎加", "-Kingdom": "未知地点",
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
  "Patchy Snow Nearby": "附近有零星降雪", "Patchy Sleet Nearby": "附近有零星雨夹雪",
  "Patchy Freezing Drizzle Nearby": "附近有零星冻毛毛雨", "Thundery Outbreaks In Nearby Areas": "附近有雷暴",
  "Blowing Snow": "吹雪", "Heavy Freezing Drizzle": "强冻毛毛雨", "Light Freezing Rain": "小冻雨",
  "Moderate Or Heavy Freezing Rain": "中到大冻雨", "Light Sleet": "小雨夹雪", "Moderate Or Heavy Sleet": "中到大雨夹雪",
  "Patchy Moderate Snow": "局部中雪", "Patchy Heavy Snow": "局部大雪", "Moderate Or Heavy Rain Shower": "中到大阵雨",
  "Torrential Rain Shower": "暴雨", "Light Sleet Showers": "小雨夹雪阵雨", "Moderate Or Heavy Sleet Showers": "中到大雨夹雪阵雨",
  "Light Snow Showers": "小雪阵雪", "Moderate Or Heavy Snow Showers": "中到大阵雪",
  "Light Showers Of Ice Pellets": "小冰粒阵雨", "Moderate Or Heavy Showers Of Ice Pellets": "中到大冰粒阵雨",
  "Patchy Light Rain With Thunder": "局部小雨伴雷电", "Moderate Or Heavy Rain With Thunder": "中到大雨伴雷电",
  "Patchy Light Snow With Thunder": "局部小雪伴雷电", "Moderate Or Heavy Snow With Thunder": "中到大雪伴雷电",
  "Smoky Haze": "烟霾", "Thundery Outbreaks In Nearby": "附近有雷暴",
};

function normalizeLookup(value) {
  return String(value ?? "").trim().normalize("NFKC").normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .replace(/[’‘`]/g, "'").replace(/[_-]+/g, " ").replace(/\s+/g, " ").toLocaleLowerCase("en");
}

const countryZhLookup = new Map(Object.entries(countryZh).map(([key, value]) => [normalizeLookup(key), value]));
const cityZhLookup = new Map(Object.entries(cityZh).map(([key, value]) => [normalizeLookup(key), value]));
const conditionZhLookup = new Map(Object.entries(conditionZh).map(([key, value]) => [normalizeLookup(key), value]));

function displayCountry(value) {
  const raw = String(value ?? "").trim();
  return countryZh[raw] || countryZhLookup.get(normalizeLookup(raw)) || raw;
}
function displayCity(value) {
  const raw = String(value ?? "").trim();
  const withoutSuffix = raw.replace(/\s+Shi$/i, "");
  return cityZh[raw] || cityZhLookup.get(normalizeLookup(raw)) || cityZh[withoutSuffix]
    || cityZhLookup.get(normalizeLookup(withoutSuffix)) || withoutSuffix;
}
function displayCondition(value) {
  const raw = String(value ?? "").trim();
  return conditionZh[raw] || conditionZhLookup.get(normalizeLookup(raw)) || raw;
}
function displayLocationName(value) {
  const raw = String(value ?? "").trim();
  return normalizeLookup(raw) === "global average" ? "全球平均" : displayCity(raw);
}
function displayUserName(value) {
  return normalizeLookup(value) === "weather administrator" ? "天气管理员" : String(value || "天气分析管理员");
}
function displayRole(value) {
  const role = normalizeLookup(value);
  if (role === "admin" || role === "role admin" || role === "system admin") return "系统管理员";
  if (role === "user" || role === "role user") return "普通用户";
  return String(value || "系统管理员");
}
const featureZhLookup = new Map(Object.entries({
  temperature_celsius: "气温", temperature: "气温", feels_like_celsius: "体感温度", feels_like: "体感温度",
  feels_temp_diff: "体感温差", humidity: "相对湿度", cloud: "云量", dew_spread_proxy: "露点温差估计",
  pressure_mb: "气压", wind_kph: "风速", gust_kph: "阵风", gust_wind_ratio: "阵风系数",
  visibility_km: "能见度", uv_index: "紫外线指数", month_sin: "月份周期（正弦）", month_cos: "月份周期（余弦）",
  "air_quality_PM2.5": "PM2.5 浓度", "air_quality_PM10": "PM10 浓度", "air_quality_Ozone": "臭氧浓度",
}).map(([key, value]) => [normalizeLookup(key), value]));
function displayFeatureName(value) {
  const raw = String(value ?? "").trim();
  return featureZhLookup.get(normalizeLookup(raw)) || raw.replaceAll("_", " ");
}
const qualityRuleLabels = {
  "temperature outside -60 to 60 c": "温度超出合理范围（-60 至 60°C）",
  "pressure outside 850 to 1100 mb": "气压超出合理范围（850 至 1100 毫巴）",
  "humidity outside 0 to 100%": "湿度超出 0 至 100%",
  "cloud cover outside 0 to 100%": "云量超出 0 至 100%",
  "negative precipitation": "降水量为负数",
  "negative visibility": "能见度为负数",
  "negative pm2.5": "PM2.5 为负数",
};
function displayQualityRule(value) {
  const raw = String(value ?? "").trim();
  return qualityRuleLabels[normalizeLookup(raw)] || raw;
}
function displayModelName(value) {
  const raw = String(value ?? "").trim();
  const modelNames = {
    "logistic regression": "逻辑回归",
    "decision tree": "决策树",
    "random forest": "随机森林",
    knn: "K 近邻",
    "k nearest neighbors": "K 近邻",
    "naive bayes": "朴素贝叶斯",
    svm: "支持向量机",
    "support vector machine": "支持向量机",
    "gradient boosting": "梯度提升",
    lightgbm: "LightGBM（梯度提升树）",
  };
  return modelNames[normalizeLookup(raw)] || raw;
}

const chineseSearchSuffix = /(?:特别行政区|自治区|地区|市|省|州)$/u;
const searchableTranslations = [...Object.entries(cityZh), ...Object.entries(countryZh)];

function citySearchTerms(value) {
  const query = String(value ?? "").trim();
  if (!query || !/[\u3400-\u9fff]/u.test(query)) return [query];
  const normalized = normalizeLookup(query).replace(chineseSearchSuffix, "");
  if (!normalized) return [query];
  const exact = searchableTranslations.filter(([, translated]) => normalizeLookup(translated) === normalized);
  const prefix = searchableTranslations.filter(([, translated]) => normalizeLookup(translated).startsWith(normalized));
  const partial = [...normalized].length < 2
    ? []
    : searchableTranslations.filter(([, translated]) => normalizeLookup(translated).includes(normalized));
  const candidates = exact.length ? exact : prefix.length ? prefix : partial;
  return [...new Set([query, ...candidates.map(([source]) => source)])].slice(0, 16);
}

async function searchCities(query, limit = 30) {
  const terms = citySearchTerms(query);
  const results = await Promise.all(terms.map((term) => api(`/api/cities?q=${encodeURIComponent(term)}&limit=100`)));
  const items = new Map();
  for (const result of results) {
    for (const item of result.items || []) items.set(item.city_key || `${item.country} | ${item.city}`, item);
  }
  return { items: [...items.values()].slice(0, limit) };
}

async function searchRecommendations(query, mode, limit = 30) {
  const terms = citySearchTerms(query);
  const results = await Promise.all(terms.map((term) => api(`/api/recommend?mode=${encodeURIComponent(mode)}&q=${encodeURIComponent(term)}&limit=30`)));
  const items = new Map();
  for (const result of results) {
    for (const item of result.items || []) items.set(item.city_key || `${item.country} | ${item.city}`, item);
  }
  return {
    mode: results[0]?.mode || mode,
    mode_label: results[0]?.mode_label || "",
    weights: results[0]?.weights || [],
    items: [...items.values()].sort((left, right) => Number(right.score) - Number(left.score)).slice(0, limit),
  };
}

const recommendationFactorLabels = {
  temperature: "温度", humidity: "湿度", rain: "降水", air: "空气质量",
  visibility: "能见度", cloud: "云量", condition: "天气状况",
};

function recommendationFactorLabel(key) { return recommendationFactorLabels[key] || String(key || "其他因素"); }

function renderStrategyWeights(weights) {
  if (!weights?.length) return "";
  return `<div class="strategy-weight-row"><span>当前策略权重</span>${weights.map((item) => `<b>${esc(recommendationFactorLabel(item.key))} ${fmt(item.weight, 1)}%</b>`).join("")}</div>`;
}

function renderScoreDetails(item, includeBreakdown = true) {
  const positive = item.positive_factors || [];
  const negative = item.negative_factors || [];
  const breakdown = item.score_breakdown || [];
  const factorPills = (factors, type) => factors.length
    ? factors.map((factor) => `<span class="score-factor ${type}">${esc(recommendationFactorLabel(factor.key))} ${type === "positive" ? `+${fmt(factor.contribution)}分` : `得分 ${fmt(factor.factor_score)}`}</span>`).join("")
    : '<span class="muted">暂无</span>';
  const breakdownMarkup = includeBreakdown && breakdown.length
    ? `<div class="score-breakdown">${breakdown.map((factor) => `<div><i>${esc(recommendationFactorLabel(factor.key))}</i><b>${fmt(factor.contribution)}分</b><small>权重 ${fmt(factor.weight, 1)}% · 因素得分 ${fmt(factor.factor_score)}</small></div>`).join("")}</div>`
    : "";
  return `<details class="score-details"><summary>查看评分依据</summary><div class="score-detail-group"><strong>主要加分项</strong><div class="score-factor-list">${factorPills(positive, "positive")}</div></div><div class="score-detail-group"><strong>相对弱项</strong><div class="score-factor-list">${factorPills(negative, "weak")}</div></div>${breakdownMarkup}</details>`;
}

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
  if (!response.ok) throw new Error(displayErrorMessage(body.message || body.error || `请求失败（${response.status}）`));
  return body;
}

function displayErrorMessage(value) {
  const message = String(value ?? "").trim();
  const normalized = normalizeLookup(message);
  if (normalized === "invalid username or password") return "用户名或密码错误";
  if (normalized === "not signed in") return "登录状态已失效，请重新登录";
  if (normalized === "administrator role required") return "天气数据集管理仅限管理员访问";
  if (normalized === "only csv files are supported") return "仅支持 CSV 格式文件";
  if (normalized === "session user no longer exists") return "当前账号不存在，请重新登录";
  if (normalized === "not enough daily observations to fit a trend") return "历史观测记录不足，暂时无法计算温度趋势";
  if (normalized === "model training is already running") return "已有模型训练任务正在运行";
  if (normalized === "model results are not available yet") return "模型训练结果尚未生成";
  if (normalized.startsWith("unknown city:")) {
    const key = message.replace(/^Unknown city:\s*/i, "");
    const [country, city] = key.split("|").map((part) => part.trim());
    return `未找到城市：${city ? `${displayCity(city)} · ${displayCountry(country)}` : displayCity(key)}`;
  }
  if (normalized.startsWith("model metrics are not available yet")) return "模型评估结果尚未生成，请先运行训练脚本";
  if (normalized.startsWith("could not read model metrics:")) return "读取模型评估结果失败，请检查模型文件";
  return message;
}

function setRoute(path) {
  const next = routes[path] ? path : "/dashboard";
  if (window.location.hash !== `#${next}`) window.location.hash = next;
  state.route = next;
  document.querySelector(".sidebar")?.classList.remove("is-open");
  renderApp();
}

function renderLogin(message = "", mode = state.authMode, values = {}) {
  state.authMode = mode;
  const registering = mode === "register";
  const formId = registering ? "register-form" : "login-form";
  const usernamePlaceholder = registering ? "3 至 32 位字母、数字或下划线" : "请输入用户名";
  const usernameRules = registering
    ? 'minlength="3" maxlength="32" pattern="[A-Za-z0-9_]{3,32}" title="用户名仅允许 3 至 32 位字母、数字和下划线"'
    : 'maxlength="64"';
  app.innerHTML = `
    <main class="login-page">
      <section class="login-intro">
        <div class="intro-top"><span class="logo-mark">WX</span><span>全球天气分析</span></div>
        <div class="intro-content">
          <p class="kicker">全球城市天气数据</p>
          <h1>全球城市天气<br /><em>分析与出行推荐系统</em></h1>
          <p class="intro-copy">用数据观察全球城市的天气状态、空气质量与环境变化，为城市研究和出行决策提供清晰的分析视角。</p>
        </div>
        <div class="intro-foot"><span>全球天气观测数据集</span><span>本地数据分析工作台</span></div>
      </section>
      <section class="login-panel">
        <div class="login-box">
          <p class="kicker">天气数据管理平台</p>
          <h2>${registering ? "创建账号" : "欢迎回来"}</h2>
          <p class="login-subtitle">${registering ? "注册后即可进入天气数据分析工作台" : "登录后进入天气数据分析工作台"}</p>
          <form id="${formId}" class="login-form">
            <label>用户名<input id="auth-username" name="username" autocomplete="username" placeholder="${usernamePlaceholder}" value="${esc(values.username || "")}" ${usernameRules} required /></label>
            ${registering ? `<label>昵称（可选）<input name="displayName" autocomplete="nickname" placeholder="请输入昵称" value="${esc(values.displayName || "")}" maxlength="40" /></label>` : ""}
            <label>密码<input id="auth-password" name="password" type="password" autocomplete="${registering ? "new-password" : "current-password"}" placeholder="${registering ? "至少 8 位" : "请输入密码"}" ${registering ? 'minlength="8" maxlength="64"' : ""} required /></label>
            ${registering ? `<label>确认密码<input name="confirmPassword" type="password" autocomplete="new-password" placeholder="请再次输入密码" minlength="8" maxlength="64" required /></label>` : ""}
            ${message ? `<p class="form-error" role="alert">${esc(message)}</p>` : ""}
            <button class="primary-button login-button" type="submit">${registering ? "创建账号" : "登录系统"} <span>→</span></button>
          </form>
          ${registering ? "" : '<div class="demo-account"><span>演示账号</span><strong>admin</strong><span>演示密码</span><strong>123456</strong></div>'}
          <button class="auth-switch" id="auth-switch" type="button">${registering ? "已有账号？返回登录" : "还没有账号？立即注册"}</button>
          <p class="login-note">${registering ? "密码长度为 8 至 64 位；新账号默认拥有普通用户权限。" : "本系统为本地部署演示环境，账号仅用于项目功能展示。"}</p>
        </div>
      </section>
    </main>`;
  document.getElementById(formId).addEventListener("submit", registering ? handleRegister : handleLogin);
  document.getElementById("auth-switch").addEventListener("click", () => {
    const username = document.getElementById("auth-username").value.trim();
    renderLogin("", registering ? "login" : "register", { username });
  });
  document.getElementById("auth-username").focus();
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
    renderLogin(error.message || "用户名或密码错误", "login", { username: form.get("username") });
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const values = {
    username: String(form.get("username") || "").trim(),
    displayName: String(form.get("displayName") || "").trim(),
  };
  const password = String(form.get("password") || "");
  const confirmPassword = String(form.get("confirmPassword") || "");
  if (password !== confirmPassword) {
    renderLogin("两次输入的密码不一致", "register", values);
    return;
  }

  const button = event.currentTarget.querySelector("button[type='submit']");
  button.disabled = true;
  button.textContent = "注册中...";
  try {
    const result = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ ...values, password, confirmPassword }),
    });
    state.user = result.user;
    state.authMode = "login";
    state.error = "";
    setRoute("/dashboard");
  } catch (error) {
    renderLogin(error.message || "注册失败，请稍后重试", "register", values);
  }
}

function renderApp() {
  disposeCharts();
  const route = routes[state.route] || routes["/dashboard"];
  const isAdmin = state.user?.role === "ADMIN";
  const userName = displayUserName(state.user?.display_name) || state.user?.username || "用户";
  const avatarText = String(userName).trim().slice(0, 1).toUpperCase() || (isAdmin ? "A" : "U");
  const visibleGroups = navGroups.filter((group) => !group.adminOnly || isAdmin);
  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="sidebar-brand"><span class="logo-mark">WX</span><div><strong>天气实验室</strong><small>天气数据分析系统</small></div></div>
        <div class="sidebar-rule"></div>
        <div class="sidebar-access ${isAdmin ? "is-admin" : ""}"><span class="access-mark">${isAdmin ? "A" : "U"}</span><div><strong>${isAdmin ? "管理员工作区" : "普通用户工作区"}</strong><small>${isAdmin ? "全部功能：数据 · 推荐 · 分析 · 管理" : "可用：数据查询 · 智能推荐 · 分析洞察"}</small></div></div>
        <nav>${visibleGroups.map((group) => `<div class="nav-group ${group.adminOnly ? "admin-nav" : ""}"><p><span>${group.label}</span>${group.adminOnly ? '<span class="nav-admin-badge">ADMIN</span>' : ""}</p>${group.items.map((item) => `<a href="#${item.path}" class="nav-item ${state.route === item.path ? "active" : ""}" data-route="${item.path}"><span class="nav-icon">${item.icon}</span><span>${item.label}</span>${group.adminOnly ? '<em class="nav-role-tag">管理员</em>' : ""}${state.route === item.path ? '<i class="active-line"></i>' : ""}</a>`).join("")}</div>`).join("")}${isAdmin ? "" : '<div class="nav-locked"><p><span>管理员功能</span><span class="nav-lock-badge">受限</span></p><div class="nav-locked-item"><span class="nav-icon">🔒</span><span>数据集管理</span></div><div class="nav-locked-item"><span class="nav-icon">🔒</span><span>模型重训</span></div><small>当前账号无权限，请联系管理员开通</small></div>'}</nav>
        <div class="sidebar-bottom"><div class="dataset-status"><span class="status-dot"></span><span>数据服务正常</span></div><small>本地运行 · v1.0</small></div>
      </aside>
      <div class="main-shell">
        <header class="topbar"><button class="icon-button menu-button" id="menu-toggle" title="打开菜单">☰</button><div class="breadcrumb"><span>天气实验室</span><b>/</b><strong>${route.title}</strong></div><div class="top-actions"><span class="top-date">数据快照 · ${new Date().toLocaleDateString("zh-CN")}</span><div class="user-chip"><span class="avatar ${isAdmin ? "is-admin" : ""}">${esc(avatarText)}</span><span><strong>${esc(userName)}</strong><small>${esc(displayRole(state.user?.role))}</small></span></div><span class="role-chip ${isAdmin ? "admin" : "user"}">${isAdmin ? "管理员" : "普通用户"}</span><button class="logout-button" id="logout-button">退出登录</button></div></header>
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
  const labels = {
    "OVERVIEW / DASHBOARD": "数据总览", "DATA MANAGEMENT": "数据管理", "INTELLIGENT RECOMMENDATION": "智能推荐",
    "SIMILAR CITIES": "气候相似城市", "TRAVEL PLANNER": "出行规划", "CITY COMPARISON": "城市对比",
    "EXPLORATORY DATA ANALYSIS": "探索性数据分析", "MACHINE LEARNING EXPERIMENT": "机器学习实验",
    "TRAVEL ASSISTANT": "出行助手", "DATA QUALITY": "数据质量", "SYSTEM INFORMATION": "系统说明",
  };
  return `<div class="page-header"><div><p class="kicker">${labels[eyebrow] || eyebrow}</p><h1>${title}</h1><p class="page-description">${desc}</p></div>${action}</div>`;
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
    <div class="dashboard-grid"><section class="content-card trend-card"><div class="card-heading"><div><p class="kicker">时间趋势</p><h2>全球平均温度趋势</h2></div><span class="muted">最近 180 天 · 悬停查看</span></div><div id="dash-trend" class="echart-box"></div></section><section class="content-card condition-card"><div class="card-heading"><div><p class="kicker">天气状况</p><h2>天气状况分布</h2></div></div><div id="dash-conditions" class="echart-box"></div></section></div>
    <div class="dashboard-grid second-row"><section class="content-card map-card"><div class="card-heading"><div><p class="kicker">最新观测</p><h2>全球城市观测分布</h2></div><span class="muted">${fmt(state.map.length, 0)} 个城市 · 滚轮缩放</span></div><div id="dash-map" class="echart-box"></div></section><section class="content-card"><div class="card-heading"><div><p class="kicker">出行推荐</p><h2>舒适度推荐前 5 名</h2></div><a class="text-link" href="#/recommend">查看全部 →</a></div>${recommendCompact(state.recommend)}</section></div>
    <section class="notice-panel"><div><p class="kicker">数据覆盖</p><strong>${dateText(s.time_start)} 至 ${dateText(s.time_end)}</strong><span>统一以 UTC 时间轴整理的全球城市天气观测数据</span></div><div class="notice-stat"><span>重复行</span><strong>${fmt(s.duplicate_rows, 0)}</strong></div><div class="notice-stat"><span>异常规则</span><strong class="${Object.values(s.quality_rules || {}).some((v) => v > 0) ? "warning-text" : "ok-text"}">${Object.values(s.quality_rules || {}).filter((v) => v > 0).length} 项需复核</strong></div></section>`;
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
  const terms = citySearchTerms(state.cityQuery);
  const params = new URLSearchParams({ page: String(state.cityPage), size: String(state.cityPageSize) });
  terms.forEach((term) => params.append("term", term));
  const result = await api(`/api/cities?${params.toString()}`);
  state.cities = result.items || [];
  state.cityTotal = Number(result.total || 0);
  renderCityData();
}

function cityTable(items) {
  const pageItems = items, totalPages = Math.max(1, Math.ceil(state.cityTotal / state.cityPageSize));
  if (!pageItems.length) return '<div class="empty-state">没有匹配的城市数据</div>';
  return `<div class="table-wrap"><table><thead><tr><th>国家 / 城市</th><th>当前天气</th><th>温度</th><th>体感</th><th>湿度</th><th>降水</th><th>PM2.5</th><th>能见度</th><th>更新时间</th></tr></thead><tbody>${pageItems.map((item) => `<tr><td><strong>${esc(displayCity(item.city))}</strong><small>${esc(displayCountry(item.country))}</small></td><td><span class="weather-tag">${esc(displayCondition(item.condition))}</span></td><td class="number-cell">${fmt(item.temperature)} °C</td><td class="number-cell">${fmt(item.feels_like)} °C</td><td class="number-cell">${fmt(item.humidity, 0)}%</td><td class="number-cell">${fmt(item.precipitation)} mm</td><td class="number-cell">${fmt(item.pm25)}</td><td class="number-cell">${fmt(item.visibility)} km</td><td class="muted">${dateText(item.updated)}</td></tr>`).join("")}</tbody></table></div><div class="pagination"><span>共 ${fmt(items.length, 0)} 条记录</span><div><button class="page-button" data-page="${state.cityPage - 1}" ${state.cityPage <= 1 ? "disabled" : ""}>上一页</button><b>${state.cityPage} / ${totalPages}</b><button class="page-button" data-page="${state.cityPage + 1}" ${state.cityPage >= totalPages ? "disabled" : ""}>下一页</button></div></div>`;
}

function renderCityData() {
  const root = document.getElementById("page-root");
  root.innerHTML = `${pageHeader("DATA MANAGEMENT", "城市数据管理", "查询全球城市最新天气观测，快速对比温度、空气质量与环境指标。", '<span class="data-badge">最新城市快照</span>')}<section class="content-card table-card"><div class="filter-bar"><label class="search-field"><span>⌕</span><input id="city-search" value="${esc(state.cityQuery)}" placeholder="输入中文或英文国家、城市名" /></label><button class="primary-button" id="city-search-button">查询数据</button><span class="filter-hint">显示当前数据集中可用城市的最新记录</span></div><div id="city-table">${cityTable(state.cities)}</div></section>`;
  const totalPages = Math.max(1, Math.ceil(state.cityTotal / state.cityPageSize));
  const pagination = document.querySelector("#city-table .pagination");
  if (pagination) {
    pagination.querySelector("span").textContent = `共 ${fmt(state.cityTotal, 0)} 条记录`;
    pagination.querySelector("b").textContent = `${state.cityPage} / ${totalPages}`;
    const [previous, next] = pagination.querySelectorAll(".page-button");
    previous.disabled = state.cityPage <= 1;
    next.disabled = state.cityPage >= totalPages;
  }
  document.getElementById("city-search-button").addEventListener("click", () => { state.cityQuery = document.getElementById("city-search").value.trim(); state.cityPage = 1; loadCities().catch((e) => renderError(e.message)); });
  document.getElementById("city-search").addEventListener("keydown", (event) => { if (event.key === "Enter") document.getElementById("city-search-button").click(); });
  document.querySelectorAll(".page-button").forEach((button) => button.addEventListener("click", () => { state.cityPage = Number(button.dataset.page); loadCities().catch((e) => renderError(e.message)); }));
}

async function loadDatasets() {
  const result = await api(`/api/datasets?page=${state.datasetPage}&size=${state.datasetPageSize}`);
  state.datasets = result.items || [];
  state.datasetTotal = Number(result.total || 0);
  renderDatasets();
}

function renderDatasets(message = "", messageType = "") {
  const root = document.getElementById("page-root");
  if (!root) return;
  const active = state.datasets.find((item) => item.status === "ACTIVE");
  const totalPages = Math.max(1, Math.ceil(state.datasetTotal / state.datasetPageSize));
  root.innerHTML = `${pageHeader("DATA MANAGEMENT", "天气数据集", "查看已登记的数据版本，并上传最新天气 CSV。上传文件通过字段校验后会立即启用，当前版本将自动归档。", '<span class="data-badge">管理员功能</span>')}
    <section class="dataset-upload content-card">
      <div class="card-heading"><div><p class="kicker">CURRENT DATASET</p><h2>当前生效版本</h2></div><span class="dataset-active-badge">${active ? "正在使用" : "暂无数据"}</span></div>
      ${active ? `<div class="dataset-current"><strong>${esc(active.name || "未命名数据集")}</strong><span>${fmt(active.rowCount, 0)} 条记录</span><span>${fmt(active.fieldCount, 0)} 个字段</span><span>更新于 ${dateText(active.updatedAt)}</span></div>` : '<p class="muted">数据集列表中暂无生效版本。</p>'}
      <form id="dataset-upload-form" class="dataset-upload-form"><label class="file-picker" for="dataset-file"><span class="file-picker-icon">＋</span><span><strong id="dataset-file-name">选择天气 CSV 文件</strong><small>仅支持 .csv 格式</small></span></label><input id="dataset-file" name="file" type="file" accept=".csv,text/csv" required /><button class="primary-button" id="dataset-upload-button" type="submit">上传并校验</button></form>
      <p class="dataset-upload-note">上传后先预览记录数量、重复项、拒绝项和缺失值；确认启用后，仪表盘、城市查询和分析结果才会切换到新数据。</p>
      <div id="dataset-upload-message" class="dataset-message ${messageType}">${esc(message)}</div>
      ${state.datasetPreview ? `<div class="dataset-preview-box"><div class="card-heading"><div><p class="kicker">VALIDATION PREVIEW</p><h3>待启用版本校验结果</h3></div><span class="dataset-status-tag preview">待确认</span></div><p class="dataset-preview-name">${esc(state.datasetPreview.name || "未命名数据集")}</p><div class="dataset-preview-grid"><span>原始记录 <b>${fmt(state.datasetPreviewValidation?.rows_before, 0)}</b></span><span>有效记录 <b>${fmt(state.datasetPreviewValidation?.valid_rows, 0)}</b></span><span>重复记录 <b>${fmt(state.datasetPreviewValidation?.duplicate_rows, 0)}</b></span><span>拒绝记录 <b>${fmt(state.datasetPreviewValidation?.rejected_rows, 0)}</b></span><span>缺失单元格 <b>${fmt(state.datasetPreviewValidation?.missing_cells, 0)}</b></span><span>字段数 <b>${fmt(state.datasetPreviewValidation?.fields, 0)}</b></span></div><p class="dataset-preview-note">当前运行数据保持不变。确认启用后，系统才会归档旧版本并切换查询、分析与推荐数据。</p><div class="dataset-preview-actions"><button class="primary-button" id="dataset-activate-button" type="button" ${state.datasetActivating ? "disabled" : ""}>${state.datasetActivating ? "正在启用..." : "确认启用此版本"}</button><button class="secondary-button" id="dataset-cancel-preview-button" type="button" ${state.datasetActivating ? "disabled" : ""}>取消预览</button></div></div>` : ""}
    </section>
    <section class="content-card dataset-list-card"><div class="card-heading"><div><p class="kicker">DATASET HISTORY</p><h2>数据版本记录</h2></div><button class="secondary-button" id="dataset-refresh-button" title="刷新数据列表">↻ 刷新</button></div>
      ${state.datasets.length ? `<div class="table-wrap"><table class="dataset-table"><thead><tr><th>数据集文件</th><th>数据规模</th><th>状态</th><th>创建时间</th><th>最近更新</th><th>操作</th></tr></thead><tbody>${state.datasets.map((item) => `<tr><td><strong>${esc(item.name || "未命名")}</strong><small>${esc(item.description || "天气数据集")}</small></td><td class="number-cell">${fmt(item.rowCount, 0)} 条 / ${fmt(item.fieldCount, 0)} 字段</td><td><span class="dataset-status-tag ${String(item.status).toLowerCase()}">${datasetStatusText(item.status)}</span></td><td class="muted">${dateText(item.createdAt)}</td><td class="muted">${dateText(item.updatedAt)}</td><td class="dataset-actions">${item.status === "PREVIEW" ? `<button class="dataset-action activate" data-dataset-activate="${item.id}" ${state.datasetActivating ? "disabled" : ""}>启用</button><button class="dataset-action cancel" data-dataset-cancel="${item.id}" ${state.datasetActivating ? "disabled" : ""}>取消</button>` : item.status === "ACTIVE" ? '<span class="muted">当前版本</span>' : '<span class="muted">—</span>'}</td></tr>`).join("")}</tbody></table></div><div class="pagination"><span>共 ${fmt(state.datasetTotal, 0)} 个数据版本</span><div><button class="page-button" id="dataset-prev" ${state.datasetPage <= 1 ? "disabled" : ""}>上一页</button><b>${state.datasetPage} / ${totalPages}</b><button class="page-button" id="dataset-next" ${state.datasetPage >= totalPages ? "disabled" : ""}>下一页</button></div></div>` : '<div class="empty-state">暂无数据版本记录</div>'}
    </section>`;
  document.getElementById("dataset-file").addEventListener("change", (event) => {
    document.getElementById("dataset-file-name").textContent = event.target.files[0]?.name || "选择天气 CSV 文件";
  });
  document.getElementById("dataset-upload-form").addEventListener("submit", uploadDataset);
  document.getElementById("dataset-activate-button")?.addEventListener("click", () => activateDataset().catch((error) => renderDatasets(error.message, "error")));
  document.getElementById("dataset-cancel-preview-button")?.addEventListener("click", () => cancelDatasetPreview().catch((error) => renderDatasets(error.message, "error")));
  document.querySelectorAll("[data-dataset-activate]").forEach((button) => button.addEventListener("click", () => {
    const item = state.datasets.find((candidate) => String(candidate.id) === button.dataset.datasetActivate);
    activateDataset(item).catch((error) => renderDatasets(error.message, "error"));
  }));
  document.querySelectorAll("[data-dataset-cancel]").forEach((button) => button.addEventListener("click", () => {
    const item = state.datasets.find((candidate) => String(candidate.id) === button.dataset.datasetCancel);
    cancelDatasetPreview(item).catch((error) => renderDatasets(error.message, "error"));
  }));
  document.getElementById("dataset-refresh-button").addEventListener("click", () => loadDatasets().catch((error) => renderError(error.message)));
  document.getElementById("dataset-prev")?.addEventListener("click", () => { state.datasetPage--; loadDatasets().catch((error) => renderError(error.message)); });
  document.getElementById("dataset-next")?.addEventListener("click", () => { state.datasetPage++; loadDatasets().catch((error) => renderError(error.message)); });
}

function datasetStatusText(status) {
  return ({ ACTIVE: "当前使用", ARCHIVED: "已归档", PREVIEW: "待确认", REGISTERED: "已登记" })[status] || status || "未知";
}

async function uploadDataset(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const file = form.elements.file.files[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".csv")) {
    renderDatasets("请选择 CSV 格式文件。", "error");
    return;
  }
  const button = document.getElementById("dataset-upload-button");
  button.disabled = true;
  state.datasetUploading = true;
  document.getElementById("dataset-upload-message").textContent = "正在上传并校验文件，请稍候...";
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/datasets/preview", { method: "POST", body: formData });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(displayErrorMessage(result.message || result.error || `上传失败（${response.status}）`));
    state.datasetPreview = result.item || null;
    state.datasetPreviewValidation = result.validation || null;
    state.datasetPage = 1;
    await loadDatasets();
    renderDatasets(`已校验 ${result.item?.name || file.name}，请检查预览后确认启用。`, "success");
  } catch (error) {
    renderDatasets(error.message || "上传失败，请检查 CSV 文件后重试。", "error");
  } finally {
    state.datasetUploading = false;
  }
}

async function activateDataset(item = state.datasetPreview) {
  if (!item) return;
  state.datasetActivating = true;
  renderDatasets("正在启用新版本，请稍候...", "success");
  try {
    const result = await api(`/api/datasets/${item.id}/activate`, { method: "POST" });
    state.datasetPreview = null;
    state.datasetPreviewValidation = null;
    state.datasetActivating = false;
    state.summary = null;
    state.cleaning = null;
    state.planItems = null;
    state.recommendWeights = [];
    state.planWeights = [];
    await loadDatasets();
    renderDatasets(result.message || "数据集已启用。", "success");
  } catch (error) {
    state.datasetActivating = false;
    throw error;
  }
}

async function cancelDatasetPreview(item = state.datasetPreview) {
  if (!item) return;
  await api(`/api/datasets/${item.id}`, { method: "DELETE" });
  if (!state.datasetPreview || String(state.datasetPreview.id) === String(item.id)) {
    state.datasetPreview = null;
    state.datasetPreviewValidation = null;
  }
  await loadDatasets();
  renderDatasets("已取消待启用预览版本。", "success");
}

async function loadRecommend() {
  try { const result = await searchRecommendations(state.recommendQuery, state.recommendMode, 30); state.recommend = result.items || []; state.recommendWeights = result.weights || []; renderRecommend(); translateRecommendData(); } catch (error) { renderError(error.message); }
}

function renderRecommend() {
  const modes = { comfort: "综合舒适", clean_air: "清新空气", warm_sunny: "温暖晴朗", cool_escape: "清凉避暑" };
  document.getElementById("page-root").innerHTML = `${pageHeader("INTELLIGENT RECOMMENDATION", "出行推荐中心", "基于温度、湿度、降水、能见度和空气质量的规则评分，为出行筛选城市。", '<span class="rule-badge">规则评分 · 非天气预报</span>')}<section class="content-card recommend-card"><div class="recommend-toolbar"><div class="segmented-control">${Object.entries(modes).map(([value, label]) => `<button class="segment ${state.recommendMode === value ? "active" : ""}" data-mode="${value}">${label}</button>`).join("")}</div><label class="search-field recommend-search"><span>⌕</span><input id="recommend-search" value="${esc(state.recommendQuery)}" placeholder="输入中文或英文国家、城市名" /></label><button class="secondary-button" id="recommend-search-button">筛选</button></div><div class="recommend-grid">${state.recommend.length ? state.recommend.map((item, index) => `<article class="recommend-card-item"><div class="recommend-number">${String(index + 1).padStart(2, "0")}</div><div class="recommend-main"><div class="recommend-title"><div><p>${esc(item.country)}</p><h3>${esc(item.city)}</h3></div><strong>${fmt(item.score)}<small> / 100</small></strong></div><div class="recommend-meta"><span>${esc(item.condition)}</span><span>${fmt(item.temperature)}°C</span><span>PM2.5 ${fmt(item.pm25)}</span></div><p class="recommend-reason">推荐理由：${esc(item.reason)}</p></div></article>`).join("") : '<div class="empty-state">没有匹配的推荐城市</div>'}</div></section>`;
  document.querySelector(".recommend-toolbar")?.insertAdjacentHTML("afterend", renderStrategyWeights(state.recommendWeights));
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
    const reason = card.querySelector(".recommend-reason");
    if (country) country.textContent = displayCountry(item.country);
    if (city) city.textContent = displayCity(item.city);
    if (condition) condition.textContent = displayCondition(item.condition);
    if (reason) reason.textContent = `推荐理由：${item.reason}`;
    card.querySelector(".recommend-main")?.insertAdjacentHTML("beforeend", renderScoreDetails(item));
  });
}

// ---------------- 相似城市（余弦相似度） ----------------

function renderSimilar() {
  document.getElementById("page-root").innerHTML = `${pageHeader("SIMILAR CITIES", "相似城市", "基于逐月气温、湿度、降水曲线与空气质量的标准化向量，用余弦相似度寻找气候最相近的城市。", '<span class="rule-badge">余弦相似度 · 37 维气候向量</span>')}<section class="content-card"><div class="filter-bar"><label class="search-field"><span>⌕</span><input id="similar-search" value="${esc(state.similarQuery)}" placeholder="输入中文或英文城市名" /></label><button class="primary-button" id="similar-search-button">查找城市</button><span class="filter-hint">选择一个目标城市，找出与其气候最相似的其他城市</span></div><div id="similar-suggestions" class="chip-row"></div></section><div id="similar-result"></div>`;
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
    const result = await searchCities(state.similarQuery, 10);
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
  document.querySelectorAll("[data-month]").forEach((button) => button.addEventListener("click", () => { state.planMonth = Number(button.dataset.month); state.planItems = null; state.planWeights = []; renderPlan(); loadPlan(); }));
  document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => { state.planMode = button.dataset.mode; state.planItems = null; state.planWeights = []; renderPlan(); loadPlan(); }));
  if (state.planItems) renderPlanResult(); else loadPlan();
}

async function loadPlan() {
  const box = document.getElementById("plan-result");
  if (!box) return;
  box.innerHTML = '<div class="loading-state"><span class="spinner"></span>正在按历史同期均值评分...</div>';
  try {
    const result = await api(`/api/plan?month=${state.planMonth}&mode=${state.planMode}&limit=8`);
    state.planItems = result.items || [];
    state.planWeights = result.weights || [];
    renderPlanResult();
  } catch (error) { box.innerHTML = `<div class="error-panel"><strong>加载失败</strong><p>${esc(error.message)}</p></div>`; }
}

function renderPlanResult() {
  const box = document.getElementById("plan-result");
  if (!box) return;
  const items = state.planItems || [];
  box.innerHTML = `<section class="content-card recommend-card"><div class="card-heading"><div><p class="kicker">${state.planMonth}月 · ${ { comfort: "综合舒适", clean_air: "清新空气", warm_sunny: "温暖晴朗", cool_escape: "清凉避暑" }[state.planMode] }</p><h2>推荐出行城市</h2></div><span class="muted">基于 ${dateText(state.summary?.time_start)} 至 ${dateText(state.summary?.time_end)} 的历史同期观测</span></div><div class="recommend-grid">${items.length ? items.map((item, index) => `<article class="recommend-card-item"><div class="recommend-number">${String(index + 1).padStart(2, "0")}</div><div class="recommend-main"><div class="recommend-title"><div><p>${esc(displayCountry(item.country))}</p><h3>${esc(displayCity(item.city))}</h3></div><strong>${fmt(item.score)}<small> / 100</small></strong></div><div class="recommend-meta"><span>均温 ${fmt(item.temperature)}°C</span><span>湿度 ${fmt(item.humidity, 0)}%</span><span>降水 ${fmt(item.precipitation)}mm</span><span>PM2.5 ${fmt(item.pm25)}</span></div><p class="recommend-reason">推荐理由：${esc(item.reason)}</p></div></article>`).join("") : '<div class="empty-state">没有匹配的推荐城市</div>'}</div></section>`;
  box.querySelector(".card-heading")?.insertAdjacentHTML("afterend", renderStrategyWeights(state.planWeights));
  box.querySelectorAll(".recommend-card-item").forEach((card, index) => {
    const item = items[index];
    if (!item) return;
    card.querySelector(".recommend-meta")?.insertAdjacentHTML("afterbegin", `<span>历史样本 ${fmt(item.sample_count, 0)} 条</span>`);
    card.querySelector(".recommend-main")?.insertAdjacentHTML("beforeend", renderScoreDetails(item));
  });
}

// ---------------- 城市对比（逐月曲线 + 指标雷达 + 趋势外推） ----------------

function renderCompare() {
  document.getElementById("page-root").innerHTML = `${pageHeader("CITY COMPARISON", "城市对比", "选择 1~4 个城市，对比逐月气温曲线、最新观测指标雷达图与温度趋势外推；不选城市时展示全球平均。", '<span class="data-badge">最多 4 城</span>')}<section class="content-card"><div class="filter-bar"><label class="search-field"><span>⌕</span><input id="compare-search" value="${esc(state.compareQuery)}" placeholder="输入中文或英文城市名" /></label><button class="primary-button" id="compare-search-button">搜索</button><span class="filter-hint">点击候选城市加入对比（${state.compareKeys.length}/4）</span></div><div id="compare-suggestions" class="chip-row"></div><div id="compare-selected" class="chip-row"></div></section><div id="compare-result"></div>`;
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
    const result = await searchCities(state.compareQuery, 10);
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
    ["紫外线", "uv", ""], ["PM2.5", "pm25", ""], ["降水概率(历史频率)", "rain_probability", "%"],
  ];
  container.innerHTML = `
    <div class="dashboard-grid"><section class="content-card"><div class="card-heading"><div><p class="kicker">MONTHLY PROFILE</p><h2>逐月平均气温对比</h2></div></div><div id="compare-months" class="echart-box"></div></section>
    <section class="content-card"><div class="card-heading"><div><p class="kicker">LATEST INDICATORS</p><h2>最新观测指标雷达</h2></div></div><div id="compare-radar" class="echart-box"></div></section></div>
    <section class="content-card" style="margin-top:18px"><div class="card-heading"><div><p class="kicker">TREND EXTRAPOLATION</p><h2>温度趋势外推 · ${esc(displayLocationName(forecast.target))}</h2></div><span class="muted">30 日滑动均值 + 线性回归，演示用途非气象预报</span></div><div id="compare-forecast" class="echart-box"></div></section>
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

// ---------------- 算法实验（实验三：人工智能算法） ----------------

function renderMlPage() {
  const root = document.getElementById("page-root");
  root.innerHTML = `${pageHeader("MACHINE LEARNING EXPERIMENT", "算法实验 · 降水预测", "实验三：对清洗后的天气数据做特征工程，训练并对比 8 种人工智能算法，评估准确率、精确率、召回率与 AUC。", '<span class="rule-badge">scikit-learn + LightGBM</span>')}<div id="ml-root"><div class="loading-state"><span class="spinner"></span>正在加载实验结果...</div></div>`;
  loadMlResult();
}

async function loadMlResult() {
  const root = document.getElementById("ml-root");
  if (!root) return;
  try {
    const result = await api("/api/ml");
    if (!result.available) {
      root.innerHTML = `<div class="error-panel"><strong>实验结果尚未生成</strong><p>${esc(displayErrorMessage(result.message))}</p></div>${mlTrainingPanel()}`;
      initializeMlTrainingControls();
      return;
    }
    renderMlResult(result.metrics);
  } catch (error) { root.innerHTML = `<div class="error-panel"><strong>加载失败</strong><p>${esc(error.message)}</p></div>`; }
}

function renderMlResult(m) {
  const root = document.getElementById("ml-root");
  const bestKey = (m.best_model || "").trim();
  const bestName = displayModelName(bestKey);
  const modelDataNotice = m.model_data_status && m.model_data_status !== "current"
    ? `<div class="notice-panel warning-panel" style="margin-bottom:18px"><div><p class="kicker">MODEL DATA VERSION</p><strong>${esc(m.model_data_message || "模型与当前数据集版本不一致")}</strong><span>请重新训练模型后再使用降水预测。</span></div></div>`
    : "";
  root.innerHTML = `
    ${mlTrainingPanel()}
    ${modelDataNotice}
    <div class="dashboard-grid">
      <section class="content-card"><div class="card-heading"><div><p class="kicker">LIVE INFERENCE</p><h2>实时降水概率预测器</h2></div><span class="muted" id="ml-mode-hint">正在加载...</span></div><div id="ml-gauge" style="height:200px"></div><div class="filter-bar" style="margin-top:6px"><label class="search-field"><span>⌕</span><input id="ml-city-search" placeholder="搜索城市读取最新观测" /></label><button class="primary-button" id="ml-city-search-button">读取</button></div><div id="ml-city-chips" class="chip-row"></div><div id="ml-drivers" class="chip-row"></div></section>
      <section class="content-card"><div class="card-heading"><div><p class="kicker">MANUAL INPUT</p><h2>手动参数预测</h2></div><span class="muted">拖动滑块实时调用模型</span></div><div id="ml-sliders"></div></section>
    </div>
    <section class="content-card" style="margin-top:18px"><div class="card-heading"><div><p class="kicker">RAIN RISK RANK</p><h2>全城降水风险榜</h2></div><span class="muted" id="ml-risk-model">模型推理 · 最新观测</span></div><div class="compact-list" id="ml-risk-list"><span class="muted">加载中...</span></div></section>
    <div class="metric-grid" style="margin-top:18px">
      ${metricCard("预测任务", "降水预测", `标签规则 precip_mm > ${m.label_threshold}`)}
      ${metricCard("训练样本", fmt(m.train, 0), `测试集 ${fmt(m.test, 0)} 条（分层抽样）`)}
      ${metricCard("特征维度", fmt(m.features.length, 0), "含时间周期与衍生特征")}
      ${metricCard("降水占比", `${(m.class_balance["降水"] / (m.class_balance["降水"] + m.class_balance["无降水"]) * 100).toFixed(1)}%`, `无降水 ${fmt(m.class_balance["无降水"], 0)} 条`, "clean")}
    </div>
    <section class="content-card"><div class="card-heading"><div><p class="kicker">MODEL COMPARISON</p><h2>八种算法性能对比</h2></div><span class="muted">测试集 ${fmt(m.test, 0)} 条 · 悬停查看数值</span></div><div id="ml-compare" class="echart-box" style="height:320px"></div></section>
    <section class="content-card" style="margin-top:18px"><div class="card-heading"><div><p class="kicker">EVALUATION TABLE</p><h2>评估指标明细</h2></div><span class="muted">最佳模型按 F1 选取：${esc(bestName)}</span></div><div class="table-wrap"><table><thead><tr><th>算法</th><th>准确率</th><th>精确率</th><th>召回率</th><th>F1</th><th>AUC</th><th>训练耗时</th></tr></thead><tbody>${m.models.map((item) => { const isBest = normalizeLookup(displayModelName(item.name)) === normalizeLookup(bestName); return `<tr class="${isBest ? "best-row" : ""}"><td><strong>${esc(displayModelName(item.name))}</strong>${isBest ? ' <span class="quality-badge" style="margin-left:6px">最佳</span>' : ""}</td><td class="number-cell">${item.accuracy.toFixed(4)}</td><td class="number-cell">${item.precision.toFixed(4)}</td><td class="number-cell">${item.recall.toFixed(4)}</td><td class="number-cell">${item.f1.toFixed(4)}</td><td class="number-cell">${item.auc.toFixed(4)}</td><td class="number-cell">${item.train_seconds}s</td></tr>`; }).join("")}</tbody></table></div></section>
    <section class="content-card" style="margin-top:18px"><div class="card-heading"><div><p class="kicker">VISUALIZATIONS</p><h2>训练与评估可视化</h2></div><span class="muted">由 algorithm/ml_train.py 生成</span></div><div class="eda-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))"><figure class="eda-card"><a href="/figures/ml_roc_curves.png" target="_blank"><img src="/figures/ml_roc_curves.png" alt="ROC 曲线" loading="lazy" /></a><figcaption><strong>ROC 曲线对比</strong><span>八种算法的受试者工作特征曲线与 AUC</span></figcaption></figure><figure class="eda-card"><a href="/figures/ml_confusion_matrix.png" target="_blank"><img src="/figures/ml_confusion_matrix.png" alt="混淆矩阵" loading="lazy" /></a><figcaption><strong>最佳模型混淆矩阵</strong><span>真负例 / 假正例 / 假负例 / 真正例</span></figcaption></figure><figure class="eda-card"><a href="/figures/ml_feature_importance.png" target="_blank"><img src="/figures/ml_feature_importance.png" alt="特征重要性" loading="lazy" /></a><figcaption><strong>特征重要性 Top10</strong><span>随机森林与 LightGBM 的对比</span></figcaption></figure><figure class="eda-card"><a href="/figures/ml_class_balance.png" target="_blank"><img src="/figures/ml_class_balance.png" alt="类别分布" loading="lazy" /></a><figcaption><strong>降水标签类别分布</strong><span>类别不平衡是召回率偏低的主要原因</span></figcaption></figure></div></section>
    <section class="notice-panel" style="margin-top:18px"><div><p class="kicker">REPRODUCE</p><strong>实验报告</strong><span>完整分析见 data/profile/ML_REPORT.md；更换数据集后请重新训练并确认模型版本与当前数据一致。</span></div></section>`;
  mountMlChart(m);
  mountMlPredictor(m.model_data_status === "current", m.model_data_message);
  initializeMlTrainingControls();
}

function mlTrainingPanel() {
  if (state.user?.role !== "ADMIN") {
    return `<section class="notice-panel permission-hint" style="margin-bottom:18px"><div><p class="kicker">MODEL MANAGEMENT</p><strong>模型训练 · 管理员专属</strong><span>当前为普通用户，仅可查看算法实验结果；重新训练模型需要管理员权限。</span></div><span class="role-chip user">只读</span></section>`;
  }
  return `<section class="notice-panel" id="ml-training-panel" style="margin-bottom:18px"><div><p class="kicker">MODEL MANAGEMENT</p><strong>模型训练</strong><span id="ml-training-status">使用当前激活数据集重新训练降水模型</span></div><button class="secondary-button" id="ml-train-button">重新训练模型</button></section>`;
}

function initializeMlTrainingControls() {
  const button = document.getElementById("ml-train-button");
  if (button) button.addEventListener("click", startMlTraining);
  restoreMlTrainingTask();
}

function setMlTrainingStatus(message, running = false) {
  const status = document.getElementById("ml-training-status");
  const button = document.getElementById("ml-train-button");
  if (status) status.textContent = message;
  if (button) {
    button.disabled = running;
    button.textContent = running ? "训练中..." : "重新训练模型";
  }
}

async function startMlTraining() {
  setMlTrainingStatus("正在创建训练任务...", true);
  try {
    const result = await api("/api/models/train", { method: "POST" });
    state.mlTrainingTaskId = result.taskId;
    setMlTrainingStatus("训练任务已启动，正在使用当前激活的数据集...", true);
    pollMlTrainingTask();
  } catch (error) {
    setMlTrainingStatus(`启动失败：${error.message}`);
  }
}

async function restoreMlTrainingTask() {
  if (state.user?.role !== "ADMIN" || state.route !== "/ml" || state.mlTrainingTaskId) return;
  try {
    const result = await api("/api/models?page=1&size=1");
    const task = result.items?.[0];
    if (task?.status === "RUNNING") {
      state.mlTrainingTaskId = task.id;
      setMlTrainingStatus("检测到正在运行的训练任务...", true);
      pollMlTrainingTask();
    }
  } catch (_) { /* 模型管理入口仅对管理员可用 */ }
}

async function pollMlTrainingTask() {
  if (!state.mlTrainingTaskId) return;
  try {
    const result = await api(`/api/models/${state.mlTrainingTaskId}/status`);
    if (result.running || result.status === "RUNNING") {
      setMlTrainingStatus("模型正在训练，完成后页面会自动刷新结果。", true);
      state.mlTrainingTimer = setTimeout(pollMlTrainingTask, 2000);
      return;
    }
    const completed = result.status === "SUCCEEDED";
    setMlTrainingStatus(completed ? "训练完成，正在刷新模型评估结果..." : `训练失败：${String(result.log || "请检查训练日志").slice(-400)}`);
    state.mlTrainingTaskId = null;
    if (completed) {
      await loadMlResult();
      setMlTrainingStatus("训练完成，模型已更新。");
    }
  } catch (error) {
    setMlTrainingStatus(`读取训练状态失败：${error.message}`);
    state.mlTrainingTaskId = null;
  }
}

// ---- 模型在线推理：城市预测 / 手动滑块 / 风险榜 ----

const mlSliders = [
  ["month", "月份", 1, 12, 1],
  ["temperature", "温度 °C", -15, 45, 0.5],
  ["humidity", "湿度 %", 0, 100, 1],
  ["cloud", "云量 %", 0, 100, 1],
  ["pressure", "气压 mb", 970, 1050, 1],
  ["wind", "风速 kph", 0, 60, 0.5],
  ["visibility", "能见度 km", 0, 24, 0.5],
  ["pm25", "PM2.5", 0, 150, 1],
];

function mountMlPredictor(modelCurrent = true, modelMessage = "") {
  mountChart("ml-gauge", {
    series: [{
      type: "gauge", min: 0, max: 100, startAngle: 200, endAngle: -20, radius: "95%",
      progress: { show: true, width: 14, itemStyle: { color: "#1b8278" } },
      axisLine: { lineStyle: { width: 14, color: [[1, "#e1e9e6"]] } },
      axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
      pointer: { show: false }, anchor: { show: false },
      detail: { valueAnimation: true, fontSize: 28, offsetCenter: [0, "8%"], formatter: "{value}%", color: "#123c39" },
      title: { fontSize: 11, offsetCenter: [0, "45%"], color: "#71807e" },
      data: [{ value: 0, name: "降水概率" }],
    }],
  });
  renderMlSliders(null);
  if (!modelCurrent) {
    const message = modelMessage || "模型与当前数据集版本不一致，请先重新训练";
    document.querySelectorAll("[data-ml-slider], #ml-city-search, #ml-city-search-button").forEach((element) => { element.disabled = true; });
    const hint = document.getElementById("ml-mode-hint");
    if (hint) hint.textContent = message;
    document.getElementById("ml-drivers").textContent = message;
    document.getElementById("ml-risk-model").textContent = message;
    document.getElementById("ml-risk-list").textContent = message;
    return;
  }
  document.getElementById("ml-city-search-button").addEventListener("click", searchMlCities);
  document.getElementById("ml-city-search").addEventListener("keydown", (event) => { if (event.key === "Enter") searchMlCities(); });
  loadMlRisk();
  runMlCityPredict("China | Beijing");
}

function renderMlSliders(inputs) {
  const box = document.getElementById("ml-sliders");
  if (!box) return;
  box.innerHTML = mlSliders.map(([key, label, min, max, step]) => {
    const value = inputs && inputs[key] !== undefined ? inputs[key] : null;
    const fallback = key === "month" ? new Date().getMonth() + 1 : Math.round((min + max) / 2);
    const shown = value ?? fallback;
    return `<div class="ml-slider"><span>${label}</span><input type="range" data-ml-slider="${key}" min="${min}" max="${max}" step="${step}" value="${shown}" /><b id="ml-val-${key}">${shown}</b></div>`;
  }).join("");
  box.querySelectorAll("[data-ml-slider]").forEach((slider) => slider.addEventListener("input", () => {
    document.getElementById(`ml-val-${slider.dataset.mlSlider}`).textContent = slider.value;
    scheduleManualPredict();
  }));
}

function collectMlSliders() {
  const values = {};
  mlSliders.forEach(([key]) => {
    const slider = document.querySelector(`[data-ml-slider="${key}"]`);
    if (slider) values[key] = Number(slider.value);
  });
  return values;
}

function updateMlGauge(probability, mode) {
  const chart = window.echarts ? echarts.getInstanceByDom(document.getElementById("ml-gauge")) : null;
  if (chart) {
    chart.setOption({
      series: [{
        data: [{ value: probability, name: "降水概率" }],
        progress: { show: true, width: 14, itemStyle: { color: probability >= 50 ? "#dd765b" : "#1b8278" } },
      }],
    });
  }
  const hint = document.getElementById("ml-mode-hint");
  if (hint) hint.textContent = `${mode} · 预测：${probability >= 50 ? "降水" : "无降水"}`;
}

function scheduleManualPredict() {
  clearTimeout(state.mlTimer);
  state.mlTimer = setTimeout(async () => {
    try {
      const result = await api("/api/ml/predict", { method: "POST", body: JSON.stringify(collectMlSliders()) });
      if (result.available) updateMlGauge(result.probability, "手动参数");
    } catch (error) { /* 滑块连续拖动期间静默失败 */ }
  }, 250);
}

async function searchMlCities() {
  const query = document.getElementById("ml-city-search").value.trim();
  const box = document.getElementById("ml-city-chips");
  if (!box) return;
  box.innerHTML = '<span class="muted">搜索中...</span>';
  try {
    const result = await searchCities(query, 8);
    const items = result.items || [];
    box.innerHTML = items.length
      ? items.map((item) => `<button class="chip" data-key="${esc(`${item.country} | ${item.city}`)}">${esc(displayCity(item.city))} · ${esc(displayCountry(item.country))}</button>`).join("")
      : '<span class="muted">没有匹配的城市</span>';
    box.querySelectorAll(".chip").forEach((chip) => chip.addEventListener("click", () => runMlCityPredict(chip.dataset.key)));
  } catch (error) { box.innerHTML = `<span class="warning-text">${esc(error.message)}</span>`; }
}

async function runMlCityPredict(key) {
  const drivers = document.getElementById("ml-drivers");
  try {
    const result = await api(`/api/ml/predict?k=${encodeURIComponent(key)}`);
    if (!result.available) { if (drivers) drivers.innerHTML = `<span class="warning-text">${esc(displayErrorMessage(result.message))}</span>`; return; }
    updateMlGauge(result.probability, `${displayCity(result.city)} 最新观测`);
    renderMlSliders(result.inputs);
    if (drivers) {
      drivers.innerHTML = result.drivers.map((item) => `<span class="chip ${Math.abs(item.z) >= 1 ? "active" : ""}" title="相对全量均值偏离 ${item.z}σ">${esc(displayFeatureName(item.feature))} ${fmt(item.value)}（${item.z >= 0 ? "+" : ""}${item.z}σ）</span>`).join("");
    }
  } catch (error) { if (drivers) drivers.innerHTML = `<span class="warning-text">${esc(error.message)}</span>`; }
}

async function loadMlRisk() {
  try {
    const result = await api("/api/ml/risk_rank?limit=10");
    const list = document.getElementById("ml-risk-list");
    if (!list) return;
    if (!result.available) { list.innerHTML = `<span class="warning-text">${esc(displayErrorMessage(result.message))}</span>`; return; }
    document.getElementById("ml-risk-model").textContent = `模型：${displayModelName(result.model)} · 按预测降水概率排序`;
    list.innerHTML = result.items.map((item, index) => `<div class="compact-item"><span class="compact-rank">${String(index + 1).padStart(2, "0")}</span><div><strong>${esc(displayCity(item.city))}</strong><small>${esc(displayCountry(item.country))} · ${esc(displayCondition(item.condition))} · ${fmt(item.temperature)}°C · 湿度 ${item.humidity}%</small></div><b>${fmt(item.probability)}<em>%</em></b></div>`).join("");
  } catch (error) { /* 列表加载失败不影响主页面 */ }
}

// ---------------- 出行助手（生活指数 + 综合评分 + 建议） ----------------

function renderAdvice() {
  const months = Array.from({ length: 12 }, (_, index) => index + 1);
  document.getElementById("page-root").innerHTML = `${pageHeader("TRAVEL ASSISTANT", "出行助手", "选择城市与出行时间，系统综合实况/历史同期气候、历史降水频率与空气质量，生成六项生活指数和出行建议。", '<span class="rule-badge">数据驱动 · 非天气预报</span>')}<section class="content-card"><div class="filter-bar"><label class="search-field"><span>⌕</span><input id="advice-search" value="${esc(state.adviceQuery)}" placeholder="搜索城市，如 Beijing / Paris / 中国" /></label><button class="primary-button" id="advice-search-button">查询</button><span class="filter-hint">当前城市：${esc(displayCity((state.adviceCity || "China | Beijing").split(" | ")[1]))}</span></div><div class="chip-row" id="advice-chips"></div><div class="recommend-toolbar" style="margin-top:10px"><div class="segmented-control"><button class="segment ${state.adviceMonth === null ? "active" : ""}" data-amonth="">当前实况</button>${months.map((month) => `<button class="segment ${state.adviceMonth === month ? "active" : ""}" data-amonth="${month}">${month}月</button>`).join("")}</div></div></section><div id="advice-result"></div>`;
  document.getElementById("advice-search-button").addEventListener("click", searchAdviceCities);
  document.getElementById("advice-search").addEventListener("keydown", (event) => { if (event.key === "Enter") searchAdviceCities(); });
  document.querySelectorAll("[data-amonth]").forEach((button) => button.addEventListener("click", () => {
    state.adviceMonth = button.dataset.amonth === "" ? null : Number(button.dataset.amonth);
    document.querySelectorAll("[data-amonth]").forEach((item) => item.classList.toggle("active", item === button));
    loadAdvice();
  }));
  if (!state.adviceCity) state.adviceCity = "China | Beijing";
  loadAdvice();
}

async function searchAdviceCities() {
  state.adviceQuery = document.getElementById("advice-search").value.trim();
  const box = document.getElementById("advice-chips");
  if (!box) return;
  box.innerHTML = '<span class="muted">搜索中...</span>';
  try {
    const result = await searchCities(state.adviceQuery, 10);
    const items = result.items || [];
    box.innerHTML = items.length
      ? items.map((item) => `<button class="chip" data-key="${esc(`${item.country} | ${item.city}`)}">${esc(displayCity(item.city))} · ${esc(displayCountry(item.country))}</button>`).join("")
      : '<span class="muted">没有匹配的城市</span>';
    box.querySelectorAll(".chip").forEach((chip) => chip.addEventListener("click", () => {
      state.adviceCity = chip.dataset.key;
      loadAdvice();
    }));
  } catch (error) { box.innerHTML = `<span class="warning-text">${esc(error.message)}</span>`; }
}

async function loadAdvice() {
  const box = document.getElementById("advice-result");
  if (!box) return;
  const params = new URLSearchParams({ k: state.adviceCity });
  if (state.adviceMonth) params.set("month", String(state.adviceMonth));
  box.innerHTML = '<div class="loading-state"><span class="spinner"></span>正在生成出行建议...</div>';
  try {
    state.adviceData = await api(`/api/advice?${params}`);
    renderAdviceResult();
  } catch (error) { box.innerHTML = `<div class="error-panel"><strong>生成失败</strong><p>${esc(error.message)}</p></div>`; }
}

function renderAdviceResult() {
  const box = document.getElementById("advice-result");
  if (!box || !state.adviceData) return;
  const data = state.adviceData;
  const facts = [
    [`温度 ${fmt(data.facts.temperature)}°C`],
    [`湿度 ${fmt(data.facts.humidity, 0)}%`],
    [`降水 ${fmt(data.facts.precipitation)}mm`],
    [`PM2.5 ${fmt(data.facts.pm25)}`],
    [`紫外线 ${fmt(data.facts.uv)}`],
    [`${data.facts.rain_probability_label || (data.mode === "now" ? "历史记录降水频率" : "历史同期降水频率")} ${fmt(data.facts.rain_probability)}%`],
  ];
  if (data.facts.condition) facts.push([`实况：${displayCondition(data.facts.condition)}`]);
  if (data.facts.deviation !== null && data.facts.deviation !== undefined && Math.abs(data.facts.deviation) >= 1.5) {
    facts.push([`较同期${data.facts.deviation > 0 ? "偏高" : "偏低"} ${fmt(Math.abs(data.facts.deviation))}°C`]);
  }
  box.innerHTML = `
    <div class="dashboard-grid">
      <section class="content-card"><div class="card-heading"><div><p class="kicker">OVERALL SCORE</p><h2>综合出行评分</h2></div><span class="muted">${esc(data.context_label || (data.mode === "now" ? "当前实况 + 历史降水统计" : `${data.month} 月历史同期`))}</span></div><div id="advice-gauge" style="height:200px"></div><div class="chip-row">${facts.map(([text]) => `<span class="chip active">${esc(text)}</span>`).join("")}</div></section>
      <section class="content-card"><div class="card-heading"><div><p class="kicker">MONTHLY CONTEXT</p><h2>全年逐月均温</h2></div><span class="muted">红色为${data.mode === "now" ? "当前" : "所选"}月份</span></div><div id="advice-months" style="height:200px"></div></section>
    </div>
    <section class="content-card" style="margin-top:18px"><div class="card-heading"><div><p class="kicker">LIFE INDICES</p><h2>六项生活指数</h2></div><span class="muted">${esc(displayCity(data.city))} · ${esc(displayCountry(data.country))}</span></div><div class="advice-grid">${data.indices.map((item) => `<div class="advice-index"><span class="name">${esc(item.name)}</span><b class="level tone-${item.tone}">${esc(item.level)}</b><p>${esc(item.text)}</p></div>`).join("")}</div><div class="quality-note" style="margin-top:14px"><strong>出行建议</strong><p>${esc(data.summary)}</p></div></section>`;
  const monthHighlight = data.mode === "now" ? new Date().getMonth() + 1 : data.month;
  mountAdviceCharts(data, monthHighlight);
}

function mountAdviceCharts(data, monthHighlight) {
  mountChart("advice-gauge", {
    series: [{
      type: "gauge", min: 0, max: 100, startAngle: 200, endAngle: -20, radius: "95%",
      progress: { show: true, width: 14, itemStyle: { color: data.score >= 60 ? "#1b8278" : "#dd765b" } },
      axisLine: { lineStyle: { width: 14, color: [[1, "#e1e9e6"]] } },
      axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
      pointer: { show: false }, anchor: { show: false },
      detail: { valueAnimation: true, fontSize: 28, offsetCenter: [0, "8%"], formatter: "{value} 分", color: "#123c39" },
      title: { fontSize: 11, offsetCenter: [0, "45%"], color: "#71807e" },
      data: [{ value: data.score, name: data.verdict }],
    }],
  });
  mountChart("advice-months", {
    tooltip: { trigger: "item", textStyle: { fontSize: 11 }, formatter: (params) => `${params.name}：${fmt(params.value)} °C` },
    grid: { left: 34, right: 10, top: 16, bottom: 22 },
    xAxis: { type: "category", data: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"], axisLabel: { fontSize: 9 } },
    yAxis: { type: "value", scale: true, axisLabel: { fontSize: 9, formatter: "{value}°" }, splitLine: { lineStyle: { color: "#e7efec" } } },
    series: [{
      type: "bar", barWidth: 14,
      data: data.monthly_temp.map((value, index) => ({
        value,
        itemStyle: { color: index + 1 === monthHighlight ? "#dd765b" : "rgba(27,130,120,.45)", borderRadius: [3, 3, 0, 0] },
      })),
    }],
  });
}

function mountMlChart(m) {
  const el = document.getElementById("ml-compare");
  if (!el) return;
  const metricDefs = [["accuracy", "准确率", "#1b8278"], ["precision", "精确率", "#4c80ba"], ["recall", "召回率", "#d5a842"], ["f1", "F1", "#dd765b"]];
  mountChart("ml-compare", {
    tooltip: { trigger: "axis", textStyle: { fontSize: 11 } },
    legend: { top: 0, textStyle: { fontSize: 10 } },
    grid: { left: 44, right: 14, top: 34, bottom: 30 },
    xAxis: { type: "category", data: m.models.map((item) => displayModelName(item.name)), axisLabel: { fontSize: 10 }, axisLine: { lineStyle: { color: "#d7e2dd" } } },
    yAxis: { type: "value", max: 1, axisLabel: { fontSize: 10 }, splitLine: { lineStyle: { color: "#e7efec" } } },
    series: metricDefs.map(([key, label, color]) => ({
      name: label, type: "bar", barWidth: 14, data: m.models.map((item) => item[key]),
      itemStyle: { color, borderRadius: [3, 3, 0, 0] },
    })),
  });
}

function renderQuality() {
  const s = state.summary || {};
  const c = state.cleaning || {};
  const rules = Object.entries(s.quality_rules || {}).map(([label, value]) => [displayQualityRule(label), value]);
  const missingCells = Number(s.missing_values ?? c.missing_cells ?? 0);
  const qualityIssues = rules.some(([, value]) => value > 0) || missingCells > 0 || Number(c.invalid_rows) > 0 || Number(c.duplicate_rows) > 0;
  const qualityBadge = `<span class="quality-badge">${qualityIssues ? "存在待复核项" : "检查通过"}</span>`;
  const cleaningStats = [
    ["CSV 数据行", fmt(c.rows_before, 0)],
    ["保留记录数", fmt(c.rows_after, 0)],
    ["无效位置行", fmt(c.invalid_location_rows, 0)],
    ["格式错误行", fmt(c.malformed_rows, 0)],
    ["重复行", fmt(c.duplicate_rows, 0)],
    ["缺失单元格", fmt(c.missing_cells, 0)],
    ["城市数", `${fmt(c.cities_before, 0)} → ${fmt(c.cities_after, 0)}`],
    ["国家数", `${fmt(c.countries_before, 0)} → ${fmt(c.countries_after, 0)}`],
  ];
  const detail = c.detail || {};
  const rejectedRows = detail.rejected_rows || [];
  const cleaningCard = `<section class="content-card"><div class="card-heading"><div><p class="kicker">CLEANING REPORT</p><h2>数据解析与清洗报告</h2></div><span class="muted">展示 CSV 读取、缺失和去重统计，不自动修改气象数值</span></div><div class="profile-list">${cleaningStats.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("")}</div><div class="quality-note"><strong>无效行明细（最多显示 20 条）</strong><p>${esc(rejectedRows.slice(0, 20).join("；")) || "无"}</p></div></section>`;
  document.getElementById("page-root").innerHTML = `${pageHeader("DATA QUALITY", "数据质量检查", "查看字段边界、缺失值、重复记录与解析结果，便于评估当前数据集质量。", qualityBadge)}<div class="quality-grid"><section class="content-card"><div class="card-heading"><div><p class="kicker">VALIDATION RULES</p><h2>字段边界检查</h2></div></div><div class="quality-table">${rules.map(([label, value]) => `<div class="quality-check"><span class="check-icon ${value > 0 ? "issue" : "pass"}">${value > 0 ? "!" : "✓"}</span><div><strong>${esc(label)}</strong><small>${value > 0 ? "检测到异常记录，建议复核来源或清洗规则" : "未检测到越界记录"}</small></div><b class="${value > 0 ? "warning-text" : "ok-text"}">${fmt(value, 0)}</b></div>`).join("")}</div></section><section class="content-card quality-summary"><div class="card-heading"><div><p class="kicker">PROFILE SUMMARY</p><h2>数据集概况</h2></div></div><div class="profile-list"><div><span>原始文件</span><strong>${esc(s.source_file)}</strong></div><div><span>有效记录</span><strong>${fmt(s.records, 0)}</strong></div><div><span>重复行</span><strong>${fmt(s.duplicate_rows, 0)}</strong></div><div><span>缺失单元格</span><strong class="${missingCells > 0 ? "warning-text" : "ok-text"}">${fmt(missingCells, 0)}</strong></div><div><span>时间轴</span><strong>last_updated_epoch / UTC</strong></div></div><div class="quality-note"><strong>使用提示</strong><p>缺失单元格独立统计；当前解析会将缺失的数值字段按默认值参与分析，更换数据集时应检查缺失比例。推荐结果为规则评分，不代表天气预报。</p></div></section></div>${cleaningCard}`;
}

function renderSystem() {
  document.getElementById("page-root").innerHTML = `${pageHeader("SYSTEM INFORMATION", "系统说明", "项目部署、数据替换与算法逻辑说明，方便后续扩展为新的数据分析项目。", '<span class="data-badge">本地部署</span>')}<div class="system-grid"><section class="content-card system-hero"><span class="system-logo">WX</span><div><p class="kicker">PROJECT TITLE</p><h2>全球城市天气数据分析与出行推荐系统</h2><p>面向全球城市天气观测数据的分析型后台，提供数据概览、城市查询、规则推荐、EDA 图谱与质量检查。</p></div></section><section class="content-card"><div class="card-heading"><div><p class="kicker">PROJECT MODULES</p><h2>功能模块</h2></div></div><div class="module-list"><div><b>01</b><span><strong>数据仪表盘</strong><small>规模、趋势、天气状况、全球空间分布</small></span></div><div><b>02</b><span><strong>城市数据管理</strong><small>支持国家或城市关键词查询与分页浏览</small></span></div><div><b>03</b><span><strong>出行推荐中心</strong><small>四种策略的可解释规则评分</small></span></div><div><b>04</b><span><strong>EDA 与质量检查</strong><small>图表资产和数据边界检查集中呈现</small></span></div></div></section><section class="content-card data-replace"><div class="card-heading"><div><p class="kicker">DATA REPLACEMENT</p><h2>更换数据集</h2></div></div><p>将新的 CSV 文件放入 <code>data/raw/</code>，并保持后端必需字段名称；重新运行 EDA 脚本即可生成新的画像与图表。项目不依赖 Downloads 目录中的原始文件。</p><div class="code-line">python algorithm/run_eda.py --data data/raw/GlobalWeatherRepository.csv</div><div class="filter-bar" style="margin-top:14px"><button class="secondary-button" id="reload-data-button">↻ 重新加载数据集</button><span id="reload-data-message" class="muted">替换 data/raw 下的 CSV 后，点击即可热重载，无需重启服务</span></div></section><section class="content-card permission-card"><div class="card-heading"><div><p class="kicker">ROLE PERMISSIONS</p><h2>角色权限对照</h2></div><span class="muted">当前账号：${esc(displayRole(state.user?.role))}</span></div><div class="table-wrap"><table class="permission-table"><thead><tr><th>功能</th><th>管理员</th><th>普通用户</th></tr></thead><tbody><tr><td>数据仪表盘 / 城市数据 / 城市对比</td><td class="perm-yes">✓ 可用</td><td class="perm-yes">✓ 可用</td></tr><tr><td>智能推荐（推荐中心 / 相似城市 / 出行规划 / 出行助手）</td><td class="perm-yes">✓ 可用</td><td class="perm-yes">✓ 可用</td></tr><tr><td>分析洞察（EDA / 算法实验 / 数据质量）</td><td class="perm-yes">✓ 可用</td><td class="perm-yes">✓ 可用（训练为只读）</td></tr><tr><td>天气数据集管理（上传 / 预览 / 启用 / 删除）</td><td class="perm-yes">✓ 可用</td><td class="perm-no">— 无权限</td></tr><tr><td>模型重训（在线训练 / 状态轮询）</td><td class="perm-yes">✓ 可用</td><td class="perm-no">— 无权限</td></tr><tr><td>用户管理接口（/api/admin/users）</td><td class="perm-yes">✓ 可用</td><td class="perm-no">— 无权限</td></tr></tbody></table></div><div class="quality-note" style="margin-top:14px"><strong>权限说明</strong><p>管理员功能在导航栏中单独成组并标注 ADMIN；普通用户登录后不显示该分组，侧边栏底部会列出受限功能清单。直接访问受限页面将显示无权限提示。</p></div></section><section class="content-card account-card"><div class="card-heading"><div><p class="kicker">DEMO ACCESS</p><h2>当前登录账号</h2></div></div><div class="account-row"><span class="avatar large ${state.user?.role === "ADMIN" ? "is-admin" : ""}">${esc((displayUserName(state.user?.display_name) || "U").trim().slice(0, 1).toUpperCase())}</span><div><strong>${esc(state.user?.username || "admin")}</strong><small>${esc(displayRole(state.user?.role))}${state.user?.role === "ADMIN" ? " / 全部功能" : " / 查询 · 推荐 · 分析"}</small></div><span class="login-state">已登录</span></div></section></div>`;
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

// 管理员专属页面的无权限提示：说明原因、可做什么，并提供返回入口
function renderPermissionDenied(feature) {
  document.getElementById("page-root").innerHTML = `<div class="permission-panel"><span class="permission-lock">🔒</span><h2>需要管理员权限</h2><p>「${esc(feature)}」为管理员专属功能，当前账号（${esc(displayRole(state.user?.role))}）无访问权限。</p><div class="permission-actions"><button class="primary-button" id="permission-back">返回数据仪表盘</button><button class="secondary-button" id="permission-advice">查看出行助手</button></div><p class="permission-note">普通用户可使用：数据仪表盘、城市数据、城市对比、智能推荐、EDA 分析、算法实验（只读）、数据质量。</p></div>`;
  document.getElementById("permission-back").addEventListener("click", () => setRoute("/dashboard"));
  document.getElementById("permission-advice").addEventListener("click", () => setRoute("/advice"));
}

async function renderPage() {
  const root = document.getElementById("page-root");
  if (!root) return;
  root.innerHTML = '<div class="loading-state"><span class="spinner"></span>正在加载数据...</div>';
  if (state.route === "/datasets") {
    if (state.user?.role !== "ADMIN") return renderPermissionDenied("天气数据集");
    try { await loadDatasets(); } catch (error) { renderError(error.message); }
    return;
  }
  if (state.route === "/dashboard") return loadDashboard();
  if (state.route === "/city-data") { try { await loadCities(); } catch (error) { renderError(error.message); } return; }
  if (state.route === "/recommend") return loadRecommend();
  if (state.route === "/similar") { renderSimilar(); return; }
  if (state.route === "/plan") { renderPlan(); return; }
  if (state.route === "/compare") { renderCompare(); return; }
  if (state.route === "/advice") { renderAdvice(); return; }
  if (state.route === "/eda") {
    try {
      const data = await api("/api/eda");
      renderEda(data);
    } catch (error) { renderError(error.message); }
    return;
  }
  if (state.route === "/ml") { renderMlPage(); return; }
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
