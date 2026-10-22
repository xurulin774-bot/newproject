// 实验四实验报告生成脚本（docx-js，按学校报告册模板结构）
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, Header, Footer, PageNumber, AlignmentType, HeadingLevel,
  WidthType, BorderStyle, ShadingType,
} = require("docx");
const fs = require("fs");
const path = require("path");

const DOC = path.resolve(__dirname, "..");
const SHOT = (name) => path.join(DOC, name);
const OUT = path.join(DOC, "\u5b9e\u9a8c\u56db_\u540e\u7aef\u5b9e\u73b0_\u5b9e\u9a8c\u62a5\u544a.docx");

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
const infoRows = [
  ["\u5b9e\u9a8c\u79d1\u76ee", "\u4f20\u5a92\u6570\u636e\u7ba1\u7406\u4e0e\u5206\u6790", "\u5b9e\u9a8c\u540d\u79f0", "\u540e\u7aef\u5b9e\u73b0\uff08\u5b9e\u9a8c\u56db\uff09"],
  ["\u5b66\u3000\u3000\u53f7", "Z202508090307", "\u59d3\u3000\u3000\u540d", "\u6768\u6587\u5e05"],
  ["\u73ed\u3000\u3000\u7ea7", "23\u8ba1\u79d1\uff08\u4e13\u8f6c\u672c\uff09X\u73ed", "\u5b9e\u9a8c\u65e5\u671f", "2026.10.25"],
];
const infoTable = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: tableBorders,
  rows: infoRows.map((r) => new TableRow({ cantSplit: true,
    children: r.map((text, i) => cell(text, { width: [14, 36, 14, 36][i], bold: i % 2 === 0, fill: i % 2 === 0 ? "EFEFEF" : undefined, center: i % 2 === 0 })) })) });

// ---------- 表格数据 ----------
const envTable = makeTable(
  ["\u7c7b\u522b", "\u73af\u5883\u4e0e\u5de5\u5177", "\u7528\u9014"],
  [
    ["\u64cd\u4f5c\u7cfb\u7edf", "Windows 11 x64", "\u9879\u76ee\u5f00\u53d1\u4e0e\u8fd0\u884c"],
    ["\u5f00\u53d1\u5de5\u5177", "IntelliJ IDEA / VS Code", "\u4ee3\u7801\u7f16\u5199\u4e0e\u8c03\u8bd5"],
    ["JDK / \u6784\u5efa", "JDK 17+\uff08\u672c\u673a Java 18\uff09\u3001Maven 3.9.12", "\u7f16\u8bd1\u3001\u6253\u5305\u3001\u4f9d\u8d56\u7ba1\u7406"],
    ["\u540e\u7aef\u6846\u67b6", "Spring Boot 3.5.16 + MyBatis-Plus 3.5.17", "Web \u670d\u52a1\u3001\u6301\u4e45\u5c42\u3001\u5206\u9875"],
    ["\u6570\u636e\u5e93", "H2 \u6587\u4ef6\u5e93\uff08\u9ed8\u8ba4\uff0cMySQL \u517c\u5bb9\u6a21\u5f0f\uff09/ MySQL 8", "\u4e1a\u52a1\u6570\u636e\u5b58\u50a8"],
    ["\u6d4b\u8bd5\u5de5\u5177", "Postman / curl\u3001Chrome \u5f00\u53d1\u8005\u5de5\u5177", "\u63a5\u53e3\u6d4b\u8bd5\u4e0e\u8054\u8c03"],
    ["\u7248\u672c\u63a7\u5236", "Git + GitHub", "\u4ee3\u7801\u7ba1\u7406"],
  ],
  [16, 44, 40], { boldFirstCol: true });

const depsTable = makeTable(
  ["\u4f9d\u8d56", "\u8bf4\u660e"],
  [
    ["spring-boot-starter-web", "Web \u670d\u52a1\u4e0e\u5185\u5d4c Tomcat"],
    ["spring-boot-starter-validation", "\u53c2\u6570\u6821\u9a8c\uff08@NotBlank\u3001@Size \u7b49\u6ce8\u89e3\uff09"],
    ["spring-boot-starter-jdbc", "\u6570\u636e\u6e90\u4e0e\u4e8b\u52a1\u57fa\u7840"],
    ["mybatis-plus-spring-boot3-starter", "MyBatis-Plus \u6301\u4e45\u5c42\uff0c\u901a\u7528 Mapper \u514d\u5199 SQL"],
    ["h2 / mysql-connector-j", "H2 \u5185\u5d4c\u5e93\uff08\u9ed8\u8ba4\uff09\uff1bMySQL \u9a71\u52a8\uff08\u53ef\u9007 profile\uff09"],
    ["spring-security-crypto", "BCrypt \u5bc6\u7801\u52a0\u5bc6"],
  ],
  [40, 60]);

const schemaTable = makeTable(
  ["\u6570\u636e\u8868", "\u4e3b\u8981\u5b57\u6bb5", "\u7528\u9014"],
  [
    ["app_user", "id\u3001username\u3001password_hash\u3001display_name\u3001role_name\u3001created_at", "\u7528\u6237\u4e0e\u89d2\u8272\uff0c\u5bc6\u7801 BCrypt \u52a0\u5bc6\u5b58\u50a8"],
    ["weather_dataset", "id\u3001name\u3001file_path\u3001row_count\u3001field_count\u3001status", "\u6570\u636e\u96c6\u767b\u8bb0\uff0c\u652f\u6301\u4e0a\u4f20\u4e0e\u6fc0\u6d3b"],
    ["weather_model", "id\u3001model_name\u3001algorithm\u3001target_name\u3001status\u3001metrics_json\u3001artifact_path", "\u6a21\u578b\u8bad\u7ec3\u4efb\u52a1\u4e0e\u8bc4\u4f30\u6307\u6807"],
  ],
  [20, 46, 34]);

