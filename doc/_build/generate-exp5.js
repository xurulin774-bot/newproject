// 实验五实验报告生成脚本（docx-js，按学校报告册模板结构）
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, Header, Footer, PageNumber, AlignmentType, HeadingLevel,
  WidthType, BorderStyle, ShadingType,
} = require("docx");
const fs = require("fs");
const path = require("path");

const DOC = path.resolve(__dirname, "..");
const SHOT = (name) => path.join(DOC, name);
const OUT = path.join(DOC, "\u5b9e\u9a8c\u4e94_Vue\u524d\u7aef\u8bbe\u8ba1_\u5b9e\u9a8c\u62a5\u544a.docx");

function pngSize(buf) { return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }; }
function figure(file, caption, displayWidth) {
  const buf = fs.readFileSync(file);
  const { width, height } = pngSize(buf);
  const w = displayWidth || 540;
  const h = Math.round(w * height / width);
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 },
      children: [new ImageRun({ data: buf, transformation: { width: w, height: h }, type: "png" })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
      children: [new TextRun({ text: caption, size: 21, bold: true, font: { ascii: "Times New Roman", eastAsia: "SimSun" } })] }),
  ];
}
function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, keepNext: true, spacing: { before: 320, after: 140, line: 312 },
    children: [new TextRun({ text, bold: true, size: 28, color: "000000", font: { ascii: "Times New Roman", eastAsia: "SimHei" } })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text, bold: true, size: 24, color: "000000", font: { ascii: "Times New Roman", eastAsia: "SimHei" } })] });
}
function body(text, opts) {
  const o = opts || {};
  return new Paragraph({ alignment: AlignmentType.JUSTIFIED,
    indent: o.noIndent ? undefined : { firstLine: 480 },
    spacing: { line: 312, after: o.after || 0 },
    children: [new TextRun({ text, size: 24, color: "000000", bold: !!o.bold, font: { ascii: "Times New Roman", eastAsia: "SimSun" } })] });
}
function codeBlock(lines) {
  return lines.map((line) => new Paragraph({ alignment: AlignmentType.LEFT,
    spacing: { line: 264, lineRule: "atLeast" },
    shading: { type: ShadingType.CLEAR, fill: "F5F5F5" },
    children: [new TextRun({ text: line.length ? line : " ", size: 18, color: "1A1A1A", font: { ascii: "Consolas", eastAsia: "SimSun" } })] }));
}
const tableBorders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: "555555" },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: "555555" },
  left: { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" },
  right: { style: BorderStyle.SINGLE, size: 2, color: "AAAAAA" },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" },
  insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "CCCCCC" },
};
function cell(text, opts) {
  const o = opts || {};
  return new TableCell({ width: { size: o.width, type: WidthType.PERCENTAGE },
    shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill } : undefined,
    margins: { top: 70, bottom: 70, left: 110, right: 110 },
    children: [new Paragraph({ alignment: o.center ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { line: 276 },
      children: [new TextRun({ text, size: 20, bold: !!o.bold, color: "000000", font: { ascii: "Times New Roman", eastAsia: o.bold ? "SimHei" : "SimSun" } })] })] });
}
function tableCaption(text) {
  return new Paragraph({ keepNext: true, alignment: AlignmentType.CENTER, spacing: { before: 160, after: 80 },
    children: [new TextRun({ text, size: 21, bold: true, font: { ascii: "Times New Roman", eastAsia: "SimSun" } })] });
}
function makeTable(headers, rows, widths, opts) {
  const o = opts || {};
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: tableBorders,
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true,
        children: headers.map((t, i) => cell(t, { width: widths[i], bold: true, fill: "EFEFEF", center: true })) }),
      ...rows.map((r) => new TableRow({ cantSplit: true,
        children: r.map((t, i) => cell(t, { width: widths[i], center: o.centerCols ? o.centerCols.includes(i) : false, bold: o.boldFirstCol && i === 0 })) })),
    ] });
}

// ---------- 头部信息 ----------
const infoTable = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: tableBorders,
  rows: [
    ["\u5b9e\u9a8c\u79d1\u76ee", "\u4f20\u5a92\u6570\u636e\u7ba1\u7406\u4e0e\u5206\u6790", "\u5b9e\u9a8c\u540d\u79f0", "Vue\u524d\u7aef\u8bbe\u8ba1\uff08\u5b9e\u9a8c\u4e94\uff09"],
    ["\u5b66\u3000\u3000\u53f7", "Z202508090307", "\u59d3\u3000\u3000\u540d", "\u6768\u6587\u5e05"],
    ["\u73ed\u3000\u3000\u7ea7", "23\u8ba1\u79d1\uff08\u4e13\u8f6c\u672c\uff09X\u73ed", "\u5b9e\u9a8c\u65e5\u671f", "2026.10.23"],
  ].map((r) => new TableRow({ cantSplit: true,
    children: r.map((text, i) => cell(text, { width: [14, 36, 14, 36][i], bold: i % 2 === 0, fill: i % 2 === 0 ? "EFEFEF" : undefined, center: i % 2 === 0 })) })) });

