var L = require('leaflet')
var $ = require('jquery')

var helpers = require('@turf/helpers')
var bbox = require('@turf/bbox').default
var nearestPoint = require('@turf/nearest-point').default
var lineString = helpers.lineString
var point = helpers.point
var featureCollection = helpers.featureCollection
var distance = require('./utils').distance
var PathFinder = require('geojson-path-finder')
var indexOf = require('lodash/indexOf')
var last = require('lodash/last')
var floor = require('lodash/floor')
var findIndex = require('lodash/findIndex')
var difference = require('lodash/difference')

var Router = {
  pathfinder: {}, // pathfinder object
  _points: {}, // network vertices
  pathBboxRectangeLayer: {},
  _route: {},
  routePath: {}, // linestring object name:path
  routePathLayerGroup: {}, // leaflet path layer
  planetMarkerPathPoints: [], // planets markers
  map: {}, // leaflet map
  createPathFinder: function (network, map) {
    this.map = map
    this.pathFinder = new PathFinder(network, { precision: 1e-15 })
    console.log(this.pathFinder)
    var pathfinder = this.pathFinder
    var vertices = this.pathFinder._graph.vertices

    this._points = featureCollection(Object.keys(vertices)
      .filter(function (nodeName) {
        return Object.keys(vertices[nodeName]).length
      })
      .map(function (nodeName) {
        var vertice = pathfinder._graph.sourceVertices[nodeName]
        return point(vertice)
      }))
    console.log('_points array lenght:')
    console.log(this._points.features.length)
  },

  // {start}, {finish}: planet features
  createRoute: function (start, finish) {
    this._route.name = { start: start.properties.name, finish: finish.properties.name }
    var waypoints = [start, finish]
    var pathfinder = this.pathFinder
    // check if input waypoints are included in the network vertices
    // if not, update the waypoint to the nearest point in the network vertices
    var actualWaypoints = waypoints.map(function (wp) {
      var nearest = nearestPoint(wp, this._points) // turf.nearestPoint()
      return nearest
    }.bind(this))

    // create path with actualwaypoints (points in the vertices)
    var legs = actualWaypoints.map(function (wp, i, wps) {
      if (i > 0) {
        var returnedPath = pathfinder.findPath(wps[i - 1], wp)
        // bad hack, see issue #21
        var isInitPlanet = indexOf(returnedPath.path[0], wps[0].geometry.coordinates[0])
        if (isInitPlanet < 0) {
          returnedPath.path.unshift(wps[0].geometry.coordinates)
        }
        return returnedPath
      }
      return []
    }).slice(1)

    this._route.path = legs

    var waypointsLatLongArray = actualWaypoints.map(function (p) {
      var latlong = [p.geometry.coordinates[1], p.geometry.coordinates[0]]
      return { latLng: latlong }
    })
    var inputWaypointsLatLongArray = waypoints.map(function (p) {
      var latlong = [p.geometry.coordinates[1], p.geometry.coordinates[0]]
      return { latLng: latlong }
    })

    this._route.inputWaypoints = inputWaypointsLatLongArray
    this._route.waypoints = waypointsLatLongArray
    this._route.summary = {}

    console.log('_route:')
    console.log(this._route)

    this.addMissingSegments()
    this.calculateDistance()
    this.addRouteToMap(this._route.path[0])
  },

  addRouteToMap: function (path) {
    this.map.removeLayer(this.routePathLayerGroup)
    this.routePath = lineString(path.path, { name: 'path' })

    this.routePathLayer = L.geoJSON(this.routePath)
    var routePathLayerGroup = L.layerGroup([this.routePathLayer])

    if (this._route.finishLineLayer) { routePathLayerGroup.addLayer(this._route.finishLineLayer) }
    if (this._route.startLineLayer) { routePathLayerGroup.addLayer(this._route.startLineLayer) }
    this.routePathLayerGroup = routePathLayerGroup
    routePathLayerGroup.addTo(this.map)
    this.addBboxRectangle()
    this.modalShow()
  },

  // add missing segment, input waypoint {point} to {path init point}:
  createStartLinestring: function (featPoint) {
    var startPathPoint = this._route.path[0].path[0]
    var lonlats = [[featPoint[1], featPoint[0]], startPathPoint]
    var legDistance = distance(point(startPathPoint), point([featPoint[1], featPoint[0]]))
    this._route.path[1] = { path: lonlats, weight: legDistance }
    var line = lineString(lonlats, { name: 'missing segment' })
    this._route.startLineLayer = L.geoJSON(line, { color: 'gray', opacity: 0.65 })
  },

  // add missing segment, last path point to input waypoint
  createFinishLinestring: function (featPoint) {
    var finishPathPoint = last(this._route.path[0].path)
    var lonlats = [finishPathPoint, [featPoint[1], featPoint[0]]]
    var legDistance = distance(point([featPoint[1], featPoint[0]]), point(finishPathPoint))
    this._route.path[2] = { path: lonlats, weight: legDistance }
    var line = lineString(lonlats, { name: 'missing segment' })
    this._route.finishLineLayer = L.geoJSON(line, { color: 'gray', opacity: 0.65 })
  },

  addMissingSegments: function () {
    var startSegment = []
    var finishSegment = []
    var route = this._route

    // check if inputwaypoints are not actual waypoints:
    startSegment = difference(route.inputWaypoints[0].latLng, route.waypoints[0].latLng)
    finishSegment = difference(route.inputWaypoints[1].latLng, route.waypoints[1].latLng)
    if (startSegment.length !== 0) {
      this.createStartLinestring(startSegment)
    }
    if (finishSegment.length !== 0) {
      this.createFinishLinestring(finishSegment)
    }
  },

  calculateDistance: function () {
    var legs = this._route.path
    var totalDistance = legs.reduce(function (sum, l) {
      // d distancia, c coordenadas,i contador, cs lista de coordenadas
      var legDistance = l.path.reduce(function (d, c, i, cs) {
        if (i > 0) {
          return d + distance(point(cs[i - 1]), point(c))
        }
        return d
      }, 0)
      return sum + legDistance
    }, 0)
    // 1 parsec --> 72,31 min
    var totalTime = totalDistance * 72.31 // minutes
    this._route.summary.totalTime = totalTime
    totalDistance = floor(totalDistance, 2)
    this._route.summary.totalDistance = totalDistance
  },

  addPlanetMarker: function (id, feature) {
    var lon = feature.geometry.coordinates[0]
    var lat = feature.geometry.coordinates[1]
    var planetMarker = L.marker([lat, lon]).addTo(this.map).bindPopup(feature.properties.name).openPopup()
    this.planetMarkerPathPoints.push({ id: id, marker: planetMarker })
  },

  removePlanetMarker: function (id) {
    var markersArray = this.planetMarkerPathPoints
    var markerIndex = findIndex(markersArray, function (o) { return o.id === id })
    var marker = this.planetMarkerPathPoints[markerIndex].marker
    this.map.removeLayer(marker)
    this.map.removeLayer(this.routePathLayerGroup)
  },

  // modal route info
  modalShow: function () {
    var route = this._route
    var totalDistance = route.summary.totalDistance
    $('#route-Modal').modal('show')
    var title = 'ROUTE: ' + route.name.start + ' - ' + route.name.finish
    var body = '<p>Distance: ' + totalDistance + ' parsecs</p>' +
    '<p>Time: ' + this.displayedTravelTime(route.summary.totalTime) + '</p>'
    $('#route-Modal .modal-title').html(title)
    $('#route-Modal .modal-body').html(body)
  },

  displayedTravelTime: function (min) {
    var seconds = Number(min * 60)
    var d = Math.floor(seconds / (3600 * 24))
    var h = Math.floor(seconds % (3600 * 24) / 3600)
    var m = Math.floor(seconds % 3600 / 60)
    // var s = Math.floor(seconds % 60);

    var dDisplay = d > 0 ? d + (d === 1 ? ' day, ' : ' days, ') : ''
    var hDisplay = h > 0 ? h + (h === 1 ? ' hour, ' : ' hours, ') : ''
    var mDisplay = m > 0 ? m + (m === 1 ? ' minute, ' : ' minutes ') : ''
    // var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
    return dDisplay + hDisplay + mDisplay
  },

  addBboxRectangle: function () {
    this.map.removeLayer(this.pathBboxRectangeLayer)
    var pathBbox = bbox(this.routePath)
    var m = 10 // bbox margin
    var bounds = L.latLngBounds([pathBbox[1] - m, pathBbox[0] - m], [pathBbox[3] + m, pathBbox[2] + m])
    this.map.fitBounds(bounds)
    var rectangeProperties = { color: 'orange', weight: 1, fillOpacity: 0.03, interactive: false }
    this.pathBboxRectangeLayer = L.rectangle(bounds, rectangeProperties).addTo(this.map)
  },

  routeLayerStyle: {
    missingRoutes: [
      { color: 'black', opacity: 0.15, weight: 7 },
      { color: 'white', opacity: 0.6, weight: 4 },
      { color: 'gray', opacity: 0.8, weight: 2, dashArray: '7,12' }
    ]
  }
}

module.exports = Router
