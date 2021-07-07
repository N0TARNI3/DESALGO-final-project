var L = require('leaflet')
var $ = require('jquery')
window.jQuery = window.$ = $

var CentersAutocomplete = require('./form')
var Router = require('./manila-router')
var Vertices = require('./manila-vertices.js') // add vertices layer
var Centers = require('./testing-centers.js') // add testing centers layer

var testingCenters
var manilaVertices
var manilaRoads

$.when(
  $.get('./scripts/geojson/manila-roads.json', function (response) {
    manilaRoads = response
     }),
  $.get('./scripts/geojson/testing-centers.json', function (response) {
    testingCenters = Centers.add(response)
    
  }),
  $.get('./scripts/geojson/manila-vertices.json', function (response) {
    manilaVertices = Vertices.add(response)
    CentersAutocomplete(response)
  })
).then(function () {
  initialize(manilaRoads)
})

var map = L.map('map').setView([14.5995, 120.9842], 14);

L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
	maxZoom: 18,
	attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
		'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
	id: 'mapbox/streets-v11',
	tileSize: 512,
	zoomOffset: -1
}).addTo(map);

var style = {
  fillColor: 'blue',
  color: '#ffff00',
  weight: 1,
  opacity: 0.5,
  fillOpacity: 0.7
}

function initialize (network) {
  console.log('INITIALIZING NETWORK: ' + network)

  var manila = new L.GeoJSON(network, {
    style: style
  }).addTo(map)
  map.fitBounds(manila.getBounds())

  var pathfinder = Router.createPathFinder(network, map)

  manilaVertices.addTo(map)
  testingCenters.addTo(map)

  // add layer control
  var overlayLayers = {
    Centers: testingCenters,
    Vertices: manilaVertices
  }

  L.control.layers(null, overlayLayers).addTo(map)

  manilaVertices.on('add', function () {
    manilaVertices.bringToBack()
  })
}