const testTable = makeTable(
  ["#", "\u63a5\u53e3", "\u6d4b\u8bd5\u573a\u666f", "\u9884\u671f", "\u5b9e\u9645\u7ed3\u679c"],
  [
    ["1", "POST /api/auth/login", "\u6b63\u786e\u8d26\u53f7\u767b\u5f55", "200 \u5199\u5165\u4f1a\u8bdd", "200 Signed in"],
    ["2", "POST /api/auth/login", "\u9519\u8bef\u5bc6\u7801", "401", "401 Invalid username or password"],
    ["3", "GET /api/admin/users", "\u672a\u767b\u5f55\u8bbf\u95ee", "401 \u62e6\u622a", "401 Please sign in first"],
    ["4", "GET /api/admin/users", "\u5df2\u767b\u5f55\u5206\u9875\u67e5\u8be2", "200", "200\uff0cpage=1\u3001total=2"],
    ["5", "POST /api/admin/users", "\u5fc5\u586b\u5b57\u6bb5\u7f3a\u5931", "400 \u53c2\u6570\u6821\u9a8c", "400 \u4e0d\u80fd\u4e3a\u7a7a"],
    ["6", "POST /api/admin/users", "\u6b63\u5e38\u65b0\u589e", "200", "200\uff0c\u8fd4\u56de\u65b0\u7528\u6237 id"],
    ["7", "PUT /api/admin/users/{id}", "\u4fee\u6539\u6635\u79f0\u4e0e\u89d2\u8272", "200", "200\uff0c\u5b57\u6bb5\u5df2\u66f4\u65b0"],
    ["8", "DELETE /api/admin/users/{id}", "\u5220\u9664\u7528\u6237", "200", "200 User deleted"],
    ["9", "GET /api/datasets", "\u6570\u636e\u96c6\u5217\u8868", "200", "200\uff0cACTIVE \u6570\u636e\u96c6\u4e00\u6761"],
    ["10", "GET /api/models", "\u6a21\u578b\u5217\u8868", "200", "200\uff0c\u7a7a\u5217\u8868"],
    ["11", "GET /api/ml/predict?k=", "\u57ce\u5e02\u964d\u6c34\u6982\u7387", "200 \u8fd4\u56de\u6982\u7387", "200\uff0c2.2%\uff08LightGBM\uff09"],
    ["12", "POST /api/admin/users", "\u8bf7\u6c42\u4f53\u542b\u4e2d\u6587\uff08GBK\uff09", "400 \u6216\u6b63\u5e38", "400 Invalid UTF-8\uff08\u89c1\u5b9e\u9a8c\u601d\u8003\uff09"],
  ],
  [5, 24, 22, 18, 31], { centerCols: [0] });

const apiTable = makeTable(
  ["\u5206\u7ec4", "\u65b9\u6cd5", "URL", "\u8bf4\u660e"],
  [
    ["\u8ba4\u8bc1", "POST", "/api/auth/login", "\u767b\u5f55\uff0c\u5199\u5165 HttpOnly \u4f1a\u8bdd Cookie"],
    ["\u8ba4\u8bc1", "POST", "/api/auth/register", "\u6ce8\u518c\u65b0\u7528\u6237"],
    ["\u7528\u6237\u7ba1\u7406", "GET", "/api/admin/users", "\u5206\u9875/\u5173\u952e\u8bcd\u67e5\u8be2\u7528\u6237"],
    ["\u7528\u6237\u7ba1\u7406", "POST", "/api/admin/users", "\u65b0\u589e\u7528\u6237\uff08\u53c2\u6570\u6821\u9a8c\uff09"],
    ["\u7528\u6237\u7ba1\u7406", "PUT", "/api/admin/users/{id}", "\u4fee\u6539\u7528\u6237\u4fe1\u606f"],
    ["\u7528\u6237\u7ba1\u7406", "DELETE", "/api/admin/users/{id}", "\u5220\u9664\u7528\u6237"],
    ["\u6570\u636e\u96c6", "GET/POST", "/api/datasets\u3001/api/datasets/upload", "\u5217\u8868\u4e0e\u4e0a\u4f20\uff08multipart\uff0c\u2264100MB\uff09"],
    ["\u6570\u636e\u96c6", "GET/DELETE", "/api/datasets/{id}", "\u8be6\u60c5\u4e0e\u5220\u9664"],
    ["\u6a21\u578b\u7ba1\u7406", "POST", "/api/models/train", "\u89e6\u53d1\u5728\u7ebf\u8bad\u7ec3\uff08\u8c03 Python\uff09"],
    ["\u6a21\u578b\u7ba1\u7406", "GET", "/api/models/{id}/status\u3001/result", "\u8bad\u7ec3\u72b6\u6001\u8f6e\u8be2\u4e0e\u7ed3\u679c"],
    ["\u6a21\u578b\u9884\u6d4b", "GET/POST", "/api/ml/predict\u3001/api/ml/risk_rank", "\u964d\u6c34\u6982\u7387\u63a8\u7406\u4e0e\u98ce\u9669\u699c"],
    ["\u5929\u6c14\u5206\u6790", "GET", "/api/summary\u3001/trend\u3001/cities \u7b49 13 \u9879", "\u4e0e\u524d\u7aef\u56fe\u8868\u5bf9\u5e94\u7684\u6570\u636e\u63a5\u53e3"],
  ],
  [14, 12, 40, 34]);

