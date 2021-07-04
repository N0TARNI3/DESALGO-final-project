var L = require('leaflet')

var Planets = {

  add: function (planets) {
    var planetsLayer = L.geoJSON(planets, {
      style: this.planetsStyle,
      pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, this.planetsStyle)
      },
      onEachFeature: this.onEachFeature,
      filter: function (feature, layer) {
        if (feature.properties.canon === 1) {
          return feature.properties.canon
        }
      }
    })
    return planetsLayer
  },

  planetsStyle: function (feature) {
    return {
      radius: planetZoomLevel[feature.properties.zm].radius,
      fillColor: '#ff7800',
      color: '#000',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8
    }
  },
  // getRadius: function (zoom) {
  //   return zoom === 0 ? 4
  //     : zoom === 1 ? 3
  //       : zoom === 2 ? 2
  //         : 1
  // },
  onEachFeature: function (feature, layer) {
    if (feature.properties.name) {
      var planetInfo = '<h4>' + feature.properties.name + '</h4>' +
      '<p>GRID: ' + feature.properties.grid + '</p> ' +
      '<p>COORDINATES: ' + feature.properties.x + ', ' + feature.properties.y + '</p>' +
      '<p>REGION: ' + feature.properties.region + '</p>'

      layer.bindPopup(planetInfo)
    }
  }
}

module.exports = Planets

var planetZoomLevel = [
  { zm: 0, radius: 4 },
  { zm: 1, radius: 3 },
  { zm: 2, radius: 2 },
  { zm: 3, radius: 1 },
  { zm: 4, radius: 1 }
]
