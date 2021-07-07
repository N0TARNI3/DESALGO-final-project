require('jquery-typeahead')
var $ = require('jquery')
var meta = require('@turf/meta')
var featureEach = meta.featureEach
var vertices = require('./geojson/manila-vertices.json')
var Router = require('./manila-router')

module.exports = CentersAutocomplete

function CentersAutocomplete (centers) {
  var centerNames = []

  featureEach(centers, function (currentFeature, featureIndex) {
    centerNames.push({
      id: featureIndex,
      display: currentFeature.properties.name
    })
  })
  featureEach(vertices, function (currentFeature, featureIndex) {
    centerNames.push({
      id: featureIndex,
      display: currentFeature.properties.name
    })
  })
  $.typeahead({
    input: '.js-typeahead-centers',
    minLength: 1,
    hint: true,
    order: 'desc',
    source: {
      data: centerNames
    },
    multiselect: {
      limit: 2,
      limitTemplate: 'You can\'t select more than 2 centers',
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
        Router.addPlanetMarker(item.id, centers.features[item.id])
      },
      onSubmit: function (node, form, item, event) {
        event.preventDefault()
        var start = centers.features[item[0].id]
        var finish = centers.features[item[1].id]
        Router.createRoute(start, finish)
      }
    }
  })
}
