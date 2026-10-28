const icons = require('./icons.js')
const timeline = require('./timeline.js')

const TYPE_NAME = {
  1: '运动指数',
  2: '洗车指数',
  3: '穿衣指数',
  5: '紫外线指数',
  6: '旅游指数'
}

const TYPE_ORDER = { 3: 0, 1: 1, 2: 2, 5: 3, 6: 4 }

const AIR_WORD = {
  Excellent: '优',
  Good: '良',
  Moderate: '轻度污染',
  Unhealthy: '中度污染',
  'Unhealthy for Sensitive Groups': '轻度污染',
  'Very Unhealthy': '重度污染',
  Hazardous: '严重污染'
}

const WARN_COLOR = {
  blue: '#2f6fed',
  yellow: '#e6b325',
  orange: '#f08a24',
  red: '#e24b4b',
  white: '#8aa0b8',
  green: '#3cb371',
  black: '#333333',
  Blue: '#2f6fed',
  Yellow: '#e6b325',
  Orange: '#f08a24',
  Red: '#e24b4b',
  White: '#8aa0b8'
}

function textOr(value) {
  if (value === undefined || value === null || value === '') return '—'
  return String(value)
}

function pickToday(daily, now) {
  const today = timeline.todayString(now)
  const list = daily || []
  for (let i = 0; i < list.length; i += 1) {
    if (list[i].fxDate === today) return list[i]
  }
  return list[0] || null
}

function precipOf(item) {
  if (!item) return '—'
  if (item.pop !== undefined && item.pop !== null && item.pop !== '') {
    return '降水概率 ' + item.pop + '%'
  }
  if (item.precip !== undefined && item.precip !== null && item.precip !== '') {
    return '降水 ' + item.precip + ' mm'
  }
  return '—'
}

function windOf(dir, scale) {
  const parts = []
  if (dir) parts.push(dir)
  if (scale !== undefined && scale !== null && scale !== '') parts.push(scale + '级')
  return parts.length ? parts.join(' ') : '—'
}

function themeFor(icon, text, sunrise, sunset) {
  return icons.themeOf(icon, text, sunrise, sunset)
}

function metricsOf(now) {
  const wind = windOf(now.windDir, now.windScale)
  const windValue = now.windSpeed ? wind + ' · ' + now.windSpeed + ' km/h' : wind
  return [
    { label: '体感', value: textOr(now.feelsLike) + (now.feelsLike ? '°' : '') },
    { label: '湿度', value: now.humidity ? now.humidity + '%' : '—' },
    { label: '风向风力', value: windValue },
    { label: '气压', value: now.pressure ? now.pressure + ' hPa' : '—' },
    { label: '能见度', value: now.vis ? now.vis + ' km' : '—' },
    { label: '降水量', value: now.precip !== undefined && now.precip !== '' ? now.precip + ' mm' : '—' },
    { label: '云量', value: now.cloud !== undefined && now.cloud !== '' ? now.cloud + '%' : '—' },
    { label: '更新时间', value: timeline.formatObs(now.obsTime) }
  ]
}

function dailyCards(list, now) {
  const today = timeline.todayString(now)
  return (list || []).map((day) => {
    const moonParts = []
    if (day.moonrise) moonParts.push('月升 ' + day.moonrise)
    if (day.moonset) moonParts.push('月落 ' + day.moonset)
    if (day.moonPhase) moonParts.push(day.moonPhase)
    return {
      date: day.fxDate,
      isToday: day.fxDate === today,
      week: timeline.weekLabel(day.fxDate, now),
      dateText: timeline.monthDay(day.fxDate),
      tempMax: textOr(day.tempMax),
      tempMin: textOr(day.tempMin),
      textDay: day.textDay || '—',
      textNight: day.textNight || '—',
      dayEmoji: icons.iconOf(day.iconDay, day.textDay),
      nightEmoji: icons.iconOf(day.iconNight, day.textNight),
      windText: '白天 ' + windOf(day.windDirDay, day.windScaleDay) + ' · 夜间 ' + windOf(day.windDirNight, day.windScaleNight),
      precipText: precipOf(day),
      humidity: textOr(day.humidity),
      uv: textOr(day.uvIndex),
      sunrise: day.sunrise || '—',
      sunset: day.sunset || '—',
      moon: moonParts.join(' · ')
    }
  })
}

function decorateRow(row, index) {
  if (row.kind !== 'hour') {
    return {
      kind: row.kind,
      key: row.kind + '-' + row.ts,
      label: row.label,
      date: row.date,
      ts: row.ts
    }
  }
  const raw = row.raw
  const date = timeline.dateOf(raw.fxTime)
  const wind = windOf(raw.windDir, raw.windScale)
  const bits = [wind, precipOf(raw)]
  if (raw.humidity) bits.push('湿度 ' + raw.humidity + '%')
  return {
    kind: 'hour',
    key: 'hour-' + (raw.fxTime || index),
    ts: row.ts,
    date,
    time: timeline.hmOf(raw.fxTime),
    emoji: icons.iconOf(raw.icon, raw.text),
    text: raw.text || '—',
    temp: textOr(raw.temp),
    extra: precipOf(raw),
    sub: bits.filter((item) => item && item !== '—').join(' · ')
  }
}

function buildTimeline(hourly, daily, offset) {
  return timeline.mergeSun(hourly, daily, offset).map(decorateRow)
}

