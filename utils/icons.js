const ICONS = {
  100: '☀️',
  101: '⛅',
  102: '🌤️',
  103: '🌤️',
  104: '☁️',
  150: '🌙',
  151: '☁️',
  152: '☁️',
  153: '☁️',
  300: '🌦️',
  301: '🌧️',
  302: '⛈️',
  303: '⛈️',
  304: '⛈️',
  305: '🌦️',
  306: '🌧️',
  307: '🌧️',
  308: '🌧️',
  309: '🌦️',
  310: '🌧️',
  311: '🌧️',
  312: '🌧️',
  313: '🌧️',
  314: '🌦️',
  315: '🌧️',
  316: '🌧️',
  317: '🌧️',
  318: '🌧️',
  399: '🌧️',
  400: '🌨️',
  401: '❄️',
  402: '❄️',
  403: '☃️',
  404: '🌨️',
  405: '🌨️',
  406: '🌨️',
  407: '🌨️',
  408: '🌨️',
  409: '❄️',
  410: '☃️',
  499: '❄️',
  500: '🌫️',
  501: '🌫️',
  502: '😷',
  503: '💨',
  504: '💨',
  507: '💨',
  508: '💨',
  509: '🌫️',
  510: '🌫️',
  511: '😷',
  512: '😷',
  513: '😷',
  514: '🌫️',
  515: '🌫️',
  900: '🥵',
  901: '🥶',
  999: '🌡️'
}

const THEMES = {
  clear: { className: 'theme-clear', nav: '#14386f' },
  'clear-night': { className: 'theme-clear-night', nav: '#0c1730' },
  cloudy: { className: 'theme-cloudy', nav: '#1e3d5c' },
  'cloudy-night': { className: 'theme-cloudy-night', nav: '#152433' },
  overcast: { className: 'theme-overcast', nav: '#2a3644' },
  'overcast-night': { className: 'theme-overcast-night', nav: '#1b242e' },
  rain: { className: 'theme-rain', nav: '#12344f' },
  'rain-night': { className: 'theme-rain-night', nav: '#0d2233' },
  thunder: { className: 'theme-thunder', nav: '#24183f' },
  snow: { className: 'theme-snow', nav: '#24364a' },
  'snow-night': { className: 'theme-snow-night', nav: '#172430' },
  fog: { className: 'theme-fog', nav: '#2c3844' },
  haze: { className: 'theme-haze', nav: '#4a3b32' },
  wind: { className: 'theme-wind', nav: '#0f4c5c' },
  'wind-night': { className: 'theme-wind-night', nav: '#0c3038' }
}

function iconOf(code, text) {
  const key = String(code || '')
  if (ICONS[key]) return ICONS[key]
  if (/雪/.test(text || '')) return '❄️'
  if (/雷/.test(text || '')) return '⛈️'
  if (/雨/.test(text || '')) return '🌧️'
  if (/雾/.test(text || '')) return '🌫️'
  if (/霾|沙|尘/.test(text || '')) return '😷'
  if (/风/.test(text || '')) return '💨'
  if (/晴/.test(text || '')) return '☀️'
  if (/云|阴/.test(text || '')) return '☁️'
  return '🌡️'
}

function minutesOf(hm) {
  const matched = String(hm || '').match(/^(\d{1,2}):(\d{2})/)
  if (!matched) return null
  return Number(matched[1]) * 60 + Number(matched[2])
}

function isNight(icon, sunrise, sunset, now) {
  const code = parseInt(icon, 10)
  if (code >= 150 && code <= 153) return true
  const start = minutesOf(sunrise)
  const end = minutesOf(sunset)
  if (start == null || end == null || end <= start) return false
  const current = now || new Date()
  const cursor = current.getHours() * 60 + current.getMinutes()
  return cursor < start || cursor >= end
}

function themeKey(icon, text, night) {
  const code = parseInt(icon, 10)
  const label = text || ''
  if (/雪/.test(label) || (code >= 400 && code < 500)) return night ? 'snow-night' : 'snow'
  if (/雷/.test(label) || code === 302 || code === 303 || code === 304) return 'thunder'
  if (/雨|冻雨/.test(label) || (code >= 300 && code < 400)) return night ? 'rain-night' : 'rain'
  if (/雾/.test(label) || [500, 501, 509, 510, 514, 515].indexOf(code) >= 0) return 'fog'
  if (/霾|沙|尘/.test(label) || [502, 503, 504, 507, 508, 511, 512, 513].indexOf(code) >= 0) return 'haze'
  if (/风/.test(label) && !/雨|雪|云|晴|阴/.test(label)) return night ? 'wind-night' : 'wind'
  if (code === 104 || /阴/.test(label)) return night ? 'overcast-night' : 'overcast'
  if ([101, 102, 103, 151, 152, 153].indexOf(code) >= 0 || /云/.test(label)) {
    return night ? 'cloudy-night' : 'cloudy'
  }
  return night ? 'clear-night' : 'clear'
}

function themeOf(icon, text, sunrise, sunset, now) {
  const night = isNight(icon, sunrise, sunset, now)
  const key = themeKey(icon, text, night)
  return THEMES[key] || THEMES.clear
}

module.exports = {
  iconOf,
  isNight,
  minutesOf,
  themeOf
}
