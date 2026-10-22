
```
weather-system-springboot
├─ .env.example
├─ algorithm
│  ├─ clustering.py
│  ├─ data_cleaning.py
│  ├─ ml_models
│  │  └─ rain_model_meta.json
│  ├─ ml_train.py
│  ├─ predict_cli.py
│  └─ run_eda.py
├─ data
│  ├─ profile
│  │  ├─ data_profile.json
│  │  ├─ EDA_REPORT.md
│  │  ├─ ml_metrics.json
│  │  └─ ML_REPORT.md
│  └─ raw
│     └─ GlobalWeatherRepository.csv
├─ doc
│  ├─ build_report.py
│  ├─ input.docx
│  ├─ qa-direct
│  ├─ qa-render
│  ├─ qa-word
│  ├─ qa_ascii
│  ├─ qa_ascii2
│  ├─ qa_ascii3
│  ├─ qa_ascii4
│  ├─ qa_ascii5
│  │  ├─ out
│  │  ├─ out-template
│  │  ├─ out2
│  │  ├─ profile
│  │  │  ├─ cache
│  │  │  │  ├─ opencl_devices.log
│  │  │  │  └─ opencl_profile.xml
│  │  │  ├─ crash
│  │  │  │  └─ dump.ini
│  │  │  └─ user
│  │  │     ├─ autocorr
│  │  │     ├─ autotext
│  │  │     │  └─ mytexts.bau
│  │  │     ├─ basic
│  │  │     │  ├─ dialog.xlc
│  │  │     │  ├─ script.xlc
│  │  │     │  └─ Standard
│  │  │     │     ├─ dialog.xlb
│  │  │     │     ├─ Module1.xba
│  │  │     │     └─ script.xlb
│  │  │     ├─ config
│  │  │     │  └─ autotbl.fmt
│  │  │     ├─ database
│  │  │     │  ├─ biblio
│  │  │     │  │  ├─ biblio.dbf
│  │  │     │  │  └─ biblio.dbt
│  │  │     │  ├─ biblio.odb
│  │  │     │  └─ evolocal.odb
│  │  │     ├─ extensions
│  │  │     │  ├─ buildid
│  │  │     │  ├─ bundled
│  │  │     │  │  ├─ extensions.pmap
│  │  │     │  │  ├─ lastsynchronized
│  │  │     │  │  └─ registry
│  │  │     │  │     ├─ com.sun.star.comp.deployment.bundle.PackageRegistryBackend
│  │  │     │  │     ├─ com.sun.star.comp.deployment.component.PackageRegistryBackend
│  │  │     │  │     │  └─ unorc
│  │  │     │  │     ├─ com.sun.star.comp.deployment.configuration.PackageRegistryBackend
│  │  │     │  │     │  ├─ backenddb.xml
│  │  │     │  │     │  └─ configmgr.ini
│  │  │     │  │     ├─ com.sun.star.comp.deployment.executable.PackageRegistryBackend
│  │  │     │  │     ├─ com.sun.star.comp.deployment.help.PackageRegistryBackend
│  │  │     │  │     │  └─ backenddb.xml
│  │  │     │  │     ├─ com.sun.star.comp.deployment.script.PackageRegistryBackend
│  │  │     │  │     │  └─ backenddb.xml
│  │  │     │  │     └─ com.sun.star.comp.deployment.sfwk.PackageRegistryBackend
│  │  │     │  ├─ shared
│  │  │     │  │  ├─ lastsynchronized
│  │  │     │  │  └─ registry
│  │  │     │  │     ├─ com.sun.star.comp.deployment.bundle.PackageRegistryBackend
│  │  │     │  │     ├─ com.sun.star.comp.deployment.component.PackageRegistryBackend
│  │  │     │  │     ├─ com.sun.star.comp.deployment.configuration.PackageRegistryBackend
│  │  │     │  │     │  └─ backenddb.xml
│  │  │     │  │     ├─ com.sun.star.comp.deployment.executable.PackageRegistryBackend
│  │  │     │  │     ├─ com.sun.star.comp.deployment.help.PackageRegistryBackend
│  │  │     │  │     │  └─ backenddb.xml
│  │  │     │  │     ├─ com.sun.star.comp.deployment.script.PackageRegistryBackend
│  │  │     │  │     └─ com.sun.star.comp.deployment.sfwk.PackageRegistryBackend
│  │  │     │  └─ tmp
│  │  │     │     ├─ extensions
│  │  │     │     └─ registry
│  │  │     │        ├─ com.sun.star.comp.deployment.bundle.PackageRegistryBackend
│  │  │     │        ├─ com.sun.star.comp.deployment.component.PackageRegistryBackend
│  │  │     │        ├─ com.sun.star.comp.deployment.configuration.PackageRegistryBackend
│  │  │     │        │  └─ backenddb.xml
│  │  │     │        ├─ com.sun.star.comp.deployment.executable.PackageRegistryBackend
│  │  │     │        ├─ com.sun.star.comp.deployment.help.PackageRegistryBackend
│  │  │     │        │  └─ backenddb.xml
│  │  │     │        ├─ com.sun.star.comp.deployment.script.PackageRegistryBackend
│  │  │     │        └─ com.sun.star.comp.deployment.sfwk.PackageRegistryBackend
│  │  │     ├─ gallery
│  │  │     │  ├─ sg30.sdv
│  │  │     │  └─ sg30.thm
│  │  │     ├─ pack
│  │  │     │  ├─ autotext
│  │  │     │  ├─ basic
│  │  │     │  │  └─ Standard
│  │  │     │  ├─ config
│  │  │     │  └─ database
│  │  │     │     └─ biblio
│  │  │     ├─ registrymodifications.xcu
│  │  │     └─ uno_packages
│  │  │        └─ cache
│  │  │           ├─ registry
│  │  │           │  ├─ com.sun.star.comp.deployment.bundle.PackageRegistryBackend
│  │  │           │  ├─ com.sun.star.comp.deployment.component.PackageRegistryBackend
│  │  │           │  ├─ com.sun.star.comp.deployment.configuration.PackageRegistryBackend
│  │  │           │  │  └─ backenddb.xml
│  │  │           │  ├─ com.sun.star.comp.deployment.executable.PackageRegistryBackend
│  │  │           │  ├─ com.sun.star.comp.deployment.help.PackageRegistryBackend
│  │  │           │  │  └─ backenddb.xml
│  │  │           │  ├─ com.sun.star.comp.deployment.script.PackageRegistryBackend
│  │  │           │  └─ com.sun.star.comp.deployment.sfwk.PackageRegistryBackend
│  │  │           └─ uno_packages
│  │  └─ report.docx
│  ├─ render_input.docx
│  ├─ template.docx
│  ├─ Z202508090307_杨文帅_实验四后端实现实验报告.docx
│  └─ ~$02508090307_杨文帅_实验四后端实现实验报告.docx
├─ figures
│  ├─ 01_temporal_coverage.png
│  ├─ 02_global_temperature_trend.png
│  ├─ 03_seasonal_city_profiles.png
│  ├─ 04_weather_conditions.png
│  ├─ 05_air_quality.png
│  ├─ 06_feature_correlation.png
│  ├─ 07_latest_geospatial_snapshot.png
│  ├─ 08_humidity_precipitation_visibility.png
│  ├─ 09_domain_quality_checks.png
│  ├─ ml_class_balance.png
│  ├─ ml_confusion_matrix.png
│  ├─ ml_feature_importance.png
│  ├─ ml_model_comparison.png
│  └─ ml_roc_curves.png
├─ pom.xml
├─ requirements.txt
├─ run-eda.cmd
├─ scripts
├─ sql
│  └─ weather_springboot_mysql.sql
├─ src
│  └─ main
│     ├─ java
│     │  └─ com
│     │     └─ weatherlab
│     │        └─ weather
│     │           ├─ admin
│     │           │  ├─ AdminGuard.java
│     │           │  ├─ DatabaseInitializer.java
│     │           │  ├─ DatasetAdminController.java
│     │           │  ├─ DatasetEntity.java
│     │           │  ├─ DatasetMapper.java
│     │           │  ├─ ModelAdminController.java
│     │           │  ├─ ModelEntity.java
│     │           │  ├─ ModelMapper.java
│     │           │  ├─ UserAdminController.java
│     │           │  ├─ UserEntity.java
│     │           │  └─ UserMapper.java
│     │           ├─ api
│     │           │  ├─ AuthController.java
│     │           │  ├─ ModelPredictionController.java
│     │           │  └─ WeatherController.java
│     │           ├─ common
│     │           │  ├─ ApiExceptionHandler.java
│     │           │  ├─ ModelTrainingService.java
│     │           │  └─ RainPredictionService.java
│     │           ├─ config
│     │           │  ├─ MybatisPlusConfig.java
│     │           │  ├─ PasswordConfig.java
│     │           │  └─ WebConfig.java
│     │           ├─ data
│     │           │  ├─ CsvReader.java
│     │           │  ├─ DatasetSnapshot.java
│     │           │  ├─ WeatherAnalyticsService.java
│     │           │  ├─ WeatherDataService.java
│     │           │  └─ WeatherRecord.java
│     │           └─ WeatherApplication.java
│     └─ resources
│        ├─ application-mysql.yml
│        ├─ application.yml
│        ├─ schema.sql
│        └─ static
│           ├─ app.js
│           ├─ figures
│           │  ├─ 01_temporal_coverage.png
│           │  ├─ 02_global_temperature_trend.png
│           │  ├─ 03_seasonal_city_profiles.png
│           │  ├─ 04_weather_conditions.png
│           │  ├─ 05_air_quality.png
│           │  ├─ 06_feature_correlation.png
│           │  ├─ 07_latest_geospatial_snapshot.png
│           │  ├─ 08_humidity_precipitation_visibility.png
│           │  ├─ 09_domain_quality_checks.png
│           │  ├─ ml_class_balance.png
│           │  ├─ ml_confusion_matrix.png
│           │  ├─ ml_feature_importance.png
│           │  ├─ ml_model_comparison.png
│           │  └─ ml_roc_curves.png
│           ├─ index.html
│           ├─ styles.css
│           └─ vendor
│              ├─ echarts.min.js
│              └─ world.json
├─ start-mysql.cmd
├─ start.cmd
└─ test-api.cmd

```