//import packages
var L = require('leaflet')
var $ = require('jquery')
require('jquery-typeahead')
var meta = require('@turf/meta')
var featureEach = meta.featureEach
window.jQuery = window.$ = $

var testing_centers
var vertices
var roads

//import json thru ajax request
$.when(
  $.get('./scripts/geojson/manila-roads.json', function (response) {
    roads = response
  }),
  $.get('./scripts/geojson/manila-vertices.json', function (response) {
    vertices = response
    VerticesAutocomplete(vertices)
  }),
  $.get('./scripts/geojson/testing-centers.json', function (response) {
    testing_centers = response
  })
).then(function () {
  initialize(testing_centers)
})

//initialize map
function initialize(points){
  var map = L.map('map').setView([14.5995, 120.9842], 14);

  L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox/streets-v11',
    tileSize: 512,
    zoomOffset: -1
  }).addTo(map);

  //plot testing centers on the map
  var geojsonMarkerOptions = {
      radius: 8,
      fillColor: "#00FF00",
      color: "#000",
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8
  };
  //plot testing centers on the map
  L.geoJSON(points, {    
      pointToLayer: function (feature, latlng) {
          return L.circleMarker(latlng, geojsonMarkerOptions);
      },      
      onEachFeature: onEachFeature
  }).addTo(map);
}

//display testing-centers info on click
function onEachFeature(feature, layer) {
  if (feature.properties.name) {
    var centerInfo = '<div class="p-2"><img class="mb-3" style="width: 250px" src="' + feature.properties.url + '">' +
    '<h4>' + feature.properties.name + '</h4></div>'
    layer.bindPopup(centerInfo)
  }
}

//autocomplete form input
function VerticesAutocomplete (vertices) {
  var vertexNames = []

  featureEach(vertices, function (currentFeature, featureIndex) {
    vertexNames.push({
      id: featureIndex,
      display: currentFeature.properties.name
    })
  })
  $.typeahead({
    input: '.js-typeahead',
    minLength: 1,
    hint: true,
    order: 'desc',
    source: {
      data: vertexNames
    },
    multiselect: {
      limit: 2,
      limitTemplate: 'You can\'t select more than 2 vertices',
      matchOn: ['id'],
      cancelOnBackspace: true,
      callback: {
        onClick: function (node, item, event) {
          console.log(item)
        },
        onCancel: function (node, item, event) {
          Router.removePlanetMarker(item.id)
          console.log(item.display + ' Removed!')
        }
      }
    },
    template: function (query, item) {
      var color = '#777'
      return '<span class="list-group">' +
        '<span class="list-group-item">{{display}}</span>' +
    '</span>'
    },
    callback: {
      onInit: function (node) {
        // console.log('Typeahead Initiated on ' + node.selector)
      },
      onClick: function (node, a, item, event) {
        Router.addPlanetMarker(item.id, vertices.features[item.id])
      },
      onSubmit: function (node, form, item, event) {
        event.preventDefault()
        var start = vertices.features[item[0].id]
        var finish = vertices.features[item[1].id]
        createRoute(start, finish)
      }
    }
  })
}

createRoute (start, finish)