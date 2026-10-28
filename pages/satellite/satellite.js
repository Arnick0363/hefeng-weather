const cities = require('../../utils/cities.js')
const cloud = require('../../utils/cloud.js')

Page({
  data: {
    cityName: '',
    hasCoord: false,
    latitude: 39.9,
    longitude: 116.41,
    markers: [],
    frames: [],
    index: 0,
    playing: false,
    imgError: false
  },

  onShow() {
    const city = cities.getCurrent()
    if (this._cityId === city.id && this.data.frames.length) return
    this._cityId = city.id
    this._shifted = false
    this.pause()
    this.prepare(city, 60)
  },

  onHide() {
    this.pause()
  },

  onUnload() {
    this.pause()
  },

  prepare(city, delayMinutes) {
    const lat = Number(city.lat)
    const lon = Number(city.lon)
    const hasCoord = Number.isFinite(lat) && Number.isFinite(lon)
    const frames = cloud.buildFrames(8, delayMinutes)
    const marker = hasCoord ? [{
      id: 1,
      latitude: lat,
      longitude: lon,
      width: 32,
      height: 32,
      iconPath: '/images/marker.png',
      callout: {
        content: city.name || '当前城市',
        display: 'ALWAYS',
        padding: 8,
        borderRadius: 8,
        bgColor: '#ffffff',
        color: '#1a2332',
        fontSize: 14
      }
    }] : []
    this.setData({
      cityName: city.name || '当前城市',
      hasCoord,
      latitude: hasCoord ? lat : 39.9,
      longitude: hasCoord ? lon : 116.41,
      markers: marker,
      frames,
      index: Math.max(frames.length - 1, 0),
      imgError: false
    })
  },

  toggle() {
    if (this.data.playing) this.pause()
    else this.play()
  },

  play() {
    if (!this.data.frames.length) return
    this.pause()
    this.setData({ playing: true, imgError: false })
    this._timer = setInterval(() => {
      const total = this.data.frames.length
      if (!total) return
      this.setData({
        index: (this.data.index + 1) % total,
        imgError: false
      })
    }, 800)
  },

  pause() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
    if (this.data.playing) this.setData({ playing: false })
  },

  onSlide(event) {
    this.pause()
    this.setData({
      index: Number(event.detail.value) || 0,
      imgError: false
    })
  },

  onImgError() {
    if (!this._shifted) {
      this._shifted = true
      this.pause()
      this.prepare(cities.getCurrent(), 120)
      return
    }
    this.setData({ imgError: true, playing: false })
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  }
})