function upcomingRows(hourly, daily, offset, limit, now) {
  const merged = timeline.mergeSun(hourly, daily, offset)
  return timeline.upcoming(merged, limit || 24, now).map(decorateRow)
}

function filterDate(rows, date) {
  if (!date) return rows || []
  return (rows || []).filter((row) => row.date === date)
}

function groupRows(rows, now) {
  const groups = []
  const index = {}
  ;(rows || []).forEach((row) => {
    const date = row.date || ''
    if (!index[date]) {
      index[date] = {
        date,
        title: timeline.dayTitle(date, now),
        items: []
      }
      groups.push(index[date])
    }
    index[date].items.push(row)
  })
  return groups
}

function findDay(daily, date) {
  const list = daily || []
  for (let i = 0; i < list.length; i += 1) {
    if (list[i].fxDate === date) return list[i]
  }
  return null
}

function indicesOf(list) {
  const rows = (list || []).map((item) => ({
    type: String(item.type || ''),
    name: item.name || TYPE_NAME[String(item.type)] || '生活指数',
    category: item.category || '—',
    level: item.level || '',
    text: item.text || '',
    dress: String(item.type) === '3'
  }))
  rows.sort((a, b) => {
    const ao = TYPE_ORDER[a.type] != null ? TYPE_ORDER[a.type] : 9
    const bo = TYPE_ORDER[b.type] != null ? TYPE_ORDER[b.type] : 9
    return ao - bo
  })
  return rows
}

function zhCategory(category) {
  if (!category) return '—'
  return AIR_WORD[category] || category
}

function airColor(level, color) {
  if (color && color.red != null && color.green != null && color.blue != null) {
    return 'rgb(' + color.red + ',' + color.green + ',' + color.blue + ')'
  }
  const map = {
    1: '#3cb371',
    2: '#e6b325',
    3: '#f08a24',
    4: '#e24b4b',
    5: '#9b3d8c',
    6: '#7a1f2b'
  }
  return map[String(level)] || '#5c6b7a'
}

function airOf(result) {
  if (!result || !result.body) return null
  if (result.source === 'v7') {
    const now = result.body.now || {}
    let primary = now.primary
    if (!primary || primary === 'NA') primary = '无'
    return {
      aqi: textOr(now.aqi),
      category: zhCategory(now.category),
      primary,
      standard: '空气质量指数',
      pm25: textOr(now.pm2p5),
      pm10: textOr(now.pm10),
      color: airColor(now.level)
    }
  }
  const indexes = result.body.indexes || []
  let prefer = null
  for (let i = 0; i < indexes.length; i += 1) {
    if (indexes[i].code === 'qaqi') prefer = indexes[i]
  }
  if (!prefer) prefer = indexes[0]
  if (!prefer) return null
  const pollutants = result.body.pollutants || []
  let pm25 = null
  let pm10 = null
  pollutants.forEach((item) => {
    if (item.code === 'pm2p5') pm25 = item
    if (item.code === 'pm10') pm10 = item
  })
  const primary = prefer.primaryPollutant && prefer.primaryPollutant.name
  return {
    aqi: prefer.aqiDisplay != null ? String(prefer.aqiDisplay) : textOr(prefer.aqi),
    category: zhCategory(prefer.category),
    primary: primary || '—',
    standard: prefer.name || '空气质量',
    pm25: pm25 && pm25.concentration ? textOr(pm25.concentration.value) : '—',
    pm10: pm10 && pm10.concentration ? textOr(pm10.concentration.value) : '—',
    color: airColor(prefer.level, prefer.color)
  }
}

function warningColor(name) {
  if (!name) return '#e6b325'
  return WARN_COLOR[name] || WARN_COLOR[String(name).toLowerCase()] || '#e6b325'
}

function warningsOf(result) {
  if (!result || !result.body) return []
  if (result.source === 'v7') {
    return (result.body.warning || []).map((item, index) => ({
      key: item.id || ('w' + index),
      title: item.title || item.typeName || '天气预警',
      text: item.text || '',
      color: warningColor(item.severityColor || item.level),
      meta: [item.sender, item.level, timeline.formatObs(item.pubTime)].filter(Boolean).join(' · ')
    }))
  }
  return (result.body.alerts || []).map((item, index) => {
    const eventName = item.eventType && item.eventType.name
    return {
      key: item.id || ('a' + index),
      title: item.headline || eventName || '天气预警',
      text: item.description || item.instruction || '',
      color: warningColor(item.color && item.color.code),
      meta: [item.senderName, eventName, item.severity, timeline.formatObs(item.issuedTime)].filter(Boolean).join(' · ')
    }
  })
}

function hourNote(pack) {
  if (!pack) return ''
  const names = { '168h': '168 小时', '72h': '72 小时', '24h': '24 小时' }
  const current = names[pack.span] || pack.span
  if (pack.failed && pack.failed.length) {
    const missed = pack.failed.map((item) => names[item] || item).join('、')
    return '已加载未来' + current + '（' + missed + '暂不可用）'
  }
  return '已加载未来' + current
}

module.exports = {
  pickToday,
  themeFor,
  metricsOf,
  dailyCards,
  buildTimeline,
  upcomingRows,
  filterDate,
  groupRows,
  findDay,
  indicesOf,
  airOf,
  warningsOf,
  hourNote,
  textOr
}
