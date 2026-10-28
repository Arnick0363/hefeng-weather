const cities = require('./utils/cities.js')

App({
  onLaunch() {
    cities.ensure()
  }
})