// ---------- 正文 ----------
const children = [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60, line: 420, lineRule: "atLeast" },
    children: [new TextRun({ text: "\u5b9e\u9a8c\u56db\u3000\u540e\u7aef\u5b9e\u73b0\u3000\u5b9e\u9a8c\u62a5\u544a", bold: true, size: 32, color: "000000", font: { ascii: "Times New Roman", eastAsia: "SimHei" } })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text: "\u5357\u4eac\u4f20\u5a92\u5b66\u9662\u667a\u80fd\u5a92\u4f53\u5de5\u7a0b\u5b66\u9662\u3000\u5b9e\u9a8c\u62a5\u544a\u518c", size: 21, color: "555555", font: { ascii: "Times New Roman", eastAsia: "SimSun" } })] }),
  infoTable,
  new Paragraph({ spacing: { after: 120 }, children: [] }),

  h1("\u4e00\u3001\u5b9e\u9a8c\u76ee\u7684"),
  body("1. \u638c\u63e1\u57fa\u4e8e Spring Boot \u7684\u540e\u7aef\u9879\u76ee\u642d\u5efa\u4e0e\u914d\u7f6e\uff0c\u7406\u89e3 Controller\u2014Service\u2014Mapper\uff08\u6216 Dao\uff09\u4e09\u5c42\u67b6\u6784\u53ca\u5176\u804c\u8d23\u5212\u5206\u3002", { noIndent: true }),
  body("2. \u638c\u63e1 RESTful \u63a5\u53e3\u7684\u8bbe\u8ba1\u4e0e\u5b9e\u73b0\uff0c\u5b8c\u6210\u540e\u53f0\u7ba1\u7406\u7cfb\u7edf\u4e2d\u81f3\u5c11\u4e24\u4e2a\u4e1a\u52a1\u6a21\u5757\u7684\u63a5\u53e3\u5f00\u53d1\uff08\u7528\u6237\u7ba1\u7406\u3001\u6570\u636e\u96c6/\u6a21\u578b\u7ba1\u7406\uff09\uff0c\u5b9e\u73b0\u5b8c\u6574\u7684\u589e\u5220\u6539\u67e5\uff08CRUD\uff09\u3002", { noIndent: true }),
  body("3. \u638c\u63e1\u4f7f\u7528 MyBatis / JPA \u7b49\u6301\u4e45\u5c42\u6846\u67b6\u64cd\u4f5c MySQL \u6570\u636e\u5e93\uff0c\u7f16\u5199 SQL \u5b8c\u6210\u6570\u636e\u8868\u7684\u589e\u5220\u6539\u67e5\uff0c\u7406\u89e3\u524d\u540e\u7aef\u6570\u636e\u4ea4\u4e92\u6d41\u7a0b\u3002", { noIndent: true }),
  body("4. \u638c\u63e1\u63a5\u53e3\u8c03\u8bd5\u4e0e\u524d\u540e\u7aef\u8054\u8c03\u65b9\u6cd5\uff0c\u80fd\u591f\u4f7f\u7528 Postman \u7b49\u5de5\u5177\u6d4b\u8bd5\u63a5\u53e3\uff0c\u72ec\u7acb\u6392\u67e5\u5e76\u89e3\u51b3\u540e\u7aef\u5f00\u53d1\u4e2d\u7684\u5e38\u89c1\u95ee\u9898\uff08\u53c2\u6570\u6821\u9a8c\u3001\u4e8b\u52a1\u3001\u5f02\u5e38\u3001\u8de8\u57df\u7b49\uff09\u3002", { noIndent: true, after: 120 }),

  h1("\u4e8c\u3001\u5b9e\u9a8c\u73af\u5883"),
  envTable,

  h1("\u4e09\u3001\u5b9e\u9a8c\u5185\u5bb9\u53ca\u8981\u6c42"),
  body("\u672c\u5b9e\u9a8c\u57fa\u4e8e\u5168\u7403\u5929\u6c14\u6570\u636e\u5206\u6790\u4e0e\u51fa\u884c\u63a8\u8350\u7cfb\u7edf\u5b8c\u6210 Spring Boot \u540e\u7aef\u5b9e\u73b0\uff0c\u5177\u4f53\u8981\u6c42\u5982\u4e0b\uff1a", { after: 80 }),
  body("1. \u57fa\u4e8e Spring Boot \u642d\u5efa\u540e\u7aef\u9879\u76ee\uff0c\u6b63\u786e\u914d\u7f6e application.yml\uff08\u6570\u636e\u6e90\u3001\u670d\u52a1\u7aef\u53e3\u3001\u8de8\u57df CORS \u7b49\uff09\uff0c\u9879\u76ee\u7ed3\u6784\u89c4\u8303\u3001\u5206\u5c42\u6e05\u6670\u3002", { noIndent: true }),
  body("2. \u6309\u4e09\u5c42\u67b6\u6784\uff08Controller / Service / Mapper\uff09\u7ec4\u7ec7\u4ee3\u7801\uff0c\u63a5\u53e3\u547d\u540d\u4e0e URL \u7b26\u5408 RESTful \u89c4\u8303\u3002", { noIndent: true }),
  body("3. \u5b8c\u6210\u81f3\u5c11\u4e24\u4e2a\u4e1a\u52a1\u63a5\u53e3\u7684\u5b8c\u6574\u5b9e\u73b0\uff08\u7528\u6237\u7ba1\u7406\u3001\u6570\u636e\u96c6/\u6a21\u578b\u7ba1\u7406\uff09\uff0c\u5305\u542b\u53c2\u6570\u6821\u9a8c\u4e0e\u7edf\u4e00\u8fd4\u56de\u683c\u5f0f\u3002", { noIndent: true }),
  body("4. \u4f7f\u7528 MyBatis \u7f16\u5199\u6301\u4e45\u5c42\uff0c\u6b63\u786e\u8bbe\u8ba1\u4e0e\u64cd\u4f5c\u6570\u636e\u8868\uff0c\u4e8b\u52a1\u5904\u7406\u5408\u7406\u3002", { noIndent: true }),
  body("5. \u5bf9\u63a5\u53e3\u8fdb\u884c\u529f\u80fd\u6d4b\u8bd5\uff08\u6b63\u5e38/\u5f02\u5e38/\u8fb9\u754c\u573a\u666f\uff09\uff0c\u5e76\u4e0e\u524d\u7aef\u5b8c\u6210\u8054\u8c03\uff1b\u622a\u56fe\u8bb0\u5f55\u6d4b\u8bd5\u7ed3\u679c\u3002", { noIndent: true }),
  body("6. \u5177\u5907\u826f\u597d\u7684\u9519\u8bef\u5904\u7406\u4e0e\u65e5\u5fd7\u8f93\u51fa\uff0c\u80fd\u72ec\u7acb\u6392\u67e5\u5f00\u53d1\u4e2d\u7684\u5e38\u89c1 Bug\u3002", { noIndent: true, after: 120 }),

  h1("\u56db\u3001\u4e3b\u8981\u64cd\u4f5c\u6b65\u9aa4"),

  h2("4.1 \u9879\u76ee\u642d\u5efa\u4e0e\u914d\u7f6e"),
  body("\u4f7f\u7528 Spring Initializr \u5efa\u7acb Maven \u5de5\u7a0b\uff08Java 17\uff09\uff0c\u6838\u5fc3\u4f9d\u8d56\u5982\u8868 1 \u6240\u793a\u3002", { after: 80 }),
  tableCaption("\u8868 1\u3000pom.xml \u6838\u5fc3\u4f9d\u8d56"),
  depsTable,
  body("\u5e94\u7528\u914d\u7f6e application.yml\uff1a\u670d\u52a1\u76d1\u542c 127.0.0.1:8091\uff1b\u6570\u636e\u6e90\u9ed8\u8ba4\u4f7f\u7528 H2 \u6587\u4ef6\u5e93\uff08MODE=MySQL \u517c\u5bb9\u6a21\u5f0f\uff0c\u96f6\u5916\u90e8\u4f9d\u8d56\u5373\u53ef\u542f\u52a8\uff0c\u53e6\u63d0\u4f9b application-mysql.yml \u5207\u6362 MySQL\uff09\uff1b\u542f\u52a8\u65f6\u81ea\u52a8\u6267\u884c schema.sql \u5efa\u8868\uff1b\u9759\u6001\u8d44\u6e90\u7981\u7528\u7f13\u5b58\u4fbf\u4e8e\u524d\u7aef\u8c03\u8bd5\uff1b\u6587\u4ef6\u4e0a\u4f20\u4e0a\u9650 100MB\uff1b\u65e5\u5fd7\u843d\u5730\u5230 logs/weather-system.log\u3002\u5173\u952e\u914d\u7f6e\u5982\u4e0b\uff1a", { after: 60 }),
  ...codeBlock([
    "server:",
    "  address: 127.0.0.1",
    "  port: ${SERVER_PORT:8091}",
    "spring:",
    "  datasource:",
    "    url: jdbc:h2:file:./data/weatherdb;MODE=MySQL;DB_CLOSE_ON_EXIT=FALSE",
    "  sql:",
    "    init:",
    "      mode: always                    # \u542f\u52a8\u65f6\u81ea\u52a8\u6267\u884c schema.sql",
    "      schema-locations: classpath:schema.sql",
    "  servlet:",
    "    multipart:",
    "      max-file-size: 100MB           # \u6570\u636e\u96c6\u4e0a\u4f20\u4e0a\u9650",
    "weather:",
    "  python-command: ${PYTHON_COMMAND:python}   # \u6a21\u578b\u63a8\u7406\u7684 Python \u53ef\u6267\u884c\u6587\u4ef6",
    "  admin:",
    "    username: ${WEATHER_ADMIN_USERNAME:admin}",
    "    password: ${WEATHER_ADMIN_PASSWORD:123456}",
  ]),
  body("\u9879\u76ee\u6309\u4e09\u5c42\u67b6\u6784\u7ec4\u7ec7\uff1aapi\uff08Controller \u5c42\uff0c\u63a5\u6536 HTTP \u8bf7\u6c42\u4e0e\u53c2\u6570\u6821\u9a8c\uff09\u3001common \u4e0e data\uff08Service \u5c42\uff0c\u4e1a\u52a1\u903b\u8f91\u4e0e\u6570\u636e\u805a\u5408\uff09\u3001admin\uff08Mapper \u6301\u4e45\u5c42\u4e0e\u7ba1\u7406\u63a7\u5236\u5668\uff09\u3001config\uff08\u914d\u7f6e\uff09\uff0c\u53e6\u6709\u7edf\u4e00\u5f02\u5e38\u5904\u7406\u5668 ApiExceptionHandler \u5c06\u5f02\u5e38\u8f6c\u6362\u4e3a\u7edf\u4e00\u7684 JSON \u9519\u8bef\u7ed3\u6784\uff08code/message/error\uff09\u3002", { after: 120 }),

  h2("4.2 \u6570\u636e\u5e93\u51c6\u5907"),
  body("\u5728 schema.sql \u4e2d\u5b9a\u4e49\u4e09\u5f20\u4e1a\u52a1\u8868\uff08\u89c1\u8868 2\uff09\uff0c\u540c\u65f6\u63d0\u4f9b MySQL \u5efa\u5e93\u811a\u672c sql/weather_springboot_mysql.sql \u4f9b\u751f\u4ea7\u90e8\u7f72\u4f7f\u7528\u3002\u5b9e\u4f53\u7c7b\u4e0e\u8868\u4e00\u4e00\u5bf9\u5e94\uff0cMapper \u7ee7\u627f MyBatis-Plus \u7684 BaseMapper\uff0c\u65e0\u9700\u624b\u5199 SQL \u5373\u53ef\u5b8c\u6210\u5e38\u89c4 CRUD\uff0c\u5206\u9875\u4f7f\u7528\u5176\u5185\u7f6e\u5206\u9875\u63d2\u4ef6\u5b9e\u73b0\u3002", { after: 80 }),
  tableCaption("\u8868 2\u3000\u6570\u636e\u8868\u8bbe\u8ba1"),
  schemaTable,
  ...codeBlock([
    "@Mapper public interface UserMapper extends BaseMapper<UserEntity> {}",
    "// \u5206\u9875\u67e5\u8be2\u793a\u4f8b\uff08UserAdminController\uff09",
    "Page<UserEntity> page = userMapper.selectPage(",
    "        new Page<>(page, size),",
    "        new LambdaQueryWrapper<UserEntity>().like(UserEntity::getUsername, q));",
  ]),

  h2("4.3 \u63a5\u53e3\u4e00\uff1a\u7528\u6237\u7ba1\u7406\u63a5\u53e3"),
  body("\u767b\u5f55\u91c7\u7528 BCrypt \u9a8c\u8bc1\u5bc6\u7801\uff08PasswordConfig \u63d0\u4f9b\u52a0\u5bc6\u5668 Bean\uff09\uff0c\u767b\u5f55\u6210\u529f\u540e\u751f\u6210\u968f\u673a\u4f1a\u8bdd Token \u5199\u5165 HttpOnly Cookie\uff1bAdminGuard \u5207\u9762\u5bf9 /api/admin/** \u7edf\u4e00\u505a\u767b\u5f55\u4e0e\u7ba1\u7406\u5458\u89d2\u8272\u6821\u9a8c\u3002\u65b0\u589e/\u4fee\u6539\u63a5\u53e3\u4f7f\u7528 JSR-303 \u6ce8\u89e3\u58f0\u660e\u6821\u9a8c\u89c4\u5219\uff0c\u914d\u5408 @Valid \u89e6\u53d1\uff1a", { after: 60 }),
  ...codeBlock([
    "public record UserRequest(",
    "        @NotBlank @Size(max = 64)  String username,",
    "        @NotBlank @Size(min = 6, max = 100) String password,   // \u5bc6\u7801\u81f3\u5c116\u4f4d",
    "        @NotBlank @Size(max = 100) String displayName,",
    "        @NotBlank @Size(max = 32)  String role) {}",
    "",
    "@PostMapping",
    "public Map<String, Object> create(@Valid @RequestBody UserRequest request) { ... }",
  ]),
  body("\u767b\u5f55\u4e0e\u6743\u9650\u6838\u5fc3\u903b\u8f91\uff1a", { after: 60 }),
  ...codeBlock([
    "@PostMapping(\"/login\")",
    "public Map<String, Object> login(@RequestBody Map<String, String> body,",
    "                                 HttpServletRequest request) {",
    "    UserEntity user = userService.verify(body.get(\"username\"), body.get(\"password\"));",
    "    if (user == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,",
    "            \"Invalid username or password\");",
    "    request.getSession(true).setAttribute(\"USER\", user);   // \u4f1a\u8bdd\u4e0e HttpOnly Cookie",
    "    return Map.of(\"code\", 200, \"message\", \"Signed in\", \"user\", userService.view(user));",
    "}",
  ]),
  body("\u672c\u6a21\u5757\u5b9e\u73b0\u767b\u5f55\u3001\u6ce8\u518c\u3001\u5206\u9875\u67e5\u8be2\u3001\u65b0\u589e\u3001\u4fee\u6539\u3001\u5220\u9664\u516d\u4e2a\u63a5\u53e3\uff0c\u8986\u76d6\u5b8c\u6574 CRUD\uff1b\u63a5\u53e3\u6e05\u5355\u6c47\u603b\u89c1\u8868 3\u3002", { after: 80 }),
  tableCaption("\u8868 3\u3000\u7cfb\u7edf RESTful \u63a5\u53e3\u6e05\u5355"),
  apiTable,

  h2("4.4 \u63a5\u53e3\u4e8c\uff1a\u6570\u636e\u96c6\u4e0e\u6a21\u578b\u7ba1\u7406\u63a5\u53e3"),
  body("\u6570\u636e\u96c6\u6a21\u5757\u63d0\u4f9b\u4e0a\u4f20\uff08multipart/form-data\uff0c\u540e\u7aef\u6821\u9a8c\u6269\u5c55\u540d\u4e0e\u5927\u5c0f\uff09\u3001\u5217\u8868\u3001\u8be6\u60c5\u3001\u5220\u9664\u63a5\u53e3\uff0c\u4e0a\u4f20\u6210\u529f\u540e\u5199\u5165 weather_dataset \u5e76\u53ef\u8bbe\u4e3a\u6fc0\u6d3b\u6570\u636e\u6e90\uff0c\u5176\u4f59\u5206\u6790\u63a5\u53e3\u5747\u4ece\u6fc0\u6d3b\u6570\u636e\u96c6\u8bfb\u53d6\uff1b\u6a21\u578b\u6a21\u5757\u63d0\u4f9b\u8bad\u7ec3\u4efb\u52a1\u7684\u521b\u5efa\u3001\u72b6\u6001\u8f6e\u8be2\u4e0e\u7ed3\u679c\u67e5\u8be2\uff1a\u524d\u7aef\u8c03 POST /api/models/train \u540e\uff0c\u540e\u7aef\u65b0\u5efa weather_model \u8bb0\u5f55\uff08\u72b6\u6001 RUNNING\uff09\u5e76\u5f02\u6b65\u8c03\u7528 Python \u8bad\u7ec3\u811a\u672c\uff0c\u524d\u7aef\u901a\u8fc7 /api/models/{id}/status \u8f6e\u8be2\u76f4\u81f3 FINISHED \u540e\u8bfb\u53d6 metrics_json \u4e2d\u7684\u8bc4\u4f30\u6307\u6807\u3002", { after: 60 }),
  ...codeBlock([
    "// \u8de8\u8bed\u8a00\u6a21\u578b\u63a8\u7406\uff08RainPredictionService\uff09\uff1a",
    "//   Java \u901a\u8fc7 ProcessBuilder \u8c03\u7528 Python CLI \u8bfb\u53d6 joblib \u6a21\u578b\uff0c75 \u79d2\u8d85\u65f6\u4fdd\u62a4",
    "Process process = new ProcessBuilder(pythonCommand, script.toString(),",
    "        \"--dataset\", analytics.currentSnapshot().path().toString(),",
    "        \"--city-key\", key).redirectErrorStream(true).start();",
    "boolean finished = process.waitFor(75, TimeUnit.SECONDS);",
    "// \u89e3\u6790\u5b50\u8fdb\u7a0b\u8f93\u51fa\u7684\u6700\u540e\u4e00\u884c JSON \u4f5c\u4e3a\u54cd\u5e94",
  ]),
  body("\u8fd9\u4e00\u8bbe\u8ba1\u4f7f\u5f97\u5b9e\u9a8c\u4e09\u8bad\u7ec3\u7684\u964d\u6c34\u9884\u6d4b\u6a21\u578b\u80fd\u76f4\u63a5\u670d\u52a1\u4e8e Java \u540e\u7aef\uff1a\u524d\u7aef\u300c\u7b97\u6cd5\u5b9e\u9a8c\u300d\u9875\u7684\u5b9e\u65f6\u9884\u6d4b\u5668\u3001\u624b\u52a8\u53c2\u6570\u6ed1\u5757\u4e0e\u5168\u57ce\u964d\u6c34\u98ce\u9669\u699c\u5747\u7531\u672c\u540e\u7aef\u8f6c\u53d1\u5230 Python \u6a21\u578b\u5b8c\u6210\u63a8\u7406\u3002", { after: 120 }),

  h2("4.5 \u63a5\u53e3\u6d4b\u8bd5\u4e0e\u524d\u540e\u7aef\u8054\u8c03"),
  body("\u4f7f\u7528 curl\uff08\u7b49\u4ef7 Postman\uff09\u5bf9\u4e24\u4e2a\u4e1a\u52a1\u6a21\u5757\u5171 12 \u4e2a\u573a\u666f\u8fdb\u884c\u6d4b\u8bd5\uff0c\u8986\u76d6\u6b63\u5e38\u3001\u5f02\u5e38\u4e0e\u8fb9\u754c\u8f93\u5165\uff0c\u7ed3\u679c\u5982\u8868 4 \u6240\u793a\uff0c\u5168\u90e8\u7b26\u5408\u9884\u671f\u3002", { after: 80 }),
  tableCaption("\u8868 4\u3000\u63a5\u53e3\u6d4b\u8bd5\u77e9\u9635\uff08\u6b63\u5e38 / \u5f02\u5e38 / \u8fb9\u754c\u573a\u666f\uff09"),
  testTable,
  body("\u5178\u578b\u6d4b\u8bd5\u8fc7\u7a0b\u7684\u547d\u4ee4\u4e0e\u54cd\u5e94\u5982\u4e0b\uff08\u672a\u767b\u5f55\u62e6\u622a\u4e0e\u53c2\u6570\u6821\u9a8c\u4e24\u4e2a\u5f02\u5e38\u573a\u666f\uff09\uff1a", { after: 60 }),
  ...codeBlock([
    "$ curl -X POST http://127.0.0.1:8091/api/auth/login \\",
    "      -H \"Content-Type: application/json\" \\",
    "      -d '{\"username\":\"admin\",\"password\":\"wrong\"}'",
    "{\"code\":401,\"message\":\"Invalid username or password\",",
    " \"error\":\"Invalid username or password\"}          # HTTP 401",
    "",
    "$ curl -b cookie.txt -X POST http://127.0.0.1:8091/api/admin/users \\",
    "      -H \"Content-Type: application/json\" -d '{\"username\":\"bad\"}'",
    "{\"code\":400,\"message\":\"\u4e0d\u80fd\u4e3a\u7a7a\",\"error\":\"\u4e0d\u80fd\u4e3a\u7a7a\"}   # HTTP 400 \u53c2\u6570\u6821\u9a8c",
    "",
    "$ curl -b cookie.txt \"http://127.0.0.1:8091/api/ml/predict?k=China%20%7C%20Beijing\"",
    "{\"available\":true,\"model\":\"LightGBM\",\"city\":\"Beijing\",",
    " \"probability\":2.2,\"condition\":\"Overcast\",...}      # HTTP 200 \u8de8\u8bed\u8a00\u63a8\u7406",
  ]),
  body("\u524d\u540e\u7aef\u8054\u8c03\uff1a\u542f\u52a8\u540e\u7aef\u540e\u6d4f\u89c8\u5668\u8bbf\u95ee http://127.0.0.1:8091/\uff0c\u524d\u7aef\u9875\u9762\u7531 Spring Boot \u9759\u6001\u8d44\u6e90\u76ee\u5f55\u76f4\u63a5\u6258\u7ba1\u3002\u767b\u5f55\u9875\u3001\u767b\u5f55\u540e\u7684\u6570\u636e\u4eea\u8868\u76d8\uff08\u63a5\u53e3 /api/summary\u3001/api/trend \u7b49\u6b63\u5e38\u51fa\u6570\uff09\u4e0e\u6a21\u578b\u9884\u6d4b\u9875\uff08\u63a5\u53e3 /api/ml/predict \u8de8\u8bed\u8a00\u63a8\u7406\uff09\u5982\u56fe 1 \u81f3\u56fe 3 \u6240\u793a\uff0c\u5168\u90e8\u6b63\u5e38\u3002", { after: 60 }),
  ...figure(SHOT("\u622a\u56fe_\u767b\u5f55\u9875.png"), "\u56fe 1\u3000\u767b\u5f55\u9875\uff08\u7531 Spring Boot \u6258\u7ba1\uff0c\u767b\u5f55\u63a5\u53e3\u8054\u8c03\u5165\u53e3\uff09", 520),
  ...figure(SHOT("\u622a\u56fe_\u4eea\u8868\u76d8\u8054\u8c03.png"), "\u56fe 2\u3000\u767b\u5f55\u540e\u6570\u636e\u4eea\u8868\u76d8\uff1a13 \u4e2a\u5206\u6790\u63a5\u53e3\u8054\u8c03\u6b63\u5e38\u51fa\u6570", 540),
  ...figure(SHOT("\u622a\u56fe_\u6a21\u578b\u9884\u6d4b\u8054\u8c03.png"), "\u56fe 3\u3000\u7b97\u6cd5\u5b9e\u9a8c\u9875\uff1a\u8de8\u8bed\u8a00\u6a21\u578b\u63a8\u7406\u63a5\u53e3\u8054\u8c03\u6b63\u5e38", 540),

  h2("4.6 \u8c03\u8bd5\u4f18\u5316"),
  body("\u5f00\u53d1\u4e0e\u6d4b\u8bd5\u8fc7\u7a0b\u4e2d\u5b9a\u4f4d\u5e76\u4fee\u590d\u4e86\u591a\u4e2a\u5178\u578b\u95ee\u9898\uff0c\u8be6\u89c1\u300c\u4e94\u3001\u5b9e\u9a8c\u601d\u8003\u300d\uff1b\u540c\u65f6\u5b8c\u5584\u4e86\u7edf\u4e00\u5f02\u5e38\u5904\u7406\uff08ApiExceptionHandler \u5c06\u53c2\u6570\u6821\u9a8c\u3001JSON \u89e3\u6790\u3001\u4e1a\u52a1\u5f02\u5e38\u7edf\u4e00\u8f6c\u4e3a code/message/error \u7ed3\u6784\uff09\u4e0e\u65e5\u5fd7\u8f93\u51fa\uff08logs/weather-system.log\uff09\uff0c\u4fbf\u4e8e\u540e\u7eed\u6392\u67e5\u95ee\u9898\u3002", { after: 120 }),

  h1("\u4e94\u3001\u5b9e\u9a8c\u601d\u8003"),
  body("\u95ee\u9898\u4e00\uff1ajava -jar \u542f\u52a8\u5931\u8d25\uff0c\u63d0\u793a\u300cjar \u4e2d\u6ca1\u6709\u4e3b\u6e05\u5355\u5c5e\u6027\u300d\u3002\u539f\u56e0\u662f\u76f4\u63a5\u6267\u884c mvn package \u65f6\u53ea\u751f\u6210\u4e86\u666e\u901a jar\uff0cSpring Boot \u7684\u53ef\u6267\u884c jar \u9700\u8981 spring-boot-maven-plugin \u6267\u884c repackage\uff0c\u5c06\u4f9d\u8d56\u4e0e\u542f\u52a8\u7c7b\u91cd\u65b0\u5199\u5165 MANIFEST\u3002\u89e3\u51b3\u529e\u6cd5\uff1a\u786e\u8ba4 pom \u4e2d\u58f0\u660e\u8be5\u63d2\u4ef6\u540e\u91cd\u65b0\u6267\u884c mvn clean package\uff0c\u751f\u6210\u7684 fat jar\uff0835MB\uff09\u5373\u53ef\u76f4\u63a5\u8fd0\u884c\u3002\u3010\u6b64\u5904\u53ef\u63d2\u5165\u542f\u52a8\u5931\u8d25\u63a7\u5236\u53f0\u622a\u56fe\u3011"),
  body("\u95ee\u9898\u4e8c\uff1a\u5728 Windows \u63a7\u5236\u53f0\u7528 curl \u65b0\u589e\u7528\u6237\u65f6\uff0c\u8bf7\u6c42\u4f53\u542b\u4e2d\u6587\uff08\u6635\u79f0\u300c\u6d4b\u8bd5\u7528\u6237\u300d\uff09\u5c31\u62a5 400 JSON parse error: Invalid UTF-8 start byte\u3002\u6392\u67e5\u53d1\u73b0 Windows \u63a7\u5236\u53f0\u9ed8\u8ba4 GBK \u7f16\u7801\uff0ccurl \u53d1\u51fa\u7684\u4e2d\u6587\u5b57\u8282\u4e0d\u662f\u5408\u6cd5 UTF-8\uff0c\u670d\u52a1\u7aef Jackson \u53cd\u5e8f\u5217\u5316\u5931\u8d25\u3002\u89e3\u51b3\u529e\u6cd5\uff1a\u628a\u8bf7\u6c42\u4f53\u5199\u5165 UTF-8 \u6587\u4ef6\u540e\u7528 curl --data-binary @file \u53d1\u9001\uff0c\u6216\u5728 Postman \u4e2d\u6d4b\u8bd5\uff08Postman \u9ed8\u8ba4 UTF-8\uff09\uff1b\u524d\u7aef fetch \u53d1\u9001\u7684\u5929\u7136\u662f UTF-8\uff0c\u4e0d\u53d7\u5f71\u54cd\u3002\u8be5\u95ee\u9898\u8bf4\u660e\u6392\u67e5 HTTP 400 \u65f6\u8981\u533a\u5206\u300c\u53c2\u6570\u6821\u9a8c\u5931\u8d25\u300d\u4e0e\u300c\u62a5\u6587\u672c\u8eab\u4e0d\u5408\u6cd5\u300d\u4e24\u7c7b\u539f\u56e0\u3002\u3010\u6b64\u5904\u53ef\u63d2\u5165 GBK \u62a5\u9519\u622a\u56fe\u3011"),
  body("\u95ee\u9898\u4e09\uff1a\u65b0\u589e\u7528\u6237\u63a5\u53e3\u59cb\u7ec8\u8fd4\u56de 400\u300c\u4e0d\u80fd\u4e3a\u7a7a\u300d\uff0c\u4f46\u81ea\u67e5\u5b57\u6bb5\u90fd\u586b\u4e86\u3002\u5bf9\u7167\u63a7\u5236\u5668\u7684 record \u5b9a\u4e49\u624d\u53d1\u73b0\u8bf7\u6c42\u5b57\u6bb5\u540d\u662f\u9a7c\u5cf0\u5f0f\u7684 displayName\uff0c\u800c\u6211\u6309\u6570\u636e\u5e93\u4e0b\u5212\u7ebf\u98ce\u683c\u53d1\u4e86 display_name\uff0c\u53cd\u5e8f\u5217\u5316\u540e\u4e3a null\uff0c\u89e6\u53d1 @NotBlank \u6821\u9a8c\u3002\u89e3\u51b3\u529e\u6cd5\uff1a\u7edf\u4e00 JSON \u5b57\u6bb5\u547d\u540d\u4e3a\u9a7c\u5cf0\u5f0f\uff08\u4e0e Java \u5c5e\u6027\u4e00\u81f4\uff09\uff0c\u6570\u636e\u5e93\u5217\u540d\u7684\u4e0b\u5212\u7ebf\u98ce\u683c\u4ea4\u7531 MyBatis-Plus \u7684 map-underscore-to-camel-case \u81ea\u52a8\u6620\u5c04\u3002\u8fd9\u63d0\u9192\u6211\u63a5\u53e3\u6587\u6863\u5e94\u660e\u786e\u5b57\u6bb5\u547d\u540d\u7ea6\u5b9a\uff0c\u907f\u514d\u8054\u8c03\u65f6\u53cd\u590d\u8bd5\u9519\u3002\u3010\u6b64\u5904\u53ef\u63d2\u5165\u6821\u9a8c\u5931\u8d25\u622a\u56fe\u3011"),
  body("\u95ee\u9898\u56db\uff1a\u6a21\u578b\u63a8\u7406\u63a5\u53e3\u5076\u53d1\u7b49\u5f85\u5f88\u4e45\u624d\u8fd4\u56de\u3002\u6392\u67e5\u53d1\u73b0\u63a8\u7406\u9700\u8981\u542f\u52a8 Python \u5b50\u8fdb\u7a0b\u5e76\u52a0\u8f7d pandas\u3001scikit-learn\u3001LightGBM\uff0c\u9996\u6b21\u8c03\u7528\u51b7\u542f\u52a8\u660e\u663e\u53d8\u6162\uff1b\u82e5\u5b50\u8fdb\u7a0b\u5f02\u5e38\u6302\u8d77\u8fd8\u4f1a\u5360\u4f4f\u8bf7\u6c42\u3002\u89e3\u51b3\u529e\u6cd5\uff1a\u5728 RainPredictionService \u4e2d\u52a0\u5165 75 \u79d2 waitFor \u8d85\u65f6\u4fdd\u62a4\uff0c\u8d85\u65f6\u540e destroyForcibly \u56de\u6536\u5b50\u8fdb\u7a0b\u5e76\u8fd4\u56de\u53cb\u597d\u7684\u964d\u7ea7\u63d0\u793a\uff1b\u540c\u65f6\u5bf9\u6a21\u578b\u6587\u4ef6\u7f3a\u5931\u7684\u573a\u666f\u8fd4\u56de available=false \u4e0e\u5f15\u5bfc\u4fe1\u606f\uff0c\u907f\u514d\u524d\u7aef\u62ff\u5230\u96be\u61c2\u7684\u5806\u6808\u9519\u8bef\u3002\u3010\u6b64\u5904\u53ef\u63d2\u5165\u63a8\u7406\u8017\u65f6\u5bf9\u6bd4\u622a\u56fe\u3011"),

  h1("\u5b9e\u9a8c\u5c0f\u7ed3"),
  body("\u672c\u5b9e\u9a8c\u57fa\u4e8e Spring Boot + MyBatis-Plus \u5b8c\u6210\u4e86\u5929\u6c14\u6570\u636e\u5206\u6790\u7cfb\u7edf\u7684\u540e\u7aef\u5b9e\u73b0\uff1a\u642d\u5efa\u4e86\u4e09\u5c42\u67b6\u6784\u7684 Maven \u5de5\u7a0b\uff0c\u914d\u7f6e\u4e86 H2/MySQL \u53cc\u6570\u636e\u6e90\u4e0e\u81ea\u52a8\u5efa\u8868\uff1b\u5b9e\u73b0\u4e86\u7528\u6237\u7ba1\u7406\uff08\u767b\u5f55\u3001\u6ce8\u518c\u3001CRUD\uff0c\u542b BCrypt \u52a0\u5bc6\u3001\u4f1a\u8bdd\u8ba4\u8bc1\u3001\u89d2\u8272\u62e6\u622a\u4e0e\u53c2\u6570\u6821\u9a8c\uff09\u4e0e\u6570\u636e\u96c6/\u6a21\u578b\u7ba1\u7406\uff08\u4e0a\u4f20\u3001\u5217\u8868\u3001\u8be6\u60c5\u3001\u5220\u9664\u3001\u5728\u7ebf\u8bad\u7ec3\u72b6\u6001\u8f6e\u8be2\uff09\u4e24\u4e2a\u5b8c\u6574\u4e1a\u52a1\u6a21\u5757\uff0c\u5e76\u901a\u8fc7 ProcessBuilder \u6865\u63a5 Python \u5b8c\u6210\u964d\u6c34\u6a21\u578b\u7684\u8de8\u8bed\u8a00\u5b9e\u65f6\u63a8\u7406\u3002\u524d\u540e\u7aef\u8054\u8c03\u4e0e 12 \u4e2a\u573a\u666f\u7684\u63a5\u53e3\u6d4b\u8bd5\u5168\u90e8\u901a\u8fc7\u3002\u901a\u8fc7\u672c\u6b21\u5b9e\u9a8c\uff0c\u6211\u5bf9\u4e09\u5c42\u67b6\u6784\u7684\u804c\u8d23\u8fb9\u754c\u3001RESTful \u8bbe\u8ba1\u89c4\u8303\u3001\u53c2\u6570\u6821\u9a8c\u4e0e\u7edf\u4e00\u5f02\u5e38\u5904\u7406\u7684\u5de5\u7a0b\u4ef7\u503c\u6709\u4e86\u5b9e\u8df5\u5c42\u9762\u7684\u7406\u89e3\uff0c\u4e5f\u79ef\u7d2f\u4e86\u6253\u5305\u90e8\u7f72\u3001\u7f16\u7801\u95ee\u9898\u3001\u5b57\u6bb5\u547d\u540d\u7ea6\u5b9a\u7b49\u5178\u578b\u95ee\u9898\u7684\u6392\u67e5\u7ecf\u9a8c\u3002", { after: 120 }),
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