// ---------- 表格数据 ----------
const envTable = makeTable(
  ["\u7c7b\u522b", "\u73af\u5883\u4e0e\u5de5\u5177", "\u7528\u9014"],
  [
    ["\u64cd\u4f5c\u7cfb\u7edf", "Windows 11 x64", "\u524d\u7aef\u5f00\u53d1\u4e0e\u8c03\u8bd5"],
    ["\u5f00\u53d1\u5de5\u5177", "VS Code\u3001IntelliJ IDEA\uff08\u540e\u7aef\uff09", "\u4ee3\u7801\u7f16\u5199"],
    ["\u8fd0\u884c\u65f6", "Node.js v24.16.0\u3001npm 11.13", "\u4f9d\u8d56\u5b89\u88c5\u4e0e\u6784\u5efa"],
    ["\u524d\u7aef\u6846\u67b6", "Vue 3.5 + Vite 8 + Vue Router 4.6", "\u7ec4\u4ef6\u5316\u5f00\u53d1\u3001SPA \u8def\u7531"],
    ["\u7f51\u7edc\u4e0e\u56fe\u8868", "Axios 1.20\u3001ECharts 6.1", "\u63a5\u53e3\u8c03\u7528\u3001\u6570\u636e\u53ef\u89c6\u5316"],
    ["\u8c03\u8bd5\u5de5\u5177", "Chrome \u5f00\u53d1\u8005\u5de5\u5177\uff08F12\uff09", "DOM\u3001\u7f51\u7edc\u4e0e\u63a7\u5236\u53f0\u6392\u67e5"],
    ["\u540e\u7aef\u670d\u52a1", "Spring Boot\uff08127.0.0.1:8091\uff0c\u5b9e\u9a8c\u56db\uff09", "\u63a5\u53e3\u8054\u8c03"],
  ],
  [16, 46, 38], { boldFirstCol: true });

const pageTable = makeTable(
  ["\u8def\u7531", "\u9875\u9762\u7ec4\u4ef6", "\u529f\u80fd\u4e0e\u56fe\u8868"],
  [
    ["/login", "Login.vue", "\u767b\u5f55\u8868\u5355\uff0c\u8c03 /api/auth/login \u5199\u5165\u767b\u5f55\u6001"],
    ["/dashboard", "Dashboard.vue", "\u6307\u6807\u5361\u7247\uff1b\u6298\u7ebf\u56fe\uff08180 \u5929\u8d8b\u52bf + P10-P90 \u533a\u95f4\u5e26\uff09\u3001\u67f1\u72b6\u56fe\u3001\u73af\u5f62\u5360\u6bd4\u56fe"],
    ["/cities", "Cities.vue", "\u5173\u952e\u8bcd\u68c0\u7d22 + \u8868\u683c\u5206\u9875\uff0c\u542b\u52a0\u8f7d\u4e0e\u7a7a\u6570\u636e\u515c\u5e95"],
    ["/datasets", "Datasets.vue", "\u6570\u636e\u96c6\u7248\u672c\u5217\u8868\u3001\u4e0a\u4f20\u542f\u7528\u4e0e\u5220\u9664"],
    ["/compare", "Compare.vue", "1~4 \u57ce\u9010\u6708\u6c14\u6e29\u66f2\u7ebf\u3001\u6307\u6807\u96f7\u8fbe\u3001\u8d8b\u52bf\u5916\u63a8"],
    ["/recommend", "Recommend.vue", "\u56db\u79cd\u7b56\u7565\u5207\u6362\u7684\u63a8\u8350\u699c\u56fe\u4e0e\u5361\u7247"],
    ["/similar", "Similar.vue", "\u76ee\u6807\u57ce\u5e02\u9010\u6708\u6c14\u5019\u66f2\u7ebf\u4e0e\u76f8\u4f3c\u5ea6\u699c"],
    ["/plan", "Plan.vue", "12 \u6708\u00d74 \u7b56\u7565\u7684\u5386\u53f2\u540c\u671f\u8bc4\u5206\u5361\u7247"],
    ["/advice", "Advice.vue", "\u8bc4\u5206\u4eea\u8868\u76d8\u3001\u5173\u952e\u4e8b\u5b9e\u4e0e\u516d\u9879\u751f\u6d3b\u6307\u6570"],
    ["/eda", "Eda.vue", "EDA \u56fe\u8c31\uff1a\u4e5d\u5f20\u5206\u6790\u56fe\u7f51\u683c\uff08\u53ef\u70b9\u51fb\u653e\u5927\uff09"],
    ["/ml", "Ml.vue", "8 \u7b97\u6cd5\u5bf9\u6bd4\u8868\u3001\u964d\u6c34\u6982\u7387\u9884\u6d4b\u5668\u4e0e\u98ce\u9669\u699c"],
    ["/quality", "Quality.vue", "\u8fb9\u754c\u89c4\u5219\u68c0\u67e5\u4e0e\u6570\u636e\u6e05\u6d17\u62a5\u544a"],
    ["/system", "System.vue", "\u6a21\u5757\u8bf4\u660e\u3001\u5f00\u53d1\u90e8\u7f72\u4e0e\u6570\u636e\u96c6\u66f4\u6362\u6307\u5f15"],
  ],
  [14, 20, 66]);

