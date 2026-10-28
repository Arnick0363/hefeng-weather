const qweather = require('../../utils/qweather.js')
const cities = require('../../utils/cities.js')

Page({
  data: {
    keyword: '',
    searching: false,
    locating: false,
    searchError: '',
    results: [],
    hot: [],
    mine: [],
    onlyOne: true
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const saved = cities.read()
    const mine = saved.list.map((item) => Object.assign({}, item, {
      current: item.id === saved.currentId,
      line: cities.adminLine(item)
    }))
    const hot = cities.HOT.map((item) => Object.assign({}, item, {
      added: saved.list.some((city) => city.id === item.id),
      line: cities.adminLine(item)
    }))
    const known = {}
    saved.list.forEach((item) => {
      known[item.id] = true
    })
    const results = (this.data.results || []).map((item) => Object.assign({}, item, {
      added: !!known[item.id]
    }))
    this.setData({
      mine,
      hot,
      results,
      onlyOne: saved.list.length <= 1
    })
  },

  onInput(event) {
    const keyword = event.detail.value
    this.setData({ keyword })
    if (this._timer) clearTimeout(this._timer)
    const text = keyword.trim()
    if (!text) {
      this._seq = (this._seq || 0) + 1
      this.setData({ results: [], searching: false, searchError: '' })
      return
    }
    this._timer = setTimeout(() => this.search(text), 350)
  },

  search(keyword) {
    const seq = (this._seq || 0) + 1
    this._seq = seq
    this.setData({ searching: true, searchError: '' })
    qweather.searchCity(keyword).then((body) => {
      if (seq !== this._seq) return
      const saved = cities.read().list
      const results = (body.location || []).map(cities.fromLocation).filter((item) => item.id).map((item) => Object.assign({}, item, {
        added: saved.some((city) => city.id === item.id),
        line: cities.adminLine(item)
      }))
      this.setData({
        searching: false,
        results,
        searchError: results.length ? '' : '没有找到相关城市，可以试试城市名、区县或拼音。'
      })
    }).catch((err) => {
      if (seq !== this._seq) return
      const code = err && (err.code || String(err.status || ''))
      const missing = code === '404' || code === '204'
      this.setData({
        searching: false,
        results: [],
        searchError: missing ? '没有找到相关城市，可以试试城市名、区县或拼音。' : ((err && err.message) || '搜索失败')
      })
    })
  },

  onAddResult(event) {
    const index = Number(event.currentTarget.dataset.index)
    const city = this.data.results[index]
    if (!city) return
    const result = cities.add(city)
    wx.showToast({
      title: result.existed ? '已切换到' + city.name : '已添加' + city.name,
      icon: 'none'
    })
    this.refresh()
  },

  onHot(event) {
    const id = event.currentTarget.dataset.id
    const city = cities.HOT.find((item) => item.id === id)
    if (!city) return
    const result = cities.add(Object.assign({ country: '中国' }, city))
    wx.showToast({
      title: result.existed ? '已切换到' + city.name : '已添加' + city.name,
      icon: 'none'
    })
    this.refresh()
  },

  onSelect(event) {
    const id = event.currentTarget.dataset.id
    const result = cities.setCurrent(id)
    if (!result.ok) {
      wx.showToast({ title: result.message || '切换失败', icon: 'none' })
      return
    }
    wx.showToast({ title: '已切换当前城市', icon: 'none' })
    this.refresh()
  },

  onDelete(event) {
    const id = event.currentTarget.dataset.id
    const result = cities.remove(id)
    if (!result.ok) {
      wx.showToast({ title: result.message || '无法删除', icon: 'none' })
      return
    }
    this.refresh()
  },

  onLocate() {
    if (this.data.locating) return
    const run = () => {
      this.setData({ locating: true })
      wx.getLocation({
        type: 'gcj02',
        success: (res) => this.reverse(res.longitude, res.latitude),
        fail: (err) => {
          this.setData({ locating: false })
          this.onLocateFail(err)
        }
      })
    }
    wx.getSetting({
      success: (setting) => {
        if (setting.authSetting && setting.authSetting['scope.userLocation'] === false) {
          this.askOpenSetting()
          return
        }
        if (wx.requirePrivacyAuthorize) {
          wx.requirePrivacyAuthorize({ success: run, fail: () => this.askOpenSetting() })
          return
        }
        run()
      },
      fail: run
    })
  },

  reverse(lon, lat) {
    qweather.lookupCoord(lon, lat).then((body) => {
      const loc = body.location && body.location[0]
      this.setData({ locating: false })
      if (!loc) {
        wx.showToast({ title: '没有匹配到城市', icon: 'none' })
        return
      }
      const city = cities.fromLocation(loc)
      cities.add(city)
      wx.showToast({ title: '已定位到' + city.name, icon: 'none' })
      this.refresh()
    }).catch((err) => {
      this.setData({ locating: false })
      wx.showModal({
        title: '定位城市失败',
        content: (err && err.message) || '请稍后重试，或直接搜索城市。',
        showCancel: false
      })
    })
  },

  onLocateFail(err) {
    const message = (err && err.errMsg) || ''
    if (/auth deny|auth denied|authorize|permission|privacy/i.test(message)) {
      this.askOpenSetting()
      return
    }
    wx.showToast({ title: '定位失败，请手动搜索城市', icon: 'none' })
  },

  askOpenSetting() {
    wx.showModal({
      title: '需要位置权限',
      content: '你拒绝了定位授权。可以在设置中打开位置权限，或直接搜索并添加城市。',
      confirmText: '去设置',
      cancelText: '知道了',
      success: (res) => {
        if (res.confirm) wx.openSetting({})
      }
    })
  }
})
