var L = require('leaflet')

var utils = {
  toLatLng: function (point) {
    return L.latLng(point[1], point[0])
  },
  toLatLngArray: function (point) {
    return [point[1], point[0]]
  },
  distance: function (front, to) {
    var xA = front.geometry.coordinates[0]
    var yA = front.geometry.coordinates[1]
    var xB = to.geometry.coordinates[0]
    var yB = to.geometry.coordinates[1]

    var distance = Math.sqrt(Math.pow((xB - xA), 2) + Math.pow((yB - yA), 2))
    return distance
  }
}

module.exports = utils