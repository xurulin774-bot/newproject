// 实验三实验报告生成脚本（docx-js）
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, Header, Footer, PageNumber, AlignmentType, HeadingLevel,
  WidthType, BorderStyle, ShadingType,
} = require("docx");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const FIG = path.join(ROOT, "..", "figures");
const OUT = path.join(ROOT, "\u5b9e\u9a8c\u4e09_\u4eba\u5de5\u667a\u80fd\u7b97\u6cd5_\u5b9e\u9a8c\u62a5\u544a.docx");

// ---------- 工具 ----------
function pngSize(buf) {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}
function figure(file, caption, displayWidth) {
  const buf = fs.readFileSync(file);
  const { width, height } = pngSize(buf);
  const w = displayWidth || 540;
  const h = Math.round(w * height / width);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 },
      children: [new ImageRun({ data: buf, transformation: { width: w, height: h }, type: "png" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: caption, size: 21, bold: true, font: { ascii: "Times New Roman", eastAsia: "SimSun" } })],
    }),
  ];
}
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 140, line: 312 },
    children: [new TextRun({ text, bold: true, size: 28, color: "000000", font: { ascii: "Times New Roman", eastAsia: "SimHei" } })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text, bold: true, size: 24, color: "000000", font: { ascii: "Times New Roman", eastAsia: "SimHei" } })],
  });
}
function body(text, opts) {
  const o = opts || {};
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: o.noIndent ? undefined : { firstLine: 480 },
    spacing: { line: 312, after: o.after || 0 },
    children: [new TextRun({ text, size: 24, color: "000000", bold: !!o.bold, font: { ascii: "Times New Roman", eastAsia: "SimSun" } })],
  });
}
function codeBlock(lines) {
  return lines.map((line) => new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: 264, lineRule: "atLeast" },
    shading: { type: ShadingType.CLEAR, fill: "F5F5F5" },
    children: [new TextRun({ text: line.length ? line : " ", size: 18, color: "1A1A1A", font: { ascii: "Consolas", eastAsia: "SimSun" } })],
  }));
}
function cell(text, opts) {
  const o = opts || {};
  return new TableCell({
    width: { size: o.width, type: WidthType.PERCENTAGE },
    shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill } : undefined,
    margins: { top: 70, bottom: 70, left: 110, right: 110 },
    children: [new Paragraph({
      alignment: o.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { line: 276 },
      children: [new TextRun({ text, size: 21, bold: !!o.bold, color: "000000", font: { ascii: "Times New Roman", eastAsia: o.bold ? "SimHei" : "SimSun" } })],
    })],
  });
}
const tableBorders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: "555555" },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: "555555" },
  left: { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" },
  right: { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" },
  insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" },
};
function tableCaption(text) {
  return new Paragraph({
    keepNext: true,
    alignment: AlignmentType.CENTER,
    spacing: { before: 160, after: 80 },
    children: [new TextRun({ text, size: 21, bold: true, font: { ascii: "Times New Roman", eastAsia: "SimSun" } })],
  });
}

// ---------- 头部信息表 ----------
const infoRows = [
  ["\u5b9e\u9a8c\u79d1\u76ee", "\u4f20\u5a92\u6570\u636e\u7ba1\u7406\u4e0e\u5206\u6790", "\u5b9e\u9a8c\u540d\u79f0", "\u4eba\u5de5\u667a\u80fd\u7b97\u6cd5\uff08\u5b9e\u9a8c\u4e09\uff09"],
  ["\u5b66\u3000\u3000\u53f7", "\u3010\u5b66\u53f7\u3011", "\u59d3\u3000\u3000\u540d", "\u3010\u59d3\u540d\u3011"],
  ["\u73ed\u3000\u3000\u7ea7", "23\u8ba1\u79d1\uff08\u4e13\u8f6c\u672c\uff09X\u73ed", "\u5b9e\u9a8c\u65e5\u671f", "\u3010____\u5e74____\u6708____\u65e5\u3011"],
];
const infoTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: tableBorders,
  rows: infoRows.map((r) => new TableRow({
    cantSplit: true,
    children: r.map((text, i) => cell(text, { width: [14, 36, 14, 36][i], bold: i % 2 === 0, fill: i % 2 === 0 ? "EFEFEF" : undefined, center: i % 2 === 0 })),
  })),
});

// ---------- 实验数据 ----------
const metricsRows = [
  ["\u903b\u8f91\u56de\u5f52", "0.8435", "0.5404", "0.1870", "0.2778", "0.8419", "0.05"],
  ["\u51b3\u7b56\u6811", "0.8599", "0.5911", "0.4211", "0.4918", "0.8503", "0.12"],
  ["\u968f\u673a\u68ee\u6797", "0.8795", "0.7299", "0.3994", "0.5163", "0.8972", "0.93"],
  ["K\u8fd1\u90bb", "0.8575", "0.6297", "0.2789", "0.3866", "0.8489", "0.01"],
  ["\u6734\u7d20\u8d1d\u53f6\u65af", "0.6633", "0.3042", "0.8478", "0.4478", "0.8028", "0.01"],
  ["\u652f\u6301\u5411\u91cf\u673a", "0.8651", "0.6962", "0.2876", "0.4070", "0.8370", "5.54"],
  ["\u68af\u5ea6\u63d0\u5347", "0.8734", "0.7155", "0.3547", "0.4743", "0.8872", "9.59"],
  ["LightGBM", "0.8845", "0.7085", "0.4801", "0.5724", "0.9062", "0.92"],
];
const paramRows = [
  ["\u903b\u8f91\u56de\u5f52", "Pipeline(StandardScaler, LogisticRegression(max_iter=2000))"],
  ["\u51b3\u7b56\u6811", "DecisionTreeClassifier(max_depth=8, random_state=42)"],
  ["\u968f\u673a\u68ee\u6797", "RandomForestClassifier(n_estimators=200, n_jobs=-1, random_state=42)"],
  ["K\u8fd1\u90bb", "Pipeline(StandardScaler, KNeighborsClassifier(n_neighbors=15))"],
  ["\u6734\u7d20\u8d1d\u53f6\u65af", "GaussianNB()"],
  ["\u652f\u6301\u5411\u91cf\u673a", "Pipeline(StandardScaler, SVC(kernel='rbf', C=2.0))"],
  ["\u68af\u5ea6\u63d0\u5347", "GradientBoostingClassifier(n_estimators=200, learning_rate=0.05, max_depth=3)"],
  ["LightGBM", "LGBMClassifier(n_estimators=300, learning_rate=0.06, num_leaves=48)"],
];

const metricsTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: tableBorders,
  rows: [
    new TableRow({
      tableHeader: true, cantSplit: true,
      children: ["\u7b97\u6cd5", "\u51c6\u786e\u7387", "\u7cbe\u786e\u7387", "\u53ec\u56de\u7387", "F1", "AUC", "\u8017\u65f6(s)"].map((t, i) =>
        cell(t, { width: [16, 14, 14, 14, 14, 14, 14][i], bold: true, fill: "EFEFEF", center: true })),
    }),
    ...metricsRows.map((r) => new TableRow({
      cantSplit: true,
      children: r.map((t, i) => cell(t, {
        width: [16, 14, 14, 14, 14, 14, 14][i],
        bold: r[0] === "LightGBM",
        fill: r[0] === "LightGBM" ? "E8F2EF" : undefined,
        center: i > 0,
      })),
    })),
  ],
});
const paramTable = new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  borders: tableBorders,
  rows: paramRows.map((r) => new TableRow({
    cantSplit: true,
    children: [cell(r[0], { width: 22, bold: true, center: true }), cell(r[1], { width: 78 })],
  })),
});

// ---------- 正文 ----------
const children = [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 60, line: 420, lineRule: "atLeast" },
    children: [new TextRun({ text: "\u5b9e\u9a8c\u4e09\u3000\u4eba\u5de5\u667a\u80fd\u7b97\u6cd5\u3000\u5b9e\u9a8c\u62a5\u544a", bold: true, size: 32, color: "000000", font: { ascii: "Times New Roman", eastAsia: "SimHei" } })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: "\u5357\u4eac\u4f20\u5a92\u5b66\u9662\u667a\u80fd\u5a92\u4f53\u5de5\u7a0b\u5b66\u9662\u3000\u5b9e\u9a8c\u62a5\u544a\u518c", size: 21, color: "555555", font: { ascii: "Times New Roman", eastAsia: "SimSun" } })],
  }),
  infoTable,
  new Paragraph({ spacing: { after: 120 }, children: [] }),

  h1("\u4e00\u3001\u5b9e\u9a8c\u76ee\u7684"),
  body("1. \u638c\u63e1\u673a\u5668\u5b66\u4e60\u57fa\u672c\u6d41\u7a0b\uff1a\u6570\u636e\u9884\u5904\u7406\u3001\u7279\u5f81\u5de5\u7a0b\u3001\u6a21\u578b\u8bad\u7ec3\u4e0e\u8bc4\u4f30\u3002", { noIndent: true }),
  body("2. \u80fd\u4f7f\u7528 Python \u53ca\u76f8\u5173\u5e93\u5b9e\u73b0\u673a\u5668\u5b66\u4e60/\u63a8\u8350\u7b97\u6cd5\u7684\u7f16\u7801\u4e0e\u5bf9\u6bd4\u3002", { noIndent: true }),
  body("3. \u7406\u89e3\u5e38\u7528\u8bc4\u4f30\u6307\u6807\uff0c\u80fd\u5bf9\u6a21\u578b\u6548\u679c\u8fdb\u884c\u5206\u6790\u53ca\u53ef\u89c6\u5316\u3002", { noIndent: true, after: 120 }),

  h1("\u4e8c\u3001\u5b9e\u9a8c\u73af\u5883"),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: [
      ["\u786c\u3000\u3000\u4ef6", "\u4e2a\u4eba\u8ba1\u7b97\u673a\uff08Windows 11 x64\uff09"],
      ["\u8f6f\u3000\u3000\u4ef6", "Windows 11\u3001Python 3.12\u3001VS Code\u3001Git Bash\u3001Chrome / Edge \u6d4f\u89c8\u5668"],
      ["\u4e3b\u8981\u5e93", "pandas\u3001numpy\u3001scikit-learn 1.9.0\u3001LightGBM 4.7.0\u3001matplotlib 3.11\u3001seaborn 0.13\u3001joblib"],
      ["\u6570\u3000\u3000\u636e", "GlobalWeatherRepository.csv\uff08Kaggle \u516c\u5f00\u6570\u636e\u96c6\uff0c\u539f\u59cb 166,254 \u6761\u00d741 \u5b57\u6bb5\uff1b\u6e05\u6d17\u540e 165,952 \u6761\uff0c\u8986\u76d6 239 \u57ce / 191 \u56fd\uff09"],
    ].map((r) => new TableRow({
      cantSplit: true,
      children: [cell(r[0], { width: 18, bold: true, fill: "EFEFEF", center: true }), cell(r[1], { width: 82 })],
    })),
  }),

  h1("\u4e09\u3001\u5b9e\u9a8c\u5185\u5bb9\u53ca\u8981\u6c42"),
  body("\u672c\u5b9e\u9a8c\u57fa\u4e8e\u9879\u76ee\u300c\u5168\u7403\u57ce\u5e02\u5929\u6c14\u6570\u636e\u5206\u6790\u4e0e\u51fa\u884c\u63a8\u8350\u7cfb\u7edf\u300d\u5c55\u5f00\uff0c\u6309\u7167\u8bfe\u7a0b\u8981\u6c42\u5b8c\u6210\u4ee5\u4e0b\u5185\u5bb9\uff1a", { after: 80 }),
  body("1. \u5bf9\u7ed9\u5b9a\u6570\u636e\u96c6\u8fdb\u884c\u6570\u636e\u6e05\u6d17\u3001\u7f3a\u5931\u503c\u5904\u7406\u4e0e\u7279\u5f81\u5de5\u7a0b\uff1b\u9009\u53d6\u5e76\u5b9e\u73b0\u7b97\u6cd5\uff08\u5982\u534f\u540c\u8fc7\u6ee4\u3001\u5206\u7c7b\u3001\u805a\u7c7b\u7b49\uff09\u5b8c\u6210\u8bad\u7ec3\u4e0e\u9884\u6d4b\uff1b\u5bf9\u6a21\u578b\u8fdb\u884c\u8bc4\u4f30\uff08\u51c6\u786e\u7387\u3001\u53ec\u56de\u7387\u7b49\uff09\u5e76\u53ef\u89c6\u5316\u5bf9\u6bd4\u3002", { noIndent: true }),
  body("2. \u7b97\u6cd5\u7f16\u7801\u4e0d\u5c11\u4e8e 6 \u79cd\uff0c\u6bcf\u79cd\u9700\u542b\u8bad\u7ec3\u3001\u8bc4\u4f30\u4e0e\u7ed3\u679c\u8bf4\u660e\uff1b\u63d0\u4ea4\u5b8c\u6574\u53ef\u8fd0\u884c\u4ee3\u7801\uff08\u542b\u8fd0\u884c\u622a\u56fe\u4e0e\u7ed3\u679c\u5206\u6790\uff09\u3002", { noIndent: true }),
  body("3. \u6570\u636e\u9884\u5904\u7406\u3001\u7279\u5f81\u5de5\u7a0b\u56fe\u7247 10 \u5f20\u4ee5\u5185\uff0c\u6a21\u578b\u8bad\u7ec3\u4e0e\u8bc4\u4f30\u56fe\u6839\u636e\u5b9e\u9645\u60c5\u51b5\u7f16\u5199\u3002", { noIndent: true, after: 120 }),

  h1("\u56db\u3001\u4e3b\u8981\u64cd\u4f5c\u6b65\u9aa4"),

  h2("4.1 \u6570\u636e\u52a0\u8f7d\u4e0e\u6e05\u6d17"),
  body("\u5b9e\u9a8c\u4f7f\u7528\u7cfb\u7edf\u5185\u90e8\u5171\u4eab\u7684\u6e05\u6d17\u6a21\u5757 algorithm/data_cleaning.py\uff0c\u5728\u8bfb\u5165\u539f\u59cb CSV \u540e\u6267\u884c\u4e09\u7c7b\u6e05\u6d17\uff1aR1 \u56fd\u5bb6\u540d\u522b\u540d\u6807\u51c6\u5316\uff0820 \u9879\uff0c\u5982\u4fc4\u6587\u300c\u041f\u043e\u043b\u044c\u0448\u0430\u300d\u4e0e\u4e2d\u6587\u300c\u706b\u9e21\u300d\u7edf\u4e00\u4e3a Poland / Turkey\uff09\uff1bR2 \u540c\u540d\u57ce\u5e02\u591a\u6570\u7968\u8eab\u4efd\u6821\u9a8c\uff0c\u5254\u9664\u57ce\u5e02\u540d\u4e0e\u5750\u6807\u4e25\u91cd\u9519\u914d\u7684\u9519\u4e71\u884c 291 \u884c\uff0c\u53e6\u5254\u9664\u4eba\u5de5\u590d\u6838\u786e\u8ba4\u7684\u5783\u573e\u884c 10 \u7ec4\uff1bR3 \u540c\u56fd 20 km \u5185\u7684\u57ce\u5e02\u62fc\u5199\u5f52\u5e76 19 \u7ec4\uff08\u5982 Rangoon \u2192 Yangon\u3001Beijing Shi \u2192 Beijing\uff09\u3002\u6e05\u6d17\u540e\u6570\u636e\u7531 166,254 \u884c\u964d\u81f3 165,952 \u884c\uff0c\u56fd\u5bb6\u7531 211 \u964d\u81f3 191\uff0c\u57ce\u5e02\u7531 268 \u964d\u81f3 239\u3002\u6e05\u6d17\u53ea\u4fee\u6b63\u8eab\u4efd\u5b57\u6bb5\u5e76\u5254\u9664\u65e0\u6548\u884c\uff0c\u4e0d\u6539\u52a8\u4efb\u4f55\u6c14\u8c61\u6570\u503c\u3002"),

  h2("4.2 \u7279\u5f81\u5de5\u7a0b\u4e0e\u6807\u7b7e\u6784\u9020"),
  body("\u9884\u6d4b\u4efb\u52a1\u5b9a\u4e3a\u4e8c\u5206\u7c7b\uff1a\u6839\u636e\u6c14\u8c61\u72b6\u6001\u9884\u6d4b\u5f53\u524d\u662f\u5426\u964d\u6c34\uff0c\u6807\u7b7e\u89c4\u5219\u4e3a precip_mm > 0.1\u3002\u7c7b\u522b\u5206\u5e03\u4e3a\u65e0\u964d\u6c34 139,239 \u6761\u3001\u964d\u6c34 26,713 \u6761\uff08\u5360\u6bd4 16.1%\uff09\uff0c\u5b58\u5728\u4e00\u5b9a\u7c7b\u522b\u4e0d\u5e73\u8861\uff0c\u5982\u56fe 1 \u6240\u793a\u3002"),
  body("\u7279\u5f81\u5de5\u7a0b\u5171\u6784\u9020 17 \u7ef4\u7279\u5f81\uff1a\u57fa\u7840\u6c14\u8c61\u7279\u5f81\uff08\u6e29\u5ea6\u3001\u4f53\u611f\u6e29\u5ea6\u3001\u6e7f\u5ea6\u3001\u4e91\u91cf\u3001\u6c14\u538b\u3001\u98ce\u901f\u3001\u9635\u98ce\u3001\u80fd\u89c1\u5ea6\u3001\u7d2b\u5916\u7ebf\u3001PM2.5\u3001PM10\u3001\u81ed\u6c27\uff09\uff1b\u65f6\u95f4\u5468\u671f\u7f16\u7801 month_sin / month_cos\uff1b\u4ee5\u53ca\u4e09\u4e2a\u884d\u751f\u7279\u5f81\uff1a\u4f53\u611f\u6e29\u5dee feels_temp_diff\uff08\u53cd\u6620\u6e7f\u5ea6\u5bf9\u4f53\u611f\u7684\u5f71\u54cd\uff09\u3001\u9635\u98ce\u6bd4 gust_wind_ratio\uff08\u53cd\u6620\u5927\u6c14\u4e0d\u7a33\u5b9a\u7a0b\u5ea6\uff09\u3001\u6e7f\u5ea6\u4e91\u91cf\u4ea4\u4e92\u9879 dew_spread_proxy\u3002\u6240\u6709\u7279\u5f81\u7f3a\u5931\u503c\u6309\u4e2d\u4f4d\u6570\u586b\u8865\uff08\u672c\u6570\u636e\u96c6\u6e05\u6d17\u540e\u65e0\u7f3a\u5931\uff09\u3002"),
  ...codeBlock([
    "frame, _ = clean_weather_frame(frame)              # \u5171\u4eab\u6e05\u6d17\u6a21\u5757",
    "month = frame[\"observed_at_utc\"].dt.month",
    "frame[\"month_sin\"] = np.sin(2 * np.pi * month / 12)   # \u65f6\u95f4\u5468\u671f\u7f16\u7801",
    "frame[\"month_cos\"] = np.cos(2 * np.pi * month / 12)",
    "frame[\"feels_temp_diff\"] = frame[\"feels_like_celsius\"] - frame[\"temperature_celsius\"]",
    "frame[\"gust_wind_ratio\"] = frame[\"gust_kph\"] / frame[\"wind_kph\"].replace(0, np.nan)",
    "frame[\"dew_spread_proxy\"] = frame[\"humidity\"] * frame[\"cloud\"] / 100.0",
    "X = frame[FEATURES].apply(pd.to_numeric, errors=\"coerce\")",
    "y = (pd.to_numeric(frame[\"precip_mm\"], errors=\"coerce\").fillna(0) > 0.1).astype(int)",
  ]),
  ...figure(path.join(FIG, "ml_class_balance.png"), "\u56fe 1\u3000\u964d\u6c34\u6807\u7b7e\u7c7b\u522b\u5206\u5e03", 380),

  h2("4.3 \u6570\u636e\u5212\u5206\u4e0e\u6a21\u578b\u8bad\u7ec3"),
  body("\u4e3a\u63a7\u5236\u8bad\u7ec3\u5f00\u9500\u5e76\u4fdd\u8bc1\u53ef\u6bd4\u6027\uff0c\u91c7\u7528\u5206\u5c42\u62bd\u6837\u5f97\u5230\u8bad\u7ec3\u96c6 25,000 \u6761\u3001\u6d4b\u8bd5\u96c6 10,000 \u6761\uff08random_state=42\uff0c\u4fdd\u8bc1\u5b9e\u9a8c\u53ef\u590d\u73b0\uff09\u3002\u5728\u540c\u4e00\u5212\u5206\u4e0a\u8bad\u7ec3 8 \u79cd\u7b97\u6cd5\uff0c\u5173\u952e\u53c2\u6570\u5982\u8868 1 \u6240\u793a\uff0c\u5176\u4e2d\u903b\u8f91\u56de\u5f52\u3001K\u8fd1\u90bb\u3001\u652f\u6301\u5411\u91cf\u673a\u5bf9\u7279\u5f81\u91cf\u7eb2\u654f\u611f\uff0c\u7edf\u4e00\u5305\u88c5 StandardScaler \u6807\u51c6\u5316\u3002"),
  tableCaption("\u8868 1\u3000\u516b\u79cd\u7b97\u6cd5\u53ca\u5173\u952e\u53c2\u6570"),
  paramTable,
  body("\u6838\u5fc3\u8bad\u7ec3\u4e0e\u8bc4\u4f30\u4ee3\u7801\u5982\u4e0b\uff08\u5b8c\u6574\u4ee3\u7801\u89c1\u9879\u76ee algorithm/ml_train.py\uff0c\u53ef\u76f4\u63a5\u8fd0\u884c\uff09\uff1a", { after: 60 }),
  ...codeBlock([
    "for key, model in models.items():",
    "    started = time.time()",
    "    model.fit(X_train, y_train)                    # \u8bad\u7ec3",
    "    elapsed = time.time() - started",
    "    y_pred = model.predict(X_test)                 # \u9884\u6d4b",
    "    scores = model.predict_proba(X_test)[:, 1]     # \u6b63\u7c7b\u6982\u7387\uff08\u7528\u4e8e ROC/AUC\uff09",
    "    results.append({",
    "        \"name\": NAMES[key],",
    "        \"accuracy\": accuracy_score(y_test, y_pred),   # \u51c6\u786e\u7387",
    "        \"precision\": precision_score(y_test, y_pred), # \u7cbe\u786e\u7387",
    "        \"recall\": recall_score(y_test, y_pred),       # \u53ec\u56de\u7387",
    "        \"f1\": f1_score(y_test, y_pred),",
    "        \"auc\": roc_auc_score(y_test, scores),",
    "        \"train_seconds\": round(elapsed, 2),",
    "    })",
  ]),
  body("\u8fd0\u884c ml_train.py \u7684\u63a7\u5236\u53f0\u8f93\u51fa\u5982\u4e0b\uff1a", { after: 60 }),
  ...codeBlock([
    "[ml] \u52a0\u8f7d\u5e76\u6e05\u6d17\u6570\u636e ...",
    "[ml] \u7279\u5f81 17 \u7ef4\uff0c\u6837\u672c 165,952 \u6761\uff0c\u964d\u6c34\u5360\u6bd4 16.1%",
    "[ml] \u8bad\u7ec3\u96c6 25,000 / \u6d4b\u8bd5\u96c6 10,000\uff0c\u5f00\u59cb\u8bad\u7ec3 8 \u79cd\u7b97\u6cd5 ...",
    "  \u903b\u8f91\u56de\u5f52   \u51c6\u786e\u7387=0.8435 \u53ec\u56de\u7387=0.1870 F1=0.2778 AUC=0.8419 \u8017\u65f6=0.06s",
    "  \u51b3\u7b56\u6811     \u51c6\u786e\u7387=0.8599 \u53ec\u56de\u7387=0.4211 F1=0.4918 AUC=0.8503 \u8017\u65f6=0.13s",
    "  \u968f\u673a\u68ee\u6797   \u51c6\u786e\u7387=0.8795 \u53ec\u56de\u7387=0.3994 F1=0.5163 AUC=0.8972 \u8017\u65f6=0.93s",
    "  K\u8fd1\u90bb      \u51c6\u786e\u7387=0.8575 \u53ec\u56de\u7387=0.2789 F1=0.3866 AUC=0.8489 \u8017\u65f6=0.01s",
    "  \u6734\u7d20\u8d1d\u53f6\u65af \u51c6\u786e\u7387=0.6633 \u53ec\u56de\u7387=0.8478 F1=0.4478 AUC=0.8028 \u8017\u65f6=0.01s",
    "  \u652f\u6301\u5411\u91cf\u673a \u51c6\u786e\u7387=0.8651 \u53ec\u56de\u7387=0.2876 F1=0.4070 AUC=0.8370 \u8017\u65f6=5.54s",
    "  \u68af\u5ea6\u63d0\u5347   \u51c6\u786e\u7387=0.8734 \u53ec\u56de\u7387=0.3547 F1=0.4743 AUC=0.8872 \u8017\u65f6=9.59s",
    "  LightGBM   \u51c6\u786e\u7387=0.8845 \u53ec\u56de\u7387=0.4801 F1=0.5724 AUC=0.9062 \u8017\u65f6=0.92s",
    "[ml] \u5b8c\u6210\uff1a\u6700\u4f73\u6a21\u578b LightGBM\uff08F1=0.5724\uff09",
  ]),

  h2("4.4 \u6a21\u578b\u8bc4\u4f30\u4e0e\u7ed3\u679c\u5206\u6790"),
  body("\u516b\u79cd\u7b97\u6cd5\u5728\u540c\u4e00\u6d4b\u8bd5\u96c6\u4e0a\u7684\u8bc4\u4f30\u7ed3\u679c\u5982\u8868 2 \u4e0e\u56fe 2 \u6240\u793a\u3002\u6309 F1 \u9009\u53d6\uff0cLightGBM \u4e3a\u6700\u4f73\u6a21\u578b\uff08\u51c6\u786e\u7387 0.8845\u3001\u53ec\u56de\u7387 0.4801\u3001F1 0.5724\u3001AUC 0.9062\uff09\u3002", { after: 80 }),
  tableCaption("\u8868 2\u3000\u516b\u79cd\u7b97\u6cd5\u8bc4\u4f30\u6307\u6807\u660e\u7ec6\uff08\u6d4b\u8bd5\u96c6 10,000 \u6761\uff09"),
  metricsTable,
  ...figure(path.join(FIG, "ml_model_comparison.png"), "\u56fe 2\u3000\u516b\u79cd\u7b97\u6cd5\u56db\u9879\u6307\u6807\u5bf9\u6bd4"),
  ...figure(path.join(FIG, "ml_roc_curves.png"), "\u56fe 3\u3000\u516b\u79cd\u7b97\u6cd5 ROC \u66f2\u7ebf\u5bf9\u6bd4", 430),
  body("\u4ece\u7ed3\u679c\u770b\uff0c\u6811\u96c6\u6210\u7c7b\u65b9\u6cd5\uff08LightGBM\u3001\u968f\u673a\u68ee\u6797\u3001\u68af\u5ea6\u63d0\u5347\uff09\u6574\u4f53\u4f18\u4e8e\u7ebf\u6027\u4e0e\u6982\u7387\u6a21\u578b\uff0c\u8bf4\u660e\u964d\u6c34\u4e0e\u6c14\u8c61\u7279\u5f81\u4e4b\u95f4\u5b58\u5728\u660e\u663e\u7684\u975e\u7ebf\u6027\u5173\u7cfb\u4e0e\u7279\u5f81\u4ea4\u4e92\uff1b\u6734\u7d20\u8d1d\u53f6\u65af\u53ec\u56de\u7387\u9ad8\u8fbe 0.8478 \u4f46\u51c6\u786e\u7387\u4ec5 0.6633\uff0c\u662f\u5178\u578b\u7684\u7c7b\u522b\u4e0d\u5e73\u8861\u4e0b\u727a\u7272\u7cbe\u786e\u7387\u6362\u53ec\u56de\u7387\u7684\u884c\u4e3a\uff1b\u652f\u6301\u5411\u91cf\u673a\u4e0e\u68af\u5ea6\u63d0\u5347\u8bad\u7ec3\u8017\u65f6\u6700\u957f\uff0c\u800c LightGBM \u51ed\u501f\u76f4\u65b9\u56fe\u52a0\u901f\u5728\u7cbe\u5ea6\u4e0e\u6548\u7387\u4e4b\u95f4\u53d6\u5f97\u6700\u4f73\u5e73\u8861\u3002"),
  ...figure(path.join(FIG, "ml_confusion_matrix.png"), "\u56fe 4\u3000\u6700\u4f73\u6a21\u578b\uff08LightGBM\uff09\u6df7\u6dc6\u77e9\u9635", 400),
  body("\u6df7\u6dc6\u77e9\u9635\u663e\u793a\uff1a\u771f\u8d1f\u4f8b 8,072\u3001\u5047\u6b63\u4f8b 318\u3001\u5047\u8d1f\u4f8b 837\u3001\u771f\u6b63\u4f8b 773\u3002\u5047\u8d1f\u4f8b\uff08\u6709\u96e8\u62a5\u6210\u65e0\u96e8\uff09\u591a\u4e8e\u5047\u6b63\u4f8b\uff0c\u5bf9\u51fa\u884c\u573a\u666f\u800c\u8a00\u6f0f\u62a5\u4ee3\u4ef7\u66f4\u9ad8\uff0c\u540e\u7eed\u53ef\u901a\u8fc7\u4e0b\u8c03\u5206\u7c7b\u9608\u503c\u7528\u90e8\u5206\u7cbe\u786e\u7387\u6362\u53d6\u66f4\u9ad8\u53ec\u56de\u7387\u3002"),
  ...figure(path.join(FIG, "ml_feature_importance.png"), "\u56fe 5\u3000\u968f\u673a\u68ee\u6797\u4e0e LightGBM \u7279\u5f81\u91cd\u8981\u6027 Top10", 520),
  body("\u7279\u5f81\u91cd\u8981\u6027\u5206\u6790\u8868\u660e\uff0c\u6e7f\u5ea6\u3001\u4e91\u91cf\u3001\u80fd\u89c1\u5ea6\u53ca\u6e7f\u5ea6\u4e91\u91cf\u4ea4\u4e92\u9879\u662f\u964d\u6c34\u9884\u6d4b\u7684\u4e3b\u8981\u9a71\u52a8\u7279\u5f81\uff0c\u7b26\u5408\u6c14\u8c61\u5e38\u8bc6\uff1b\u65f6\u95f4\u5468\u671f\u7f16\u7801\u7279\u5f81\u8d21\u732e\u4e86\u5b63\u8282\u4fe1\u606f\uff0c\u8bf4\u660e\u7279\u5f81\u5de5\u7a0b\u4e2d\u7684\u5468\u671f\u5c55\u5f00\u662f\u6709\u6548\u7684\u3002"),

  h2("4.5 \u6a21\u578b\u5e94\u7528\uff1a\u6301\u4e45\u5316\u4e0e\u5728\u7ebf\u63a8\u7406"),
  body("\u4e3a\u8ba9\u6a21\u578b\u771f\u6b63\u4f5c\u7528\u4e8e\u7cfb\u7edf\uff0c\u8bad\u7ec3\u5b8c\u6210\u540e\u7528 joblib \u5c06\u6700\u4f73\u6a21\u578b\u6301\u4e45\u5316\u4e3a algorithm/ml_models/rain_model.joblib\uff0c\u540e\u7aef\u9996\u6b21\u8bf7\u6c42\u65f6\u61d2\u52a0\u8f7d\uff0c\u5e76\u4e25\u683c\u6309\u8bad\u7ec3\u9636\u6bb5\u76f8\u540c\u7684\u89c4\u5219\u6d3e\u751f\u7279\u5f81\uff0c\u5bf9\u5916\u63d0\u4f9b\u5b9e\u65f6\u964d\u6c34\u6982\u7387\u9884\u6d4b\u63a5\u53e3\uff1a\u57ce\u5e02\u6700\u65b0\u89c2\u6d4b\u9884\u6d4b\u3001\u624b\u52a8\u53c2\u6570\u9884\u6d4b\u3001\u5168\u57ce\u964d\u6c34\u98ce\u9669\u699c\u4e09\u4e2a\u63a5\u53e3\uff0c\u5e76\u5728\u7cfb\u7edf\u300c\u7b97\u6cd5\u5b9e\u9a8c\u300d\u9875\u4e0e\u300c\u57ce\u5e02\u5bf9\u6bd4\u300d\u9875\u5c55\u793a\u3002"),
  ...codeBlock([
    "# \u8bad\u7ec3\u4fa7\uff1a\u6301\u4e45\u5316\u6700\u4f73\u6a21\u578b\uff08ml_train.py\uff09",
    "joblib.dump(fitted[best[\"key\"]], model_dir / \"rain_model.joblib\")",
    "# \u670d\u52a1\u4fa7\uff1a\u61d2\u52a0\u8f7d\u4e0e\u5728\u7ebf\u63a8\u7406\uff08backend/app.py\uff09",
    "predictor = get_rain_predictor()",
    "engineered = engineer_weather_features(latest_row)   # \u4e0e\u8bad\u7ec3\u4e00\u81f4\u7684\u6d3e\u751f\u7279\u5f81",
    "probability = predictor.predict(engineered)[0]       # \u964d\u6c34\u6982\u7387",
  ]),
  ...figure(path.join(ROOT, "\u622a\u56fe_\u5728\u7ebf\u9884\u6d4b\u5668.png"), "\u56fe 6\u3000\u7cfb\u7edf\u300c\u7b97\u6cd5\u5b9e\u9a8c\u300d\u9875\uff1a\u5b9e\u65f6\u964d\u6c34\u6982\u7387\u9884\u6d4b\u5668", 540),
  ...figure(path.join(ROOT, "\u622a\u56fe_\u6a21\u578b\u5bf9\u6bd4.png"), "\u56fe 7\u3000\u7cfb\u7edf\u300c\u7b97\u6cd5\u5b9e\u9a8c\u300b\u9875\uff1a\u6027\u80fd\u5bf9\u6bd4\u4e0e\u8bc4\u4f30\u6307\u6807\u660e\u7ec6", 540),

  h1("\u4e94\u3001\u5b9e\u9a8c\u601d\u8003"),
  body("\u95ee\u9898\u4e00\uff1a\u7c7b\u522b\u4e0d\u5e73\u8861\u5bfc\u81f4\u53ec\u56de\u7387\u504f\u4f4e\u3002\u964d\u6c34\u6837\u672c\u4ec5\u5360 16.1%\uff0c\u903b\u8f91\u56de\u5f52\u76f4\u63a5\u8bad\u7ec3\u540e\u53ec\u56de\u7387\u53ea\u6709 0.187\uff0c\u5927\u91cf\u964d\u6c34\u6837\u672c\u88ab\u8bef\u5224\u4e3a\u65e0\u964d\u6c34\u3002\u89e3\u51b3\u529e\u6cd5\uff1a\u2460\u6570\u636e\u5212\u5206\u6539\u7528\u5206\u5c42\u62bd\u6837\uff0c\u4fdd\u8bc1\u8bad\u7ec3\u4e0e\u6d4b\u8bd5\u96c6\u6b63\u4f8b\u6bd4\u4f8b\u4e00\u81f4\uff1b\u2461\u6a21\u578b\u9009\u578b\u6539\u7528 F1 \u800c\u975e\u51c6\u786e\u7387\u4f5c\u4e3a\u4e3b\u6307\u6807\uff0c\u907f\u514d\u9009\u51fa\u53ea\u9884\u6d4b\u300c\u65e0\u964d\u6c34\u300d\u7684\u865a\u9ad8\u6a21\u578b\uff1b\u2462\u540e\u7eed\u53ef\u901a\u8fc7\u4e0b\u8c03\u5206\u7c7b\u9608\u503c\u3001\u8bbe\u7f6e\u7c7b\u522b\u6743\u91cd\uff08class_weight\uff09\u6216\u8fc7\u91c7\u6837\u8fdb\u4e00\u6b65\u63d0\u5347\u53ec\u56de\u7387\u3002\u3010\u6b64\u5904\u53ef\u63d2\u5165\u7c7b\u522b\u5206\u5e03\u4e0e\u53ec\u56de\u7387\u5bf9\u6bd4\u622a\u56fe\u3011"),
  body("\u95ee\u9898\u4e8c\uff1a\u90e8\u5206\u7b97\u6cd5\u8bad\u7ec3\u5f00\u9500\u8fc7\u5927\u3002SVM \u5728\u5341\u4e07\u7ea7\u6570\u636e\u4e0a\u8bad\u7ec3\u65f6\u95f4\u4e0d\u53ef\u63a5\u53d7\uff0c\u68af\u5ea6\u63d0\u5347\u4e5f\u9700\u8981 9.6 \u79d2\u3002\u89e3\u51b3\u529e\u6cd5\uff1a\u5bf9\u5168\u90e8\u6a21\u578b\u7edf\u4e00\u91c7\u7528\u5206\u5c42\u62bd\u6837\uff08\u8bad\u7ec3\u96c6 25,000 \u6761\uff09\u63a7\u5236\u89c4\u6a21\uff1b\u68af\u5ea6\u63d0\u5347\u901a\u8fc7\u9650\u5236\u6811\u6df1\u5ea6\u4e0e\u5b66\u4e60\u7387\u63a7\u5236\u62df\u5408\u590d\u6742\u5ea6\uff1b\u540c\u65f6\u5f15\u5165 LightGBM\uff0c\u5229\u7528\u5176\u76f4\u65b9\u56fe\u52a0\u901f\u4e0e leaf-wise \u751f\u957f\u7b56\u7565\uff0c\u5728\u7cbe\u5ea6\u66f4\u9ad8\u7684\u540c\u65f6\u8017\u65f6\u4ec5 0.92 \u79d2\u3002\u3010\u6b64\u5904\u53ef\u63d2\u5165\u8bad\u7ec3\u8017\u65f6\u5bf9\u6bd4\u622a\u56fe\u3011"),
  body("\u95ee\u9898\u4e09\uff1a\u524d\u7aef\u70ed\u529b\u56fe\u6e32\u67d3\u5d29\u6e83\u3002\u96c6\u6210 ECharts \u76f8\u5173\u6027\u70ed\u529b\u56fe\u65f6\uff0c\u9875\u9762\u62a5\u9519 Cannot read properties of undefined (reading '2') \u5bfc\u81f4\u6574\u9875\u65e0\u6cd5\u6e32\u67d3\u3002\u901a\u8fc7\u6d4f\u89c8\u5668\u63a7\u5236\u53f0\u5806\u6808\u5b9a\u4f4d\u5230 label formatter\uff1a\u70ed\u529b\u56fe\u6570\u636e\u9879\u4e3a\u6570\u7ec4 [x, y, value]\uff0c\u53c2\u6570\u5e94\u901a\u8fc7 params.value \u53d6\u503c\uff0c\u800c\u4e0d\u662f params.data.value\uff08\u6570\u7ec4\u4e0a\u5e76\u65e0 value \u5c5e\u6027\uff09\u3002\u4fee\u6539\u540e\u9875\u9762\u6e32\u67d3\u6b63\u5e38\u3002\u8be5\u95ee\u9898\u8bf4\u660e\u56fe\u8868\u5e93\u56de\u8c03\u51fd\u6570\u7684\u53c2\u6570\u7ed3\u6784\u9700\u8981\u4ed4\u7ec6\u6838\u5bf9\u6587\u6863\u3002\u3010\u6b64\u5904\u53ef\u63d2\u5165\u63a7\u5236\u53f0\u62a5\u9519\u622a\u56fe\u3011"),
  body("\u95ee\u9898\u56db\uff1a\u6d4f\u89c8\u5668\u7f13\u5b58\u5bfc\u81f4\u524d\u7aef\u6539\u52a8\u4e0d\u751f\u6548\u3002\u4fee\u6539\u56fe\u8868\u6837\u5f0f\u540e\u5237\u65b0\u9875\u9762\u4ecd\u663e\u793a\u65e7\u7248\u672c\uff0c\u56fe\u8868\u5bb9\u5668\u9ad8\u5ea6\u4e3a 0\u3002\u6392\u67e5\u53d1\u73b0\u540e\u7aef\u9759\u6001\u8d44\u6e90\u54cd\u5e94\u6ca1\u6709 Cache-Control \u5934\uff0c\u6d4f\u89c8\u5668\u5bf9\u65e7\u6587\u4ef6\u505a\u4e86\u542f\u53d1\u5f0f\u7f13\u5b58\u3002\u89e3\u51b3\u529e\u6cd5\uff1a\u540e\u7aef\u9759\u6001\u8d44\u6e90\u7edf\u4e00\u589e\u52a0 Cache-Control: no-store \u54cd\u5e94\u5934\uff0c\u5f3a\u5236\u6d4f\u89c8\u5668\u6bcf\u6b21\u62c9\u53d6\u6700\u65b0\u6587\u4ef6\u3002\u8be5\u95ee\u9898\u4e5f\u63d0\u9192\u6211\uff1a\u6392\u67e5\u524d\u7aef\u95ee\u9898\u65f6\u5e94\u5148\u7528 curl \u786e\u8ba4\u670d\u52a1\u7aef\u8fd4\u56de\u5185\u5bb9\uff0c\u518d\u6392\u67e5\u6d4f\u89c8\u5668\u884c\u4e3a\u3002\u3010\u6b64\u5904\u53ef\u63d2\u5165\u5f00\u53d1\u8005\u5de5\u5177\u7f51\u7edc\u9762\u677f\u622a\u56fe\u3011"),
  body("\u603b\u7ed3\uff1a\u672c\u5b9e\u9a8c\u5b8c\u6574\u8d70\u901a\u4e86\u300c\u6570\u636e\u6e05\u6d17 \u2192 \u7279\u5f81\u5de5\u7a0b \u2192 \u591a\u6a21\u578b\u8bad\u7ec3 \u2192 \u6307\u6807\u8bc4\u4f30 \u2192 \u53ef\u89c6\u5316\u5bf9\u6bd4 \u2192 \u6a21\u578b\u90e8\u7f72\u5e94\u7528\u300d\u7684\u673a\u5668\u5b66\u4e60\u5168\u6d41\u7a0b\u3002\u5b9e\u9a8c\u8fc7\u7a0b\u4e2d\u65e2\u6709\u7c7b\u522b\u4e0d\u5e73\u8861\u3001\u8bad\u7ec3\u6548\u7387\u8fd9\u7c7b\u673a\u5668\u5b66\u4e60\u9886\u57df\u7684\u5178\u578b\u95ee\u9898\uff0c\u4e5f\u6709\u5de5\u7a0b\u5de5\u7a0b\u5316\u843d\u5730\u65f6\u7684\u5b9e\u9645\u5de5\u7a0b\u95ee\u9898\uff0c\u901a\u8fc7\u67e5\u9605\u6587\u6863\u3001\u5206\u6790\u5806\u6808\u4e0e\u5c0f\u89c4\u6a21\u9a8c\u8bc1\u90fd\u5f97\u5230\u4e86\u89e3\u51b3\uff0c\u5bf9\u673a\u5668\u5b66\u4e60\u5de5\u7a0b\u5316\u7684\u5b8c\u6574\u94fe\u8def\u6709\u4e86\u76f4\u89c2\u8ba4\u8bc6\u3002", { after: 120 }),
];

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: { ascii: "Times New Roman", eastAsia: "SimSun" }, size: 24, color: "000000" },
        paragraph: { spacing: { line: 312 } },
      },
      heading1: {
        run: { font: { ascii: "Times New Roman", eastAsia: "SimHei" }, size: 28, bold: true, color: "000000" },
        paragraph: { spacing: { before: 320, after: 140, line: 312 } },
      },
      heading2: {
        run: { font: { ascii: "Times New Roman", eastAsia: "SimHei" }, size: 24, bold: true, color: "000000" },
        paragraph: { spacing: { before: 240, after: 120, line: 312 } },
      },
    },
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
      },
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ children: [PageNumber.CURRENT], size: 18 })],
        })],
      }),
    },
    children,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log("OK " + OUT);
});
