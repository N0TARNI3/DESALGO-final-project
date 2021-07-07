var L = require('leaflet')

var verticesStyle = {
  radius: 2,
  fillColor: "#FF0000",
  color: "#000",
  weight: 1,
  opacity: 0.5,
  fillOpacity: 0.5
};

var Vertices = {

  add: function (vertices) {
    var verticesLayer = L.geoJSON(vertices, {
      style: verticesStyle,
      pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, verticesStyle)
      },
      onEachFeature: this.onEachFeature
    })
    return verticesLayer
  },
  // getRadius: function (zoom) {
  //   return zoom === 0 ? 4
  //     : zoom === 1 ? 3
  //       : zoom === 2 ? 2
  //         : 1
  // },
  onEachFeature: function (feature, layer) {
    if (feature.properties.name) {
      var vertexInfo = '<h4>' + feature.properties.name + '</h4>'
      layer.bindPopup(vertexInfo)
    }
  }
}

module.exports = Vertices

var vertexZoomLevel = [
  { zm: 0, radius: 4 },
  { zm: 1, radius: 3 },
  { zm: 2, radius: 2 },
  { zm: 3, radius: 1 },
  { zm: 4, radius: 1 }
]
