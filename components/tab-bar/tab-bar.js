Component({
  properties: {
    current: {
      type: String,
      value: 'home'
    }
  },
  methods: {
    go(event) {
      const key = event.currentTarget.dataset.key
      const url = event.currentTarget.dataset.url
      if (!url || key === this.data.current) return
      wx.redirectTo({ url })
    }
  }
})
