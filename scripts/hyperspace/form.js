require('jquery-typeahead')
var $ = require('jquery')
var meta = require('@turf/meta')
var featureEach = meta.featureEach
var Router = require('./manila-router')

module.exports = PlanetsAutocomplete

function PlanetsAutocomplete (planets) {
  var planetNames = []

  featureEach(planets, function (currentFeature, featureIndex) {
    planetNames.push({
      id: featureIndex,
      display: currentFeature.properties.name,
      sector: currentFeature.properties.sector,
      region: currentFeature.properties.region,
      canon: currentFeature.properties.canon
    })
  })
  $.typeahead({
    input: '.js-typeahead2',
    minLength: 1,
    hint: true,
    order: 'desc',
    source: {
      data: planetNames
    },
    multiselect: {
      limit: 2,
      limitTemplate: 'You can\'t select more than 2 planets',
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
      if (item.canon === 0) {
        color = '#ff1493'
      }
      return '<span class="list-group">' +
        '<span class="list-group-item">{{display}} <small style="color: ' + color + ';">({{region}})</small></span>' +
    '</span>'
    },
    callback: {
      onInit: function (node) {
        // console.log('Typeahead Initiated on ' + node.selector)
      },
      onClick: function (node, a, item, event) {
        Router.addPlanetMarker(item.id, planets.features[item.id])
      },
      onSubmit: function (node, form, item, event) {
        event.preventDefault()
        var start = planets.features[item[0].id]
        var finish = planets.features[item[1].id]
        Router.createRoute(start, finish)
      }
    }
  })
}