const apiTable = makeTable(
  ["\u8bf7\u6c42", "\u63a5\u53e3", "\u6570\u636e\u7528\u9014"],
  [
    ["GET", "/api/summary", "\u6982\u89c8\u6307\u6807\u5361\u7247\uff08\u8bb0\u5f55\u6570\u3001\u56fd\u5bb6\u6570\u3001\u5747\u6e29\u3001PM2.5\uff09"],
    ["GET", "/api/trend?days=180", "\u6298\u7ebf\u56fe\uff1a\u65e5\u5747\u6e29\u4e0e P10/P90 \u5206\u4f4d"],
    ["GET", "/api/conditions?limit=8", "\u67f1\u72b6\u56fe\u4e0e\u997c\u56fe\uff1a\u72b6\u51b5\u9891\u6b21\u4e0e\u5360\u6bd4"],
    ["GET", "/api/cities?q=&limit=100", "\u57ce\u5e02\u8868\u683c\u4e0e\u51fa\u884c\u52a9\u624b\u57ce\u5e02\u4e0b\u62c9"],
    ["GET", "/api/advice?k=&month=", "\u8bc4\u5206\u4eea\u8868\u76d8\u3001\u516d\u9879\u751f\u6d3b\u6307\u6570"],
    ["POST", "/api/auth/login", "\u767b\u5f55\u8ba4\u8bc1\uff0c\u5199\u5165\u4f1a\u8bdd"],
    ["POST", "/api/datasets/upload", "\u4e0a\u4f20\u65b0\u6570\u636e\u96c6 CSV\uff08\u6821\u9a8c\u540e\u81ea\u52a8\u542f\u7528\uff09"],
    ["GET/DELETE", "/api/datasets\u3001/api/datasets/{id}", "\u6570\u636e\u96c6\u7248\u672c\u5217\u8868\u4e0e\u5220\u9664"],
  ],
  [10, 34, 56]);

