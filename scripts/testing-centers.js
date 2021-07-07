var centersStyle = {
  radius: 8,
  fillColor: "#00FF00",
  color: "#000",
  weight: 1,
  opacity: 1,
  fillOpacity: 0.8
};

var Centers = {
  
  add: function (centers) {
    var centersLayer = L.geoJSON(centers, {
      style: centersStyle,
      pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, centersStyle)
      },
      onEachFeature: this.onEachFeature
    })
    return centersLayer
  },
  // getRadius: function (zoom) {
  //   return zoom === 0 ? 4
  //     : zoom === 1 ? 3
  //       : zoom === 2 ? 2
  //         : 1
  // },
  onEachFeature: function (feature, layer) {
    if (feature.properties.name) {
      var centerInfo = '<img class="mb-3" style="width: 250px" src="' + feature.properties.url + '">' +
      '<h4>' + feature.properties.name + '</h4>'

      layer.bindPopup(centerInfo)
    }
  }
}

module.exports = Centers

var centerZoomLevel = [
  { zm: 0, radius: 4 },
  { zm: 1, radius: 3 },
  { zm: 2, radius: 2 },
  { zm: 3, radius: 1 },
  { zm: 4, radius: 1 }
]
