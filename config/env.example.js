/**
 * 环境配置示例模板。
 *
 * 复制本文件为 env.js 并填入你自己的凭据：
 *   1. 到和风天气控制台「设置」复制你的 API Host（形如 abcd1234.qweatherapi.com）
 *   2. 填入下方 apiKey / credentialId / projectId / apiHost
 *   3. authMode 默认 'header'（请求头 X-QW-Api-Key），旧式 Host 可改 'query'
 *
 * 注意：env.js 含真实凭据，已被 .gitignore 忽略，切勿提交。
 */

module.exports = {
  apiKey: 'YOUR_API_KEY',
  credentialId: 'YOUR_CREDENTIAL_ID',
  projectId: 'YOUR_PROJECT_ID',
  apiHost: 'YOUR_HOST.qweatherapi.com',
  authMode: 'header',
  lang: 'zh'
}
