const qweather = require('../../utils/qweather.js')
const cities = require('../../utils/cities.js')
const present = require('../../utils/present.js')

Page({
  data: {
    cityName: '北京',
    span: '7d',
    days: [],
    loading: true,
    listError: ''
  },

  onShow() {
    const city = cities.getCurrent()
    if (!this._cityId || this._cityId !== city.id) {
      this._cityId = city.id
      this._cache = {}
      this.setData({ cityName: city.name, span: '7d', days: [] })
      this.loadSpan('7d')
    }
  },

  onPullDownRefresh() {
    this._cache = {}
    this.loadSpan(this.data.span)
  },

  onSpan(event) {
    const span = event.currentTarget.dataset.span
    if (!span || span === this.data.span) return
    this.loadSpan(span)
  },

  loadSpan(span) {
    const city = cities.getCurrent()
    this._cache = this._cache || {}
    this._span = span
    this.setData({ span, cityName: city.name })
    if (this._cache[span]) {
      this.setData({
        days: this._cache[span],
        listError: '',
        loading: false
      })
      wx.stopPullDownRefresh()
      return
    }
    this.setData({ loading: true, listError: '', days: [] })
    qweather.getDaily(span, city.id).then((body) => {
      if (cities.getCurrent().id !== city.id || this._span !== span) return
      const days = present.dailyCards(body.daily || [])
      this._cache[span] = days
      this.setData({
        days,
        loading: false,
        listError: days.length ? '' : '暂无预报数据'
      })
    }).catch((err) => {
      if (cities.getCurrent().id !== city.id || this._span !== span) return
      this.setData({
        days: [],
        loading: false,
        listError: qweather.dailyErrorText(span, err)
      })
    }).then(() => {
      wx.stopPullDownRefresh()
    }, () => {
      wx.stopPullDownRefresh()
    })
  },

  openDay(event) {
    const date = event.currentTarget.dataset.date
    if (!date) return
    const sunrise = event.currentTarget.dataset.sunrise || ''
    const sunset = event.currentTarget.dataset.sunset || ''
    wx.navigateTo({
      url: '/pages/hourly/hourly?date=' + date + '&sunrise=' + sunrise + '&sunset=' + sunset
    })
  }
})
