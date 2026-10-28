const KEY = 'hf_cities_v1'

const HOT = [
  { id: '101010100', name: '北京', adm1: '北京市', adm2: '北京', lat: '39.90', lon: '116.41', utcOffset: '+08:00' },
  { id: '101020100', name: '上海', adm1: '上海市', adm2: '上海', lat: '31.23', lon: '121.47', utcOffset: '+08:00' },
  { id: '101280101', name: '广州', adm1: '广东省', adm2: '广州', lat: '23.13', lon: '113.26', utcOffset: '+08:00' },
  { id: '101280601', name: '深圳', adm1: '广东省', adm2: '深圳', lat: '22.54', lon: '114.06', utcOffset: '+08:00' },
  { id: '101210101', name: '杭州', adm1: '浙江省', adm2: '杭州', lat: '30.27', lon: '120.16', utcOffset: '+08:00' },
  { id: '101270101', name: '成都', adm1: '四川省', adm2: '成都', lat: '30.57', lon: '104.07', utcOffset: '+08:00' },
  { id: '101200101', name: '武汉', adm1: '湖北省', adm2: '武汉', lat: '30.59', lon: '114.31', utcOffset: '+08:00' },
  { id: '101110101', name: '西安', adm1: '陕西省', adm2: '西安', lat: '34.34', lon: '108.94', utcOffset: '+08:00' },
  { id: '101190101', name: '南京', adm1: '江苏省', adm2: '南京', lat: '32.06', lon: '118.80', utcOffset: '+08:00' },
  { id: '101040100', name: '重庆', adm1: '重庆市', adm2: '重庆', lat: '29.56', lon: '106.55', utcOffset: '+08:00' },
  { id: '101030100', name: '天津', adm1: '天津市', adm2: '天津', lat: '39.13', lon: '117.20', utcOffset: '+08:00' },
  { id: '101190401', name: '苏州', adm1: '江苏省', adm2: '苏州', lat: '31.30', lon: '120.62', utcOffset: '+08:00' },
  { id: '101250101', name: '长沙', adm1: '湖南省', adm2: '长沙', lat: '28.23', lon: '112.94', utcOffset: '+08:00' },
  { id: '101180101', name: '郑州', adm1: '河南省', adm2: '郑州', lat: '34.75', lon: '113.63', utcOffset: '+08:00' },
  { id: '101120201', name: '青岛', adm1: '山东省', adm2: '青岛', lat: '36.07', lon: '120.38', utcOffset: '+08:00' },
  { id: '101230201', name: '厦门', adm1: '福建省', adm2: '厦门', lat: '24.48', lon: '118.09', utcOffset: '+08:00' },
  { id: '101290101', name: '昆明', adm1: '云南省', adm2: '昆明', lat: '25.04', lon: '102.71', utcOffset: '+08:00' },
  { id: '101070201', name: '大连', adm1: '辽宁省', adm2: '大连', lat: '38.91', lon: '121.61', utcOffset: '+08:00' },
  { id: '101050101', name: '哈尔滨', adm1: '黑龙江省', adm2: '哈尔滨', lat: '45.80', lon: '126.54', utcOffset: '+08:00' },
  { id: '101310201', name: '三亚', adm1: '海南省', adm2: '三亚', lat: '18.25', lon: '109.51', utcOffset: '+08:00' }
]

function seed() {
  return {
    currentId: HOT[0].id,
    list: [Object.assign({ country: '中国' }, HOT[0])]
  }
}

function read() {
  let data = null
  try {
    data = wx.getStorageSync(KEY)
  } catch (err) {
    data = null
  }
  if (!data || !data.list || !data.list.length) {
    data = seed()
    try {
      wx.setStorageSync(KEY, data)
    } catch (err) {
      return data
    }
  }
  return data
}

function write(data) {
  wx.setStorageSync(KEY, data)
}

function ensure() {
  read()
}

function getCurrent() {
  const data = read()
  const found = data.list.find((item) => item.id === data.currentId)
  return found || data.list[0]
}

function fromLocation(loc) {
  return {
    id: loc && loc.id ? String(loc.id) : '',
    name: (loc && loc.name) || '',
    adm1: (loc && loc.adm1) || '',
    adm2: (loc && loc.adm2) || '',
    lat: loc && loc.lat != null ? String(loc.lat) : '',
    lon: loc && loc.lon != null ? String(loc.lon) : '',
    country: (loc && loc.country) || '',
    tz: (loc && loc.tz) || '',
    utcOffset: (loc && loc.utcOffset) || '+08:00'
  }
}

function adminLine(city) {
  const adm1 = (city && city.adm1) || '—'
  const adm2 = (city && city.adm2) || '—'
  return '省份 ' + adm1 + ' · 上级 ' + adm2
}

function add(city) {
  if (!city || !city.id) return { ok: false, message: '城市信息不完整' }
  const data = read()
  const list = data.list.slice()
  const index = list.findIndex((item) => item.id === city.id)
  if (index >= 0) list[index] = Object.assign({}, list[index], city)
  else list.unshift(city)
  write({ currentId: city.id, list })
  return { ok: true, existed: index >= 0 }
}

function remove(id) {
  const data = read()
  if (data.list.length <= 1) return { ok: false, message: '至少保留一个城市' }
  const list = data.list.filter((item) => item.id !== id)
  if (list.length === data.list.length) return { ok: false, message: '没有找到这个城市' }
  const currentId = data.currentId === id ? list[0].id : data.currentId
  write({ currentId, list })
  return { ok: true }
}

function setCurrent(id) {
  const data = read()
  if (!data.list.some((item) => item.id === id)) return { ok: false, message: '没有找到这个城市' }
  data.currentId = id
  write(data)
  return { ok: true }
}

module.exports = {
  HOT,
  read,
  ensure,
  getCurrent,
  fromLocation,
  adminLine,
  add,
  remove,
  setCurrent
}
