# 和风天气

用微信开发者工具打开本目录 `E:\ReadyingPortfolio\hefeng-weather`，AppID 为 `wxa303df5af95ebed3`。请打开这一层，不要打开里面的 `miniprogram` 示例模板目录。

环境配置：把 `config/env.example.js` 复制为 `config/env.js`，打开 [和风天气控制台 → 设置](https://console.qweather.com/setting)，复制 API Host 与 Key 填入（不要带路径）。真实凭据文件 `config/env.js` 已被 `.gitignore` 忽略，不会提交到仓库。公共地址 `devapi.qweather.com`、`api.qweather.com`、`geoapi.qweather.com` 已无法用于这把 Key。

上线前在微信公众平台配置 request 合法域名（你的 API Host）和 downloadFile 合法域名 `https://image.nmc.cn`。

7 日预报一般可用。15 日、30 日取决于套餐，没有权限时页面会提示，不会空白崩溃。
