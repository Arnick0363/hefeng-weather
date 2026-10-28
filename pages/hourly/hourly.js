const qweather = require('../../utils/qweather.js')
const cities = require('../../utils/cities.js')
const present = require('../../utils/present.js')
const timeline = require('../../utils/timeline.js')

Page({
  data: {
    cityName: '北京',
    focusDate: '',
    focusLabel: '',
    focusSun: '',
    loading: true,
    error: '',
    emptyDay: false,
    groups: [],
    hourNote: ''
  },

  onLoad(options) {
    const sunrise = options && options.sunrise
    const sunset = options && options.sunset
    const sunriseOk = sunrise && sunrise !== '—'
    const sunsetOk = sunset && sunset !== '—'
    this._focusDate = (options && options.date) || ''
    this._passedSun = (sunriseOk || sunsetOk)
      ? ('日出 ' + (sunriseOk ? sunrise : '—') + ' · 日落 ' + (sunsetOk ? sunset : '—'))
      : ''
    this.setData({
      focusDate: this._focusDate,
      passedSun: this._passedSun
    })
  },

  onShow() {
    const city = cities.getCurrent()
    const focus = this._focusDate || ''
    if (this._cityId !== city.id || this._loadedFocus !== focus || !this._ready) {
      this._cityId = city.id
      this._loadedFocus = focus
      this.load()
    }
  },

  load() {
    const city = cities.getCurrent()
    const token = (this._token || 0) + 1
    this._token = token
    this.setData({ loading: true, error: '', cityName: city.name })
    qweather.settle({
      hourly: qweather.getBestHourly(city.id),
      daily: qweather.getDaily('7d', city.id)
    }).then((rest) => {
      if (token !== this._token) return
      if (!rest.hourly.ok) {
        this._rows = []
        this._daily = []
        this._ready = false
        this.setData({
          loading: false,
          groups: [],
          error: (rest.hourly.reason && rest.hourly.reason.message) || '逐小时预报暂不可用'
        })
        return
      }
      this._rows = present.buildTimeline(
        rest.hourly.value.body.hourly || [],
        rest.daily.ok ? (rest.daily.value.daily || []) : [],
        city.utcOffset
      )
      this._daily = rest.daily.ok ? (rest.daily.value.daily || []) : []
      this._hourNote = present.hourNote(rest.hourly.value)
      this._ready = true
      this.render()
    })
  },

  render() {
    const focus = this._focusDate || ''
    const filtered = present.filterDate(this._rows || [], focus)
    const hourCount = filtered.filter((row) => row.kind === 'hour').length
    const emptyDay = !!(focus && hourCount === 0)
    const day = focus ? present.findDay(this._daily || [], focus) : null
    let focusSun = ''
    if (day && (day.sunrise || day.sunset)) {
      focusSun = '日出 ' + (day.sunrise || '—') + ' · 日落 ' + (day.sunset || '—')
    } else if (this._passedSun) {
      focusSun = this._passedSun
    }
    this.setData({
      loading: false,
      error: '',
      focusDate: focus,
      emptyDay,
      groups: emptyDay ? [] : present.groupRows(focus ? filtered : (this._rows || [])),
      hourNote: this._hourNote || '',
      focusLabel: focus ? timeline.dayTitle(focus) : '',
      focusSun
    })
  },

  showAll() {
    this._focusDate = ''
    this._loadedFocus = ''
    this.render()
  }
})