// ---------- 正文 ----------
const children = [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60, line: 420, lineRule: "atLeast" },
    children: [new TextRun({ text: "\u5b9e\u9a8c\u4e94\u3000Vue\u524d\u7aef\u8bbe\u8ba1\u3000\u5b9e\u9a8c\u62a5\u544a", bold: true, size: 32, color: "000000", font: { ascii: "Times New Roman", eastAsia: "SimHei" } })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text: "\u5357\u4eac\u4f20\u5a92\u5b66\u9662\u667a\u80fd\u5a92\u4f53\u5de5\u7a0b\u5b66\u9662\u3000\u5b9e\u9a8c\u62a5\u544a\u518c", size: 21, color: "555555", font: { ascii: "Times New Roman", eastAsia: "SimSun" } })] }),
  infoTable,
  new Paragraph({ spacing: { after: 120 }, children: [] }),

  h1("\u4e00\u3001\u5b9e\u9a8c\u76ee\u7684"),
  body("1. \u719f\u6089 Vue \u6846\u67b6\u7684\u57fa\u672c\u7ed3\u6784\u4e0e\u6838\u5fc3\u6982\u5ff5\uff08\u7ec4\u4ef6\u3001\u6570\u636e\u7ed1\u5b9a\u3001\u6307\u4ee4\u3001\u751f\u547d\u5468\u671f\u3001\u8def\u7531\u7b49\uff09\uff0c\u5b8c\u6210\u524d\u7aef\u9879\u76ee\u7684\u7ec4\u4ef6\u5212\u5206\u4e0e\u9875\u9762\u5b9e\u73b0\u3002", { noIndent: true }),
  body("2. \u638c\u63e1\u57fa\u4e8e Vue \u7684\u540e\u53f0\u9996\u9875\uff08Dashboard\uff09\u5f00\u53d1\u6d41\u7a0b\uff0c\u96c6\u6210 ECharts \u5b8c\u6210\u4e1a\u52a1\u6570\u636e\u7684\u53ef\u89c6\u5316\u5c55\u793a\uff08\u8d8b\u52bf\u56fe\u3001\u67f1\u72b6\u56fe\u3001\u5360\u6bd4\u56fe\uff09\u3002", { noIndent: true }),
  body("3. \u7406\u89e3\u524d\u540e\u7aef\u63a5\u53e3\u5bf9\u63a5\u903b\u8f91\uff0c\u4f7f\u7528 Axios \u5c01\u88c5\u8c03\u7528 Spring Boot \u63a5\u53e3\uff0c\u5b8c\u6210\u6570\u636e\u7684\u83b7\u53d6\u3001\u89e3\u6790\u4e0e\u52a8\u6001\u6e32\u67d3\u3002", { noIndent: true }),
  body("4. \u57f9\u517b\u6807\u51c6\u5316\u524d\u7aef\u5f00\u53d1\u601d\u7ef4\uff0c\u72ec\u7acb\u6392\u67e5\u8de8\u57df\u3001\u6837\u5f0f\u9002\u914d\u3001\u72b6\u6001\u4e22\u5931\u7b49\u5e38\u89c1\u95ee\u9898\u3002", { noIndent: true, after: 120 }),

  h1("\u4e8c\u3001\u5b9e\u9a8c\u73af\u5883"),
  envTable,

  h1("\u4e09\u3001\u5b9e\u9a8c\u5185\u5bb9\u53ca\u8981\u6c42"),
  body("1. \u5b8c\u6210\u540e\u53f0\u9996\u9875\uff08Dashboard\uff09\u5f00\u53d1\uff1a\u96c6\u6210 ECharts\uff0c\u5b9e\u73b0\u5173\u952e\u4e1a\u52a1\u6570\u636e\u7684\u53ef\u89c6\u5316\uff08\u6570\u636e\u6982\u89c8\u3001\u8d8b\u52bf\u56fe\u3001\u5360\u6bd4\u56fe\uff09\uff0c\u5e03\u5c40\u5408\u7406\u3001\u54cd\u5e94\u5f0f\u9002\u914d\u826f\u597d\u3002", { noIndent: true }),
  body("2. \u5b9e\u73b0\u4fa7\u8fb9\u5bfc\u822a\u680f\uff1a\u5e03\u5c40\u9002\u914d\u3001\u83dc\u5355\u6e32\u67d3\u3001\u8def\u7531\u8df3\u8f6c\u3001\u9009\u4e2d\u9ad8\u4eae\u8054\u52a8\uff0c\u591a\u7ea7\u83dc\u5355\u5c55\u5f00\u6536\u8d77\u6d41\u7545\uff0c\u9875\u9762\u5237\u65b0\u4e0e\u8def\u7531\u5207\u6362\u65f6\u9ad8\u4eae\u72b6\u6001\u540c\u6b65\u6b63\u5e38\u3002", { noIndent: true }),
  body("3. \u9875\u9762\u5177\u5907\u5b8c\u5584\u7684\u4ea4\u4e92\u4f53\u9a8c\uff08\u52a0\u8f7d\u52a8\u753b\u3001\u5f02\u5e38\u63d0\u793a\u3001\u7a7a\u6570\u636e\u515c\u5e95\uff09\uff0c\u719f\u7ec3\u524d\u540e\u7aef\u8054\u8c03\u6d41\u7a0b\uff0c\u7406\u89e3\u63a5\u53e3\u5c01\u88c5\u3001\u8def\u7531\u8054\u52a8\u4e0e\u52a8\u6001\u6e32\u67d3\u7684\u6838\u5fc3\u539f\u7406\u3002", { noIndent: true, after: 120 }),

  h1("\u56db\u3001\u4e3b\u8981\u64cd\u4f5c\u6b65\u9aa4"),

  h2("4.1 \u9879\u76ee\u642d\u5efa\u4e0e\u9875\u9762\u7ec4\u4ef6\u5316"),
  body("\u4f7f\u7528 create-vite \u811a\u624b\u67b6\u521b\u5efa Vue 3 \u5de5\u7a0b\uff08Vite 8 \u6784\u5efa\uff09\uff0c\u5b89\u88c5 vue-router\u3001axios\u3001echarts \u4e09\u4e2a\u8fd0\u884c\u65f6\u4f9d\u8d56\u3002\u6309\u300c\u5e03\u5c40\u58f3 App.vue + \u89c6\u56fe\u7ec4\u4ef6 views + \u8def\u7531 router + \u63a5\u53e3\u5c01\u88c5 api\u300d\u7ec4\u7ec7\u76ee\u5f55\uff1aApp.vue \u627f\u62c5\u4fa7\u8fb9\u5bfc\u822a\u4e0e\u9876\u680f\u5e03\u5c40\uff0c\u56db\u4e2a\u8def\u7531\u9875\u9762\u5982\u8868 1 \u6240\u793a\u3002", { after: 80 }),
  body("\u9875\u9762\u6587\u6848\u4e0e\u6570\u636e\u5c55\u793a\u505a\u4e86\u4e2d\u6587\u672c\u5730\u5316\uff1a\u79fb\u690d\u4e86\u4e0e\u539f\u7248\u540c\u6e90\u7684\u56fd\u5bb6/\u57ce\u5e02/\u5929\u6c14\u72b6\u51b5\u4e09\u4efd\u5b57\u5178\uff08\u7cbe\u786e\u6620\u5c04+\u5f52\u4e00\u5316\u67e5\u627e+\u56de\u9000\u539f\u6587\uff09\uff0c\u4eea\u8868\u76d8\u56fe\u8868\u8f74\u3001\u63a8\u8350\u5361\u7247\u3001\u98ce\u9669\u699c\u5747\u4ee5\u4e2d\u6587\u5c55\u793a\uff0c\u6307\u6807\u5361\u7247\u914d\u5957\u56fe\u6807\u3002\u540c\u65f6\u79fb\u690d\u4e86\u6570\u636e\u96c6\u7ba1\u7406\u9875\uff1a\u652f\u6301\u4e0a\u4f20\u65b0 CSV\uff08FormData \u591a\u90e8\u4ef6\u4e0a\u4f20\u81f3 /api/datasets/upload\uff0c\u540e\u7aef\u5b57\u6bb5\u6821\u9a8c\u901a\u8fc7\u540e\u81ea\u52a8\u542f\u7528\uff09\u3001\u7248\u672c\u5217\u8868\u4e0e\u5220\u9664\u3002", { after: 80 }),
  tableCaption("\u8868 1\u3000\u8def\u7531\u4e0e\u9875\u9762\u7ec4\u4ef6"),
  pageTable,

  h2("4.2 \u9996\u9875\uff08Dashboard\uff09\u4e0e ECharts \u53ef\u89c6\u5316"),
  body("Dashboard \u9875\u5728 onMounted \u751f\u547d\u5468\u671f\u4e2d\u7528 Promise.all \u5e76\u884c\u8bf7\u6c42\u4e09\u4e2a\u63a5\u53e3\uff0c\u5c06\u6570\u636e\u5206\u522b\u6e32\u67d3\u4e3a\u6307\u6807\u5361\u7247\u3001\u8d8b\u52bf\u6298\u7ebf\u56fe\uff08\u542b P10-P90 \u5806\u53e0\u533a\u95f4\u5e26\u4e0e dataZoom \u7f29\u653e\uff09\u3001\u72b6\u51b5\u5206\u5e03\u67f1\u72b6\u56fe\u4e0e\u4e3b\u8981\u72b6\u51b5\u5360\u6bd4\u73af\u5f62\u56fe\uff1b\u7ec4\u4ef6\u5378\u8f7d\u65f6 dispose \u56fe\u8868\u5b9e\u4f8b\u5e76\u79fb\u9664 resize \u76d1\u542c\uff0c\u907f\u514d\u5185\u5b58\u6cc4\u6f0f\u3002\u6838\u5fc3\u4ee3\u7801\u5982\u4e0b\uff1a", { after: 60 }),
  ...codeBlock([
    "onMounted(async () => {",
    "  const [summary, trend, conditions] = await Promise.all([",
    "    http.get('/api/summary'),",
    "    http.get('/api/trend', { params: { days: 180 } }),",
    "    http.get('/api/conditions', { params: { limit: 8 } }),",
    "  ])",
    "  loading.value = false",
    "  await nextTick()                 // \u7b49 v-if \u5bb9\u5668\u771f\u6b63\u6e32\u67d3\u540e\u518d\u521d\u59cb\u5316\u56fe\u8868",
    "  renderCharts(trend.items, conditions.items)",
    "})",
  ]),
  body("Axios \u8bf7\u6c42\u5c01\u88c5\u5728 src/api/http.js\uff1a\u7edf\u4e00\u8d85\u65f6\u3001\u643a\u5e26\u4f1a\u8bdd Cookie\uff08withCredentials\uff09\uff0c\u54cd\u5e94\u62e6\u622a\u5668\u628a\u540e\u7aef\u7edf\u4e00\u8fd4\u56de\u7ed3\u6784\u4e2d\u7684 code \u5f02\u5e38\u4e0e HTTP \u9519\u8bef\u8f6c\u6362\u4e3a\u53ef\u8bfb\u7684 Error\uff0c401 \u65f6\u81ea\u52a8\u6e05\u7406\u767b\u5f55\u6001\u5e76\u8df3\u8f6c\u767b\u5f55\u9875\uff1b\u7ec4\u4ef6\u53ea\u9762\u5411 request() \u7f16\u7a0b\uff0c\u4e0d\u76f4\u63a5\u64cd\u4f5c axios \u5b9e\u4f8b\u3002\u672c\u9875\u9762\u4e0e\u540e\u7aef\u7684\u5bf9\u5e94\u5173\u7cfb\u5982\u8868 2 \u6240\u793a\u3002", { after: 80 }),
  tableCaption("\u8868 2\u3000\u524d\u7aef\u9875\u9762\u4e0e\u540e\u7aef\u63a5\u53e3\u5bf9\u5e94\u5173\u7cfb"),
  apiTable,

  h2("4.3 \u4fa7\u8fb9\u5bfc\u822a\u680f\u4e0e\u8def\u7531\u8054\u52a8"),
  body("\u5bfc\u822a\u6570\u636e\u62bd\u53d6\u4e3a navGroups \u5206\u7ec4\u6570\u7ec4\uff08\u6570\u636e\u603b\u89c8 / \u6570\u636e\u7ba1\u7406 / \u667a\u80fd\u63a8\u8350\u4e09\u7ec4\uff09\uff0cApp.vue \u7528\u4e24\u5c42 v-for \u6e32\u67d3\u591a\u7ea7\u83dc\u5355\uff1b\u83dc\u5355\u9879\u4f7f\u7528 router-link \u5b9e\u73b0\u8df3\u8f6c\uff0c\u9ad8\u4eae\u901a\u8fc7\u6bd4\u8f83 route.path \u4e0e\u83dc\u5355 path \u52a8\u6001\u7ed1\u5b9a active \u7c7b\u5e76\u663e\u793a\u9ec4\u8272\u6807\u8bb0\u6761\uff0c\u8def\u7531\u5207\u6362\u65f6\u9ad8\u4eae\u81ea\u52a8\u8054\u52a8\u3002\u9876\u680f\u9762\u5305\u5c51\u8bfb\u53d6\u8def\u7531 meta.title\u3002", { after: 60 }),
  ...codeBlock([
    "// router/index.js\uff1ahash \u6a21\u5f0f + \u5168\u5c40\u5b88\u536b\uff0c\u89e3\u51b3\u5237\u65b0\u540e\u72b6\u6001\u4e22\u5931",
    "const router = createRouter({ history: createWebHashHistory(), routes })",
    "router.beforeEach((to) => {",
    "  if (to.meta.public) return true",
    "  return localStorage.getItem('wx_user') ? true : { path: '/login' }",
    "})",
  ]),

  h2("4.4 \u8c03\u8bd5\u4e0e\u524d\u540e\u7aef\u8054\u8c03"),
  body("\u8de8\u57df\u5904\u7406\uff1a\u5f00\u53d1\u65f6 Vite \u8fd0\u884c\u5728 5173 \u7aef\u53e3\uff0c\u540e\u7aef Spring Boot \u5728 8091\uff0c\u6d4f\u89c8\u5668\u76f4\u63a5\u8c03\u7528\u4f1a\u56e0\u540c\u6e90\u7b56\u7565\u88ab\u6d4f\u89c8\u5668\u62e6\u622a\u3002\u89e3\u51b3\u65b9\u6848\u662f\u5728 vite.config.js \u914d\u7f6e server.proxy\uff0c\u5c06 /api \u524d\u7f00\u8f6c\u53d1\u5230 8091\uff0c\u524d\u7aef\u4ee3\u7801\u59cb\u7ec8\u4ee5\u540c\u6e90\u76f8\u5bf9\u8def\u5f84\u8bf7\u6c42\uff0c\u751f\u4ea7\u73af\u5883\u6253\u5305\u540e\u540c\u6e90\u90e8\u7f72\u4e5f\u65e0\u9700\u6539\u52a8\u3002\u8054\u8c03\u9a8c\u8bc1\uff1a", { after: 60 }),
  ...codeBlock([
    "$ curl http://localhost:5173/api/health",
    "{\"status\":\"ok\",\"records\":166253,",
    " \"project\":\"Global Weather Analytics and Recommendation System\"}",
    "                                                  # HTTP 200\uff0c\u4ee3\u7406\u8054\u8c03\u6b63\u5e38",
    "$ npm run build",
    "\u2713 built in 460ms                                # \u751f\u4ea7\u6784\u5efa\u901a\u8fc7",
  ]),
  body("\u9875\u9762\u8fd0\u884c\u6548\u679c\u4e0e\u6570\u636e\u53ef\u89c6\u5316\u7ed3\u679c\u5982\u56fe 1 \u81f3\u56fe 4 \u6240\u793a\uff1a\u767b\u5f55\u9875\u9a8c\u8bc1\u540e\u8fdb\u5165\u4eea\u8868\u76d8\uff0c\u4fa7\u8fb9\u680f\u9ad8\u4eae\u968f\u8def\u7531\u5207\u6362\u8054\u52a8\uff1b\u4eea\u8868\u76d8\u5c55\u793a\u6982\u89c8\u6307\u6807\u4e0e\u4e09\u7c7b\u56fe\u8868\uff1b\u57ce\u5e02\u6570\u636e\u9875\u5c55\u793a\u68c0\u7d22\u3001\u8868\u683c\u4e0e\u5206\u9875\uff1b\u51fa\u884c\u52a9\u624b\u9875\u5c55\u793a\u8bc4\u5206\u4eea\u8868\u76d8\u3001\u5173\u952e\u4e8b\u5b9e\u4e0e\u516d\u9879\u751f\u6d3b\u6307\u6570\u3002", { after: 60 }),
  ...figure(SHOT("vue_\u767b\u5f55\u9875.png"), "\u56fe 1\u3000\u767b\u5f55\u9875\uff08\u767b\u5f55\u63a5\u53e3\u8054\u8c03\u5165\u53e3\uff09", 520),
  ...figure(SHOT("vue_\u4eea\u8868\u76d8.png"), "\u56fe 2\u3000\u6570\u636e\u4eea\u8868\u76d8\uff1a\u6982\u89c8\u6307\u6807 + \u8d8b\u52bf\u6298\u7ebf\u56fe + \u67f1\u72b6\u56fe + \u5360\u6bd4\u73af\u5f62\u56fe", 540),
  ...figure(SHOT("vue_\u57ce\u5e02\u6570\u636e.png"), "\u56fe 3\u3000\u57ce\u5e02\u6570\u636e\u7ba1\u7406\uff1a\u68c0\u7d22\u3001\u8868\u683c\u4e0e\u5206\u9875", 540),
  ...figure(SHOT("vue_\u51fa\u884c\u52a9\u624b.png"), "\u56fe 4\u3000\u51fa\u884c\u52a9\u624b\uff1a\u8bc4\u5206\u4eea\u8868\u76d8\u4e0e\u516d\u9879\u751f\u6d3b\u6307\u6570", 540),

  h2("4.5 \u8c03\u8bd5\u4f18\u5316"),
  body("\u5f00\u53d1\u8c03\u8bd5\u8fc7\u7a0b\u4e2d\u5b9a\u4f4d\u5e76\u89e3\u51b3\u4e86\u591a\u4e2a\u5178\u578b\u524d\u7aef\u95ee\u9898\uff0c\u8fc7\u7a0b\u4e0e\u5fc3\u5f97\u8be6\u89c1\u300c\u4e94\u3001\u5b9e\u9a8c\u601d\u8003\u300d\uff1b\u540c\u65f6\u4e3a\u9875\u9762\u8865\u9f50\u4e86\u4e09\u7c7b\u4ea4\u4e92\u72b6\u6001\uff1a\u8bf7\u6c42\u671f\u95f4\u7684\u52a0\u8f7d\u52a8\u753b\uff08CSS spinner\uff09\u3001\u8bf7\u6c42\u5931\u8d25\u7684\u9519\u8bef\u9762\u677f\u4e0e\u91cd\u8bd5\u6309\u94ae\u3001\u68c0\u7d22\u65e0\u7ed3\u679c\u65f6\u7684\u7a7a\u6570\u636e\u63d0\u793a\uff0c\u4fdd\u8bc1\u63a5\u53e3\u5f02\u5e38\u65f6\u9875\u9762\u4ecd\u6709\u53cb\u597d\u51fa\u53e3\u3002", { after: 120 }),

  h1("\u4e94\u3001\u5b9e\u9a8c\u601d\u8003"),
  body("\u95ee\u9898\u4e00\uff1a\u9996\u6b21\u8fdb\u5165\u4eea\u8868\u76d8\u65f6\u4e09\u5f20 ECharts \u56fe\u8868\u5168\u90e8\u7a7a\u767d\uff0c\u63a7\u5236\u53f0\u65e0\u62a5\u9519\u3002\u6392\u67e5\u53d1\u73b0\u56fe\u8868\u5bb9\u5668\u5199\u5728 v-if=\"loading\" \u7684\u5206\u652f\u91cc\uff0c\u800c onMounted \u4e2d await \u8bf7\u6c42\u8fd4\u56de\u540e\u7acb\u5373\u6267\u884c echarts.init\uff0c\u6b64\u65f6 loading \u5c1a\u672a\u7f6e\u4e3a false\u3001DOM \u8fd8\u672a\u91cd\u65b0\u6e32\u67d3\uff0cgetElementById \u62ff\u5230 null\u3002\u89e3\u51b3\u529e\u6cd5\uff1a\u5148\u5c06 loading \u7f6e\u4e3a false\uff0c\u518d await nextTick() \u7b49 Vue \u5b8c\u6210\u4e00\u6b21 DOM \u66f4\u65b0\u540e\u521d\u59cb\u5316\u56fe\u8868\u3002\u51fa\u884c\u52a9\u624b\u9875\u7684\u4eea\u8868\u76d8\u968f\u540e\u51fa\u73b0\u4e86\u540c\u6837\u7684\u95ee\u9898\uff08v-else-if \u5bb9\u5668\uff09\uff0c\u540c\u6837\u7528 nextTick \u89e3\u51b3\u2014\u2014\u8fd9\u662f Vue \u96c6\u6210\u547d\u4ee4\u5f0f DOM \u5e93\uff08ECharts\uff09\u65f6\u6700\u5178\u578b\u7684\u751f\u547d\u5468\u671f\u95ee\u9898\uff0c\u6838\u5fc3\u662f\u7406\u89e3 Vue \u7684 DOM \u66f4\u65b0\u662f\u5f02\u6b65\u7684\u3002\u3010\u6b64\u5904\u53ef\u63d2\u5165\u4fee\u590d\u524d\u540e\u5bf9\u6bd4\u622a\u56fe\u3011"),
  body("\u95ee\u9898\u4e8c\uff1a\u5f00\u53d1\u65f6\u8bf7\u6c42\u63a5\u53e3\u62a5\u8de8\u57df\u9519\u8bef\uff08CORS policy: No 'Access-Control-Allow-Origin' header\uff09\u3002\u524d\u7aef 5173 \u4e0e\u540e\u7aef 8091 \u7aef\u53e3\u4e0d\u540c\u5c5e\u4e8e\u8de8\u6e90\u8bf7\u6c42\u3002\u89e3\u51b3\u529e\u6cd5\uff1a\u5728 vite.config.js \u4e2d\u914d\u7f6e server.proxy \u628a /api \u8f6c\u53d1\u5230 8091\uff0c\u8bf7\u6c42\u4ece\u6d4f\u89c8\u5668\u53d1\u5f80\u540c\u6e90\u7684 5173\uff0c\u7531 Vite \u670d\u52a1\u7aef\u4ee3\u8f6c\uff0c\u4e0d\u5b58\u5728\u8de8\u57df\uff1b\u76f8\u6bd4\u5728\u540e\u7aef\u914d\u7f6e @CrossOrigin\uff0c\u4ee3\u7406\u65b9\u6848\u4e0d\u7528\u6539\u540e\u7aef\u4ee3\u7801\u4e14\u4e0e\u751f\u4ea7\u540c\u6e90\u90e8\u7f72\u4e00\u81f4\u3002\u3010\u6b64\u5904\u53ef\u63d2\u5165 CORS \u62a5\u9519\u622a\u56fe\u3011"),
  body("\u95ee\u9898\u4e09\uff1a\u767b\u5f55\u540e\u624b\u52a8\u5237\u65b0\u9875\u9762\uff0c\u4f1a\u56de\u5230\u767b\u5f55\u9875\uff08\u72b6\u6001\u4e22\u5931\uff09\u3002\u539f\u56e0\u662f\u767b\u5f55\u4fe1\u606f\u53ea\u5b58\u5728\u7ec4\u4ef6\u53d8\u91cf\u91cc\uff0c\u5237\u65b0\u540e\u5185\u5b58\u72b6\u6001\u6e05\u7a7a\u3002\u89e3\u51b3\u529e\u6cd5\uff1a\u767b\u5f55\u6210\u529f\u540e\u628a\u7528\u6237\u4fe1\u606f\u5199\u5165 localStorage\uff0c\u8def\u7531\u5b88\u536b beforeEach \u68c0\u67e5\u767b\u5f55\u6001\u51b3\u5b9a\u653e\u884c\u6216\u91cd\u5b9a\u5411\uff1b\u91c7\u7528 hash \u8def\u7531\u6a21\u5f0f\uff0c\u5237\u65b0\u540e URL \u81ea\u5e26\u8def\u5f84\uff0c\u767b\u5f55\u6001\u4e0e\u5f53\u524d\u9875\u9762\u3001\u83dc\u5355\u9ad8\u4eae\u5747\u80fd\u6b63\u786e\u6062\u590d\u3002\u3010\u6b64\u5904\u53ef\u63d2\u5165\u5237\u65b0\u524d\u540e\u5bf9\u6bd4\u622a\u56fe\u3011"),
  body("\u95ee\u9898\u56db\uff1a\u6267\u884c npm run build \u62a5\u9519\u6784\u5efa\u5931\u8d25\uff0c\u63d0\u793a\u6a21\u5757\u89e3\u6790\u5931\u8d25\u3002\u6392\u67e5\u53d1\u73b0\u662f\u6e05\u7406\u811a\u624b\u67b6\u793a\u4f8b\u4ee3\u7801\u65f6\u8bef\u5220\u4e86 main.js \u5f15\u7528\u7684 src/style.css\uff0c\u6784\u5efa\u5668\u89e3\u6790 import './style.css' \u5931\u8d25\u5373\u4e2d\u65ad\u3002\u89e3\u51b3\u529e\u6cd5\uff1a\u8865\u56de\u5168\u5c40\u6837\u5f0f\u6587\u4ef6\u540e\u6784\u5efa\u901a\u8fc7\uff08460ms\uff09\u3002\u8fd9\u6b21\u6559\u8bad\u8bf4\u660e Vite \u7684\u9519\u8bef\u4fe1\u606f\u4f1a\u6307\u5411\u6a21\u5757\u89e3\u6790\u9636\u6bb5\uff0c\u6392\u67e5\u65f6\u5e94\u4f18\u5148\u68c0\u67e5 import \u8def\u5f84\u4e0e\u6587\u4ef6\u662f\u5426\u5b58\u5728\uff0c\u800c\u4e0d\u662f\u4e1a\u52a1\u4ee3\u7801\u903b\u8f91\u3002\u3010\u6b64\u5904\u53ef\u63d2\u5165\u6784\u5efa\u62a5\u9519\u622a\u56fe\u3011"),

  h1("\u5b9e\u9a8c\u5c0f\u7ed3"),
  body("\u672c\u5b9e\u9a8c\u57fa\u4e8e Vue 3 + Vite + Vue Router + Axios + ECharts \u4e3a\u5929\u6c14\u6570\u636e\u5206\u6790\u7cfb\u7edf\u5b9e\u73b0\u4e86\u524d\u7aef\u9875\u9762\uff1a\u6309\u7ec4\u4ef6\u5316\u601d\u60f3\u62c6\u5206\u4e3a\u5e03\u5c40\u58f3\u3001\u56db\u4e2a\u8def\u7531\u9875\u9762\u4e0e\u63a5\u53e3\u5c01\u88c5\u5c42\uff1bDashboard \u96c6\u6210 ECharts \u5b9e\u73b0\u6982\u89c8\u6307\u6807\u3001\u8d8b\u52bf\u6298\u7ebf\u56fe\u3001\u67f1\u72b6\u56fe\u4e0e\u5360\u6bd4\u73af\u5f62\u56fe\uff1b\u4fa7\u8fb9\u591a\u7ea7\u83dc\u5355\u4e0e\u8def\u7531\u9ad8\u4eae\u8054\u52a8\uff0c\u5237\u65b0\u4e0d\u4e22\u72b6\u6001\uff1b\u901a\u8fc7 Vite \u4ee3\u7406\u89e3\u51b3\u8de8\u57df\u5e76\u5b8c\u6210\u524d\u540e\u7aef\u8054\u8c03\u3002\u8c03\u8bd5\u4e2d\u5148\u540e\u89e3\u51b3\u4e86 v-if \u5bb9\u5668\u4e0e echarts.init \u7684\u65f6\u673a\u3001\u8de8\u57df\u3001\u5237\u65b0\u72b6\u6001\u4e22\u5931\u3001\u6784\u5efa\u5931\u8d25\u7b49\u95ee\u9898\uff0c\u52a0\u6df1\u4e86\u5bf9 Vue \u54cd\u5e94\u5f0f\u66f4\u65b0\u3001\u751f\u547d\u5468\u671f\u4e0e\u524d\u540e\u7aef\u5206\u79bb\u5f00\u53d1\u6a21\u5f0f\u7684\u7406\u89e3\uff0c\u4e5f\u5efa\u7acb\u4e86\u300c\u63a5\u53e3\u5c01\u88c5 \u2192 \u72b6\u6001\u7ba1\u7406 \u2192 \u52a8\u6001\u6e32\u67d3\u300d\u7684\u6807\u51c6\u5316\u524d\u7aef\u5f00\u53d1\u601d\u7ef4\u3002", { after: 120 }),
];

const doc = new Document({
  styles: { default: {
    document: { run: { font: { ascii: "Times New Roman", eastAsia: "SimSun" }, size: 24, color: "000000" }, paragraph: { spacing: { line: 312 } } },
    heading1: { run: { font: { ascii: "Times New Roman", eastAsia: "SimHei" }, size: 28, bold: true, color: "000000" }, paragraph: { spacing: { before: 320, after: 140, line: 312 } } },
    heading2: { run: { font: { ascii: "Times New Roman", eastAsia: "SimHei" }, size: 24, bold: true, color: "000000" }, paragraph: { spacing: { before: 240, after: 120, line: 312 } } },
  } },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: [PageNumber.CURRENT], size: 18 })] })] }) },
    children,
  }],
});

Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(OUT, buf); console.log("OK " + OUT); });
