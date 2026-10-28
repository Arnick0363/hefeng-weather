const qweather = require('../../utils/qweather.js')
const cities = require('../../utils/cities.js')
const present = require('../../utils/present.js')
const timeline = require('../../utils/timeline.js')
const icons = require('../../utils/icons.js')

Page({
  data: {
    themeClass: 'theme-clear',
    loading: true,
    error: '',
    hasNow: false,
    cityName: '北京',
    emoji: '🌡️',
    temp: '--',
    text: '',
    high: '--',
    low: '--',
    summary: '',
    sun: { visible: false, left: 0, text: '', sunrise: '—', sunset: '—' },
    metrics: [],
    hours: [],
    hourNote: '',
    hourError: '',
    indices: [],
    indexError: '',
    air: null,
    airError: '',
    warnings: [],
    warningReady: false,
    warningError: ''
  },

  onShow() {
    const city = cities.getCurrent()
    if (!this._cityId || this._cityId !== city.id) this.load()
  },

  onPullDownRefresh() {
    this.load()
  },

  load() {
    const city = cities.getCurrent()
    const token = (this._token || 0) + 1
    this._token = token
    this._cityId = city.id
    this.setData({
      loading: true,
      error: '',
      cityName: city.name || '未知城市'
    })

    const finish = () => {
      if (token !== this._token) return
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
    }

    qweather.getNow(city.id).then((nowBody) => {
      return qweather.settle({
        daily: qweather.getDaily('7d', city.id),
        hourly: qweather.getBestHourly(city.id),
        indices: qweather.getIndices(city.id),
        air: qweather.getAir(city),
        warning: qweather.getWarning(city)
      }).then((rest) => {
        if (token !== this._token || cities.getCurrent().id !== city.id) return
        this.apply(city, nowBody, rest)
      })
    }).catch((err) => {
      if (token !== this._token || cities.getCurrent().id !== city.id) return
      this.setData({
        hasNow: false,
        error: (err && err.message) || '暂时无法获取天气',
        hours: [],
        indices: [],
        warnings: [],
        warningReady: false,
        air: null
      })
    }).then(finish, finish)
  },

  apply(city, nowBody, rest) {
    const now = nowBody.now || {}
    const daily = rest.daily.ok ? (rest.daily.value.daily || []) : []
    const today = present.pickToday(daily)
    const theme = present.themeFor(now.icon, now.text, today && today.sunrise, today && today.sunset)
    const hourlyPack = rest.hourly.ok ? rest.hourly.value : null
    const hourly = hourlyPack ? (hourlyPack.body.hourly || []) : []
    const hours = present.upcomingRows(hourly, daily, city.utcOffset, 24)
    const sun = timeline.sunProgress(today && today.sunrise, today && today.sunset)
    const indices = rest.indices.ok ? present.indicesOf(rest.indices.value.daily || []) : []
    const air = rest.air.ok ? present.airOf(rest.air.value) : null
    const warnings = rest.warning.ok ? present.warningsOf(rest.warning.value) : []

    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: theme.nav,
      animation: { duration: 200, timingFunc: 'linear' }
    })

    this.setData({
      themeClass: theme.className,
      hasNow: true,
      error: '',
      emoji: icons.iconOf(now.icon, now.text),
      temp: present.textOr(now.temp),
      text: now.text || '—',
      high: today ? present.textOr(today.tempMax) : '—',
      low: today ? present.textOr(today.tempMin) : '—',
      summary: (now.windDir || '') + (now.windScale ? ' ' + now.windScale + '级' : ''),
      sun,
      metrics: present.metricsOf(now),
      hours,
      hourNote: present.hourNote(hourlyPack),
      hourError: rest.hourly.ok ? '' : ((rest.hourly.reason && rest.hourly.reason.message) || '逐小时预报暂不可用'),
      indices,
      indexError: rest.indices.ok ? (indices.length ? '' : '今天暂无生活指数') : ((rest.indices.reason && rest.indices.reason.message) || '生活指数暂不可用'),
      air,
      airError: rest.air.ok ? (air ? '' : '暂无空气质量') : ((rest.air.reason && rest.air.reason.message) || '空气质量暂不可用'),
      warnings,
      warningReady: !!rest.warning.ok,
      warningError: rest.warning.ok ? '' : ((rest.warning.reason && rest.warning.reason.message) || '天气预警暂不可用'),
      dailyError: rest.daily.ok ? '' : ((rest.daily.reason && rest.daily.reason.message) || '今日高低温暂不可用')
    })
  },

  goCities() {
    wx.redirectTo({ url: '/pages/cities/cities' })
  },

  goSatellite() {
    wx.redirectTo({ url: '/pages/satellite/satellite' })
  },

  goForecast() {
    wx.redirectTo({ url: '/pages/forecast/forecast' })
  },

  goHourly() {
    wx.navigateTo({ url: '/pages/hourly/hourly' })
  }
})
