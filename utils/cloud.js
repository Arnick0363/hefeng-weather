const timeline = require('./timeline.js')

/**
 * 中央气象台 FY4B 真彩色云图。
 * 2026-10-27 打开 https://www.nmc.cn/publish/satellite/fy4b-visible.htm
 * 得到的最新地址形如：
 * https://image.nmc.cn/product/2026/10/27/WXBL/medium/SEVP_NSMC_WXBL_FY4B_ETCC_ACHN_LNO_PY_20261027063000000.JPG
 * 实测 HTTP 200、Content-Type image/jpeg、文件头 FFD8FF。
 * 文件名中的时间是 UTC，每 15 分钟一帧，发布大约晚 50–75 分钟。
 */
function frameAt(utcMs) {
  const date = new Date(utcMs)
  const year = date.getUTCFullYear()
  const month = timeline.pad(date.getUTCMonth() + 1)
  const day = timeline.pad(date.getUTCDate())
  const hour = timeline.pad(date.getUTCHours())
  const minute = timeline.pad(date.getUTCMinutes())
  const stamp = '' + year + month + day + hour + minute
  const beijing = new Date(utcMs + 8 * 60 * 60 * 1000)
  const label = (beijing.getUTCMonth() + 1) + '月' + beijing.getUTCDate() + '日 '
    + timeline.pad(beijing.getUTCHours()) + ':' + timeline.pad(beijing.getUTCMinutes())
  return {
    url: 'https://image.nmc.cn/product/' + year + '/' + month + '/' + day
      + '/WXBL/medium/SEVP_NSMC_WXBL_FY4B_ETCC_ACHN_LNO_PY_' + stamp + '00000.JPG',
    label
  }
}

function buildFrames(count, delayMinutes, now) {
  const total = count || 8
  const delay = (delayMinutes || 75) * 60 * 1000
  const step = 15 * 60 * 1000
  let end = (now || Date.now()) - delay
  end = Math.floor(end / step) * step
  const frames = []
  for (let i = total - 1; i >= 0; i -= 1) {
    frames.push(frameAt(end - i * step))
  }
  return frames
}

module.exports = {
  frameAt,
  buildFrames
}
