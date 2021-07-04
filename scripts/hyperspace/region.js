var L = require('leaflet')

var Regions = {

  add: function (regions) {
    var regionsLayer = L.geoJSON(regions, {
      style: this.regionsStyle,
      onEachFeature: this.onEachFeature
    })
    return regionsLayer
  },

  regionsStyle: function (feature) {
    return {
      fillColor: regionColorDict[feature.properties.rid].color,
      color: 'white',
      fillOpacity: 0.85,
      weight: 1
    }
  },

  onEachFeature: function (feature, layer) {
    if (feature.properties.region) {
      layer.bindPopup(feature.properties.region)
    }
  }
}

module.exports = Regions

// https://colorbrewer2.org/#type=sequential&scheme=Purples&n=9
var regionColorDict = [
  { rid: 0, color: '#ffffff', name: '' },
  { rid: 1, color: '#fcfbfd', name: 'deep core' },
  { rid: 2, color: '#efedf5', name: 'core' },
  { rid: 3, color: '#dadaeb', name: 'colonies' },
  { rid: 4, color: '#bcbddc', name: 'inner rim' },
  { rid: 5, color: '#9e9ac8', name: 'expansion' },
  { rid: 6, color: '#807dba', name: 'mid rim' },
  { rid: 7, color: '#6a51a3', name: 'hutt' },
  { rid: 8, color: '#54278f', name: 'outer rim' },
  { rid: 9, color: '#3f007d', name: 'wild' },
  { rid: 10, color: '#3f007d', name: 'wild' }
]
