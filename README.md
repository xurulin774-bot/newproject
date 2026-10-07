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
- 相似城市：基于逐月气温/湿度/降水曲线与 PM2.5 的 37 维标准化气候向量做余弦相似度匹配。
- 出行规划：选择出行月份，用各城市历史同期均值进行规则评分。
- 城市对比：1~4 个城市的逐月气温曲线、指标雷达图与温度趋势外推（30 日滑动平均 + 线性回归，演示用途）。
- 气候分区：纯 numpy 实现的 KMeans（k-means++ 初始化）将 239 城聚为 5 个气候带，EDA 页地图按带着色。
- 算法实验（实验三）：降水预测二分类任务，实现 8 种算法（逻辑回归/决策树/随机森林/KNN/朴素贝叶斯/SVM/梯度提升/LightGBM）的训练、评估（准确率/精确率/召回率/F1/AUC）与可视化对比，结果在"算法实验"页展示，完整分析见 `data/profile/ML_REPORT.md`。
- 仪表盘与 EDA 图谱页使用 ECharts 交互图表（悬停提示、区域缩放、图例开关），图表数据由 `/api/eda` 提供；原始 PNG 图仍保留在 `figures/` 供报告引用。
- 保留机器可读的数据质量报告。
- 内置登录认证（本地演示账号 `admin / 123456`），支持替换数据集后的免重启热重载。
- 使用 Python 标准库 HTTP 服务，不依赖 MySQL、Redis、Java 或前端构建工具。

## 目录

```text
weather-system/
├── algorithm/run_eda.py              # 可复用 EDA 脚本
├── algorithm/data_cleaning.py        # 共享数据清洗模块（后端与 EDA 共用）
├── algorithm/clustering.py           # KMeans 聚类（纯 numpy，k-means++ 初始化）
├── algorithm/ml_train.py             # 实验三：8 种机器学习算法训练/评估/可视化
├── backend/app.py                    # 本地 API 和静态文件服务
├── data/raw/GlobalWeatherRepository.csv
├── data/profile/                     # 数据概况、EDA 报告与算法实验指标（ml_metrics.json / ML_REPORT.md）
├── figures/                          # EDA PNG 图
├── frontend/                         # 无构建依赖的网页
├── frontend/vendor/                  # ECharts 5.5 与世界地图 GeoJSON（本地化，离线可用）
├── requirements.txt
├── setup_venv.cmd                    # 一键创建独立虚拟环境
├── test_api.cmd                      # 全接口冒烟测试
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
- `GET /api/similar?k=China|Beijing&limit=8`（余弦相似度找气候相似城市）
- `GET /api/plan?month=12&mode=comfort&limit=8`（按出行月份的历史同期均值评分）
- `GET /api/compare?k=China|Beijing&k=France|Paris`（1~4 城画像对比）
- `GET /api/forecast?k=China|Beijing&days=30`（温度趋势外推，k 省略时为全球平均）
- `GET /api/clusters?k=5`（KMeans 气候分区）
- `GET /api/ml`（实验三 8 种算法的评估指标，由 `algorithm/ml_train.py` 生成）
- `GET /api/eda`（交互图表聚合数据：时序、相关性、空气质量、空间分布等）
- `POST /api/admin/reload`（需登录：替换 data/raw 下 CSV 后热重载，无需重启）

## 数据说明

源数据共 166,254 条记录（41 个原始字段），后端与 EDA 加载时经共享清洗模块
`algorithm/data_cleaning.py` 处理为 165,952 条，覆盖 191 个国家、239 个城市
（清洗前为 211 国、268 城：剔除约 300 行国家名错乱/身份不符的记录，归并 19 组
同城重复拼写，如 Rangoon→Yangon、Beijing Shi→Beijing）。项目使用
`last_updated_epoch` 作为统一 UTC 时间轴，保留本地时间和时区字段。推荐结果是
面向展示和课程项目演示的规则评分，不等同于气象预报。
