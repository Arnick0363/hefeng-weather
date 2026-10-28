const env = require('../config/env.js')

function fail(code, status, message, fatal, endpoint) {
  return {
    code: code || '',
    status: status || 0,
    message: message,
    fatal: !!fatal,
    endpoint: endpoint || ''
  }
}

function normalizedHost() {
  return String(env.apiHost || '').trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '')
}

function explain(status, body, endpoint) {
  const error = body && typeof body === 'object' ? body.error : null
  const title = error && error.title ? String(error.title) : ''
  const type = error && error.type ? String(error.type) : ''
  const apiCode = body && typeof body === 'object' && body.code != null ? String(body.code) : ''
  let message = '天气数据获取失败，请稍后重试。'
  let fatal = false

  if (!normalizedHost()) {
    message = '尚未配置 API Host。请打开和风天气控制台的「设置」，复制 API Host，填入 config/env.js 的 apiHost。'
    fatal = true
  } else if (title === 'Invalid Host' || type.indexOf('invalid-host') >= 0) {
    message = 'API Host 无效或未授权。请到和风天气控制台「设置」核对后填入 config/env.js。公共地址已经不能使用。'
    fatal = true
  } else if (status === 401 || title === 'Unauthorized' || apiCode === '401') {
    message = '凭据无效或未通过鉴权。请检查 config/env.js 里的 API KEY。'
    fatal = true
  } else if (title === 'No Credit' || apiCode === '402') {
    message = '账号额度不足，或当前套餐不包含这项数据。'
  } else if (title === 'Overdue') {
    message = '账号有逾期账单，接口已拒绝请求。'
    fatal = true
  } else if (title === 'Deprecated') {
    message = '这个接口已经停用。'
  } else if (title === 'Security Restriction') {
    message = '请求被安全限制拒绝。请检查凭据的应用限制。'
    fatal = true
  } else if (title === 'Account Suspension') {
    message = '和风天气账号已被冻结。'
    fatal = true
  } else if (title === 'Forbidden' || apiCode === '403') {
    message = '当前套餐没有访问这项数据的权限。'
  } else if (status === 404 || title === 'Not Found' || apiCode === '404') {
    message = '没有找到对应的数据。'
  } else if (title === 'Invalid Parameter' || title === 'Invalid Parameters' || apiCode === '400') {
    message = '请求参数不正确。'
  } else if (status === 429 || title === 'Too Many Requests' || apiCode === '429') {
    message = '请求过于频繁，请稍后再试。'
    fatal = true
  } else if (apiCode === '204') {
    message = '这个地点暂时没有对应数据。'
  } else if (status >= 500 || apiCode === '500') {
    message = '和风天气服务暂时没有响应。'
  } else if (typeof body === 'string') {
    message = '服务器返回了无法识别的内容。请确认 API Host 是否填写正确。'
  }

  return fail(apiCode || title || 'ERROR', status, message, fatal, endpoint)
}

function request(path, query) {
  return new Promise((resolve, reject) => {
    const host = normalizedHost()
    if (!host) {
      reject(explain(0, null, path))
      return
    }
    if (!env.apiKey) {
      reject(fail('NO_KEY', 0, '尚未填写 API KEY。请写入 config/env.js。', true, path))
      return
    }

    const header = { Accept: 'application/json' }
    const data = {}
    const source = query || {}
    Object.keys(source).forEach((key) => {
      if (source[key] !== undefined && source[key] !== null && source[key] !== '') {
        data[key] = source[key]
      }
    })
    if (env.authMode === 'query') data.key = env.apiKey
    else header['X-QW-Api-Key'] = env.apiKey

    wx.request({
      url: 'https://' + host + path,
      method: 'GET',
      data,
      header,
      timeout: 15000,
      success(res) {
        const body = res.data
        const status = res.statusCode || 0
        if (body && typeof body === 'object' && body.error) {
          reject(explain(status, body, path))
          return
        }
        if (body && typeof body === 'object' && body.code != null) {
          const code = String(body.code)
          if (code === '200' || code === '204') {
            resolve(body)
            return
          }
          reject(explain(status, body, path))
          return
        }
        if (status >= 200 && status < 300 && body && typeof body === 'object') {
          resolve(body)
          return
        }
        reject(explain(status, body, path))
      },
      fail() {
        reject(fail('NETWORK', 0, '网络请求失败。请检查网络；开发阶段需关闭域名校验，上线前配置合法域名。', false, path))
      }
    })
  })
}

function lang() {
  return env.lang || 'zh'
}

function round2(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return null
  return number.toFixed(2)
}

function getNow(location) {
  return request('/v7/weather/now', { location, lang: lang() }).then((body) => {
    if (String(body.code) !== '200' || !body.now) {
      return Promise.reject(fail(body.code, 200, '暂无实况天气。', false, '/v7/weather/now'))
    }
    return body
  })
}

