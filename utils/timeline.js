const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function pad(number) {
  return number < 10 ? '0' + number : '' + number
}

function ymd(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
}

function todayString(now) {
  return ymd(now || new Date())
}

function tomorrowString(now) {
  const date = new Date(now || Date.now())
  date.setDate(date.getDate() + 1)
  return ymd(date)
}

function weekdayIndex(dateStr) {
  const parts = String(dateStr || '').split('-').map(Number)
  if (parts.length < 3 || !parts[0]) return 0
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).getUTCDay()
}

function monthDay(dateStr) {
  const parts = String(dateStr || '').split('-')
  if (parts.length < 3) return dateStr || ''
  return Number(parts[1]) + '月' + Number(parts[2]) + '日'
}

function dayTitle(dateStr, now) {
  if (!dateStr) return ''
  const md = monthDay(dateStr)
  if (dateStr === todayString(now)) return '今天 ' + md
  if (dateStr === tomorrowString(now)) return '明天 ' + md
  return WEEK[weekdayIndex(dateStr)] + ' ' + md
}

function weekLabel(dateStr, now) {
  if (!dateStr) return ''
  if (dateStr === todayString(now)) return '今天'
  if (dateStr === tomorrowString(now)) return '明天'
  return WEEK[weekdayIndex(dateStr)]
}

function parseIso(iso) {
  const time = Date.parse(iso)
  return Number.isNaN(time) ? null : time
}

function clockOnDate(dateStr, hm, offset) {
  if (!dateStr || !hm) return null
  const off = offset || '+08:00'
  const time = Date.parse(dateStr + 'T' + hm + ':00' + off)
  return Number.isNaN(time) ? null : time
}

function hmOf(iso) {
  const matched = String(iso || '').match(/T(\d{2}):(\d{2})/)
  return matched ? matched[1] + ':' + matched[2] : ''
}

function dateOf(iso) {
  const matched = String(iso || '').match(/(\d{4}-\d{2}-\d{2})/)
  return matched ? matched[1] : ''
}

function formatObs(iso) {
  const matched = String(iso || '').match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!matched) return iso || '—'
  return Number(matched[2]) + '月' + Number(matched[3]) + '日 ' + matched[4] + ':' + matched[5]
}

/**
 * 把日出、日落插进逐小时序列中间。
 * 只保留落在第一条和最后一条小时预报之间的时刻，避免被单独堆到列表末尾。
 * 时刻相同的时候，日出/日落排在该小时之前，这样 06:00 的日出会落在 05:00 和 06:00 之间。
 */
function mergeSun(hourly, daily, offset) {
  const hours = (hourly || []).map((item) => ({
    kind: 'hour',
    ts: parseIso(item.fxTime),
    raw: item
  })).filter((item) => item.ts != null)

  hours.sort((a, b) => a.ts - b.ts)
  if (!hours.length) return []

  const first = hours[0].ts
  const last = hours[hours.length - 1].ts
  const suns = []
  ;(daily || []).forEach((day) => {
    const sunrise = clockOnDate(day.fxDate, day.sunrise, offset)
    const sunset = clockOnDate(day.fxDate, day.sunset, offset)
    if (sunrise != null && sunrise > first && sunrise < last) {
      suns.push({
        kind: 'sunrise',
        ts: sunrise,
        date: day.fxDate,
        label: '日出 ' + day.sunrise
      })
    }
    if (sunset != null && sunset > first && sunset < last) {
      suns.push({
        kind: 'sunset',
        ts: sunset,
        date: day.fxDate,
        label: '日落 ' + day.sunset
      })
    }
  })

  const merged = hours.concat(suns)
  merged.sort((a, b) => {
    if (a.ts !== b.ts) return a.ts - b.ts
    if (a.kind === 'hour' && b.kind !== 'hour') return 1
    if (a.kind !== 'hour' && b.kind === 'hour') return -1
    return 0
  })
  return merged
}

function upcoming(rows, limitHours, now) {
  const cursor = (now || Date.now()) - 30 * 60 * 1000
  const limit = limitHours || 24
  let start = 0
  let found = false
  for (let i = 0; i < rows.length; i += 1) {
    if (rows[i].kind === 'hour' && rows[i].ts >= cursor) {
      start = i
      found = true
      break
    }
  }
  if (!found) {
    let count = 0
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      if (rows[i].kind === 'hour') count += 1
      if (count >= limit) {
        start = i
        break
      }
    }
  }
  const sliced = []
  let count = 0
  for (let i = start; i < rows.length; i += 1) {
    if (rows[i].kind === 'hour') {
      if (count >= limit) break
      count += 1
    }
    sliced.push(rows[i])
  }
  return sliced
}

function sunProgress(sunrise, sunset, now) {
  const startMatch = String(sunrise || '').match(/^(\d{1,2}):(\d{2})/)
  const endMatch = String(sunset || '').match(/^(\d{1,2}):(\d{2})/)
  if (!startMatch || !endMatch) {
    return { visible: false, left: 0, text: '暂无日出日落时间', sunrise: sunrise || '—', sunset: sunset || '—' }
  }
  const start = Number(startMatch[1]) * 60 + Number(startMatch[2])
  const end = Number(endMatch[1]) * 60 + Number(endMatch[2])
  if (end <= start) {
    return { visible: false, left: 0, text: '暂无日出日落时间', sunrise, sunset }
  }
  const current = now || new Date()
  const cursor = current.getHours() * 60 + current.getMinutes()
  let ratio = (cursor - start) / (end - start)
  let text = ''
  if (cursor < start) {
    ratio = 0
    text = '日出前'
  } else if (cursor >= end) {
    ratio = 1
    text = '已日落'
  } else {
    text = '白昼已过 ' + Math.round(ratio * 100) + '%'
  }
  return {
    visible: true,
    left: Math.round(ratio * 100),
    text,
    sunrise,
    sunset
  }
}

module.exports = {
  WEEK,
  pad,
  ymd,
  todayString,
  dayTitle,
  weekLabel,
  monthDay,
  hmOf,
  dateOf,
  formatObs,
  mergeSun,
  upcoming,
  sunProgress,
  clockOnDate
}
