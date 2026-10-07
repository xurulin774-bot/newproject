# 全球城市天气数据分析与出行推荐系统

这是基于 `GlobalWeatherRepository.csv` 独立创建的新项目，原来的 `movie-system` 保持不变。

## 推荐项目题目

正式题目建议使用：

> **全球城市天气数据分析与出行推荐系统**

这个题目保留“数据分析 + 推荐系统”的课程项目结构，同时把推荐对象从电影改成城市和出行场景，能够覆盖数据清洗、EDA 可视化、指标评分、城市筛选、接口服务和前端展示。

页面展示名称为“全球城市天气洞察”。

## 功能

- 读取 `data/raw/GlobalWeatherRepository.csv`，展示全球城市天气数据概况。
- 加载时执行共享数据清洗（`algorithm/data_cleaning.py`）：国家名别名标准化、剔除城市身份错乱行、同城近距拼写归并，并输出清洗报告。
- 展示全球温度趋势、天气状况分布和城市经纬度快照。
- 根据舒适出行、空气质量、温暖晴朗、清凉避暑四种策略推荐城市。
- 保留 9 张 EDA 图和机器可读的数据质量报告。
- 内置登录认证（本地演示账号 `admin / 123456`）。
- 使用 Python 标准库 HTTP 服务，不依赖 MySQL、Redis、Java 或前端构建工具。

## 目录

```text
weather-system/
├── algorithm/run_eda.py              # 可复用 EDA 脚本
├── algorithm/data_cleaning.py        # 共享数据清洗模块（后端与 EDA 共用）
├── backend/app.py                    # 本地 API 和静态文件服务
├── data/raw/GlobalWeatherRepository.csv
├── data/profile/                     # 数据概况与 EDA 报告
├── figures/                          # EDA PNG 图
├── frontend/                         # 无构建依赖的网页
├── requirements.txt
├── run_eda.cmd
└── start.cmd
```

## 启动

在 Windows 下双击 `start.cmd`，或在 PowerShell 中执行：

```powershell
..\movie-system\.venv\Scripts\python.exe backend\app.py --port 8090
```

浏览器打开：

```text
http://127.0.0.1:8090/
```

如果机器没有原项目的虚拟环境，也可以使用已安装的 Python：

```powershell
python backend\app.py --port 8090
```

## 更换数据集

只需要把同结构 CSV 放到 `data/raw/GlobalWeatherRepository.csv`，然后重新运行：

```powershell
run_eda.cmd
start.cmd
```

EDA 脚本会校验必需字段；后端启动时也会在字段缺失时给出明确错误。

## API

- `GET /api/health`
- `POST /api/auth/login`（登录，本地演示账号 admin / 123456）
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/summary`
- `GET /api/cleaning`（数据清洗报告）
- `GET /api/trend?days=180`
- `GET /api/conditions?limit=10`
- `GET /api/map`
- `GET /api/cities?q=China&limit=20`
- `GET /api/recommend?mode=comfort&limit=8`

## 数据说明

源数据共 166,254 条记录（41 个原始字段），后端与 EDA 加载时经共享清洗模块
`algorithm/data_cleaning.py` 处理为 165,952 条，覆盖 191 个国家、239 个城市
（清洗前为 211 国、268 城：剔除约 300 行国家名错乱/身份不符的记录，归并 19 组
同城重复拼写，如 Rangoon→Yangon、Beijing Shi→Beijing）。项目使用
`last_updated_epoch` 作为统一 UTC 时间轴，保留本地时间和时区字段。推荐结果是
面向展示和课程项目演示的规则评分，不等同于气象预报。