function getDaily(days, location) {
  const path = '/v7/weather/' + days
  return request(path, { location, lang: lang() }).then((body) => {
    if (String(body.code) !== '200' || !body.daily) {
      return Promise.reject(fail(body.code, 200, '暂无这段预报。', false, path))
    }
    return body
  })
}

function getBestHourly(location) {
  const order = ['168h', '72h', '24h']
  const failed = []

  const step = (index) => {
    if (index >= order.length) {
      return Promise.reject(fail('NO_HOUR', 0, '逐小时预报暂不可用。', false, '/v7/weather/24h'))
    }
    const span = order[index]
    const path = '/v7/weather/' + span
    return request(path, { location, lang: lang() }).then((body) => {
      if (String(body.code) === '200' && body.hourly && body.hourly.length) {
        return { span, body, failed: failed.slice() }
      }
      failed.push(span)
      return step(index + 1)
    }).catch((err) => {
      if (err && err.fatal) return Promise.reject(err)
      failed.push(span)
      return step(index + 1)
    })
  }

  return step(0)
}

function getIndices(location) {
  return request('/v7/indices/1d', {
    type: '1,2,3,5,6',
    location,
    lang: lang()
  }).then((body) => {
    if (String(body.code) !== '200') {
      return Promise.reject(fail(body.code, 200, '生活指数暂无数据。', false, '/v7/indices/1d'))
    }
    return body
  })
}

function getAirV1(city) {
  const lat = round2(city && city.lat)
  const lon = round2(city && city.lon)
  if (lat == null || lon == null) {
    return Promise.reject(fail('NO_COORD', 0, '缺少经纬度，无法查询空气质量。', false, '/airquality/v1/current'))
  }
  const path = '/airquality/v1/current/' + lat + '/' + lon
  return request(path, { lang: lang() }).then((body) => ({ source: 'v1', body }))
}

function getAir(city) {
  return request('/v7/air/now', { location: city.id, lang: lang() }).then((body) => {
    if (String(body.code) === '200' && body.now) return { source: 'v7', body }
    return getAirV1(city)
  }).catch((err) => {
    if (err && err.fatal) return Promise.reject(err)
    return getAirV1(city)
  })
}

function getWarningV1(city) {
  const lat = round2(city && city.lat)
  const lon = round2(city && city.lon)
  if (lat == null || lon == null) {
    return Promise.reject(fail('NO_COORD', 0, '缺少经纬度，无法查询天气预警。', false, '/weatheralert/v1/current'))
  }
  const path = '/weatheralert/v1/current/' + lat + '/' + lon
  return request(path, { localTime: true, lang: lang() }).then((body) => ({ source: 'v1', body }))
}

function getWarning(city) {
  return request('/v7/warning/now', { location: city.id, lang: lang() }).then((body) => {
    if (String(body.code) === '200' || String(body.code) === '204') return { source: 'v7', body }
    return getWarningV1(city)
  }).catch((err) => {
    if (err && err.fatal) return Promise.reject(err)
    return getWarningV1(city)
  })
}

function searchCity(keyword) {
  return request('/geo/v2/city/lookup', {
    location: keyword,
    range: 'cn',
    number: 10,
    lang: 'zh'
  }).then((body) => {
    if (String(body.code) === '200') return body
    return { code: body.code, location: [] }
  })
}

function lookupCoord(lon, lat) {
  const lo = round2(lon)
  const la = round2(lat)
  if (lo == null || la == null) {
    return Promise.reject(fail('NO_COORD', 0, '定位坐标无效。', false, '/geo/v2/city/lookup'))
  }
  return request('/geo/v2/city/lookup', {
    location: lo + ',' + la,
    range: 'cn',
    number: 10,
    lang: 'zh'
  }).then((body) => {
    if (String(body.code) !== '200') {
      return Promise.reject(fail(body.code, 200, '没有根据坐标找到城市。', false, '/geo/v2/city/lookup'))
    }
    return body
  })
}

function settle(pairs) {
  const keys = Object.keys(pairs)
  return Promise.all(keys.map((key) => pairs[key].then(
    (value) => ({ key, ok: true, value }),
    (reason) => ({ key, ok: false, reason })
  ))).then((list) => {
    const map = {}
    list.forEach((item) => {
      map[item.key] = item
    })
    return map
  })
}

function dailyErrorText(span, err) {
  const message = (err && err.message) || '暂时无法获取预报'
  if (err && err.fatal) return message
  if (span === '15d' || span === '30d') {
    return message + ' 15 日和 30 日预报常常受套餐限制，开通后即可显示。'
  }
  return message
}

module.exports = {
  getNow,
  getDaily,
  getBestHourly,
  getIndices,
  getAir,
  getWarning,
  searchCity,
  lookupCoord,
  settle,
  dailyErrorText,
  normalizedHost
}
