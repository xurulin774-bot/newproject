// 中文本地化字典：国家 / 城市 / 天气状况（与原生前端版本同源）
// displayXxx 先查精确映射，再查归一化（大小写/分隔符）映射，未命中回退原文
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
export { displayCountry, displayCity, displayCondition }
