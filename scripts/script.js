//import packages
var L = require('leaflet')
var $ = require('jquery')
require('jquery-typeahead')
var PathFinder = require('geojson-path-finder')
var roundCoord = require('geojson-path-finder/round-coord')
var meta = require('@turf/meta')
var featureEach = meta.featureEach
var invariant_1 = require("@turf/invariant")
var helpers = require("@turf/helpers")
var featureCollection = helpers.featureCollection
var nearestPoint = require('@turf/nearest-point').default
var point = helpers.point
var lineString = helpers.lineString
var indexOf = require('lodash/indexOf')
window.jQuery = window.$ = $

var testing_centers
var vertices
var roads
var map
var routeLayerGroup = L.layerGroup()
var latlng
var newItem

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
  map = L.map('map').setView([14.5995, 120.9842], 14);

  L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox/streets-v11',
    tileSize: 512,
    zoomOffset: -1
  }).addTo(map);

  var pathfinder = Router.createPathFinder(roads, map)

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

  var newNodePopup = function(latlng) {
    console.log(latlng)
    return '<div class="p-2"><h4><strong>Add New Waypoint</strong></h4>' +
    '<label for="node_name">Waypoint Name:</label><input type="text" name="node_name" class="form-control" id="node_name" required>'+
    '<label for="node_name">Latitude:</label><input type="text" name="node_lat" class="form-control" id="node_lat" value="'+latlng.lat+'" readonly>'+
    '<label for="node_name">Longitude:</label><input type="text" name="node_long" class="form-control" id="node_lng" value="'+latlng.lng+'" readonly>'+
    '</div><button class="btn btn-primary btn-sm mt-3" type="button" id="addNewNode">Submit</button></div>'
  }

  map.on('click', function(ev){
    latlng = map.mouseEventToLatLng(ev.originalEvent);
    var popup = L.popup()
    .setLatLng(latlng)
    .setContent(newNodePopup(latlng))
    .openOn(map);
  });
}

//display testing-centers info on click
function onEachFeature(feature, layer) {
  if (feature.properties.name) {
    var centerInfo = '<div class="p-2"><img class="mb-3" style="width: 250px" src="' + feature.properties.url + '">' +
    '<h4>' + feature.properties.name + '</h4></div>'
    layer.bindPopup(centerInfo)
  }
}

//function that adds new nodes
$(document).on("click", "#addNewNode", function(){
  var node_name = document.getElementById("node_name").value
  var node_coords = latlng
  console.log(node_coords)
  map.closePopup();

  //append new node to vertices json
  var feature = {}
  feature['type'] = 'Feature'
  feature['geometry'] = {'type': 'Point',
                        'coordinates': [node_coords.lng, node_coords.lat],
                        }
  feature['properties'] =  {'name': node_name}
  console.log(feature)
  vertices.features.push(feature)
  //reset nodes
  VerticesAutocomplete(vertices)
})

//autocomplete form input
function VerticesAutocomplete (vertices) {  
  var vertexNames = []
  var centerNames = []

  featureEach(vertices, function (currentFeature, featureIndex) {
    if(featureIndex >= 1327 && featureIndex <=1339) {
      centerNames.push({
        id: featureIndex,
        display: currentFeature.properties.name,
        coordinates: currentFeature.geometry.coordinates
      })
    }
    vertexNames.push({
      id: featureIndex,
      display: currentFeature.properties.name,
      coordinates: currentFeature.geometry.coordinates
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
    template: function (query, item) {
      var color = '#777'
      return '<span class="list-group">' +
        '<span class="list-group-item">{{display}}</span>' +
    '</span>'
    },
    callback: {
      onClick: function(node, a, item, event) {
        console.log(item)
        newItem = item
      },
      onSubmit: function (node, form, item, event) {
        console.log("ONSUBMIT TRIGGER")
        //reset map every submit
        map.removeLayer(routeLayerGroup)
        routeLayerGroup.clearLayers()

        event.preventDefault()
        if(!item) {
          item = newItem
        }                
        console.log(item)   
        var start = vertices.features[item.id]
        var distances = []

        //calculate distance to all testing centers
        for(let i=0; i<centerNames.length; i++){
          var from = point([start.geometry.coordinates[0], start.geometry.coordinates[1]]);
          var to = point([vertices.features[centerNames[i].id].geometry.coordinates[0], vertices.features[centerNames[i].id].geometry.coordinates[1]]);
          var options = {units: 'kilometers'};
          distances.push({
            id: centerNames[i].id,
            name: vertices.features[centerNames[i].id].properties.name,
            distance: distance(from, to, options)
          })
        }

        //sort distances array to get nearest        
        distances.sort((a, b) => {
            return a.distance - b.distance;
        })

        //display nearest testing center
        $('#nearest-center h4').html(distances[0].name)
        $('#nearest-center p').html("Distance: "+distances[0].distance.toFixed(2)+"km")
        $('#nearest-center h4.heading').html("Nearest COVID Testing Center:")
        
        //find shortest path to nearest COVID Testing Center
        var finish = vertices.features[distances[0].id]
        Router.createRoute(start, finish)     
      }
    }
  })
}

//calculate distance of two points
function distance(from, to, options) {
  if (options === void 0) { options = {}; }
  var coordinates1 = invariant_1.getCoord(from);
  var coordinates2 = invariant_1.getCoord(to);
  var dLat = helpers.degreesToRadians(coordinates2[1] - coordinates1[1]);
  var dLon = helpers.degreesToRadians(coordinates2[0] - coordinates1[0]);
  var lat1 = helpers.degreesToRadians(coordinates1[1]);
  var lat2 = helpers.degreesToRadians(coordinates2[1]);
  var a = Math.pow(Math.sin(dLat / 2), 2) +
      Math.pow(Math.sin(dLon / 2), 2) * Math.cos(lat1) * Math.cos(lat2);
  return helpers.radiansToLength(2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)), options.units);
}

//router constructor
var Router = {
  pathfinder: {}, // pathfinder object
  _points: {}, // network vertices
  _route: {},

  //converts geojson to javascript graph object
  createPathFinder: function (network, map) {
    this.map = map
    this.pathFinder = new PathFinder(network, { precision: 1e-15 })
    console.log(this.pathFinder)
    var pathfinder = this.pathFinder
    var vertices = this.pathFinder._graph.compactedVertices

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

  // actual router function
  createRoute: function (start, finish) {
    var waypoints = [start, finish]
    var pathfinder = this.pathFinder

    // check if input waypoints are along the roads
    // if not, update the waypoint to the nearest point in the roads
    var actualWaypoints = waypoints.map(function (wp) {
      var nearest = nearestPoint(wp, this._points) // turf.nearestPoint()
      return nearest
    }.bind(this))
    
    // create path with actualwaypoints (points in the vertices)
    var legs = actualWaypoints.map(function (wp, i, wps) {
      if (i > 0) {
        //get shortest path using dijkstra algo
        var start = pathfinder._keyFn(roundCoord(wps[i - 1].geometry.coordinates, pathfinder._precision))
        var finish = pathfinder._keyFn(roundCoord(wp.geometry.coordinates, pathfinder._precision))
        var returnedPath = Dijkstra(pathfinder._graph.compactedVertices,start, finish)
        //map compacted vertices into actual vertices
        var mappedPath = Router.mapPath(returnedPath, finish)
        // change initial node to starting node
        var isInitNode = indexOf(mappedPath.path[0], wps[0].geometry.coordinates[0])
        if (isInitNode < 0) {
          mappedPath.path.unshift(wps[0].geometry.coordinates)
        }
        return mappedPath
      }
      return []
    }).slice(1)

    //convert shortest path into geojson linestring feature
    var route_shortest_path = lineString(legs[0].path, { name: 'shortest-path' })

    //draw shortest path into map
    actualWaypoints.map(function (wp, i , wps){
      var lon = actualWaypoints[i].geometry.coordinates[0]
      var lat = actualWaypoints[i].geometry.coordinates[1]
      routeLayerGroup.addLayer(L.marker([lat, lon])) 
    })
    routeLayerGroup.addLayer(L.geoJSON(route_shortest_path))
    routeLayerGroup.addTo(map)
  },
  
  //map compacted vertices into actual vertices
  mapPath: function(path, finish) {    
    var pathfinder = this.pathFinder
    if (path) {
      var weight = path.distance;
      path = path.path;
      return {
        path: path.reduce(function buildPath(cs, v, i, vs) {
          if (i > 0) {
            cs = cs.concat(pathfinder._graph.compactedCoordinates[vs[i - 1]][v]);
          }  
          return cs;
        }.bind(pathfinder), []).concat([pathfinder._graph.sourceVertices[finish]]),
        weight: weight,
        edgeDatas: pathfinder._graph.compactedEdges 
          ? path.reduce(function buildEdgeData(eds, v, i, vs) {
            if (i > 0) {
              eds.push({
                reducedEdge: pathfinder._graph.compactedEdges[vs[i - 1]][v]
              });
            }
            return eds;
        }.bind(pathfinder), [])
          : undefined
        };
    } else {
      return null;
    }
  }
}

//compare distances to determine the shortest
const shortestDistanceNode = (distances, visited) => {
	let shortest = null;

	for (let node in distances) {
		let currentIsShortest =
			shortest === null || distances[node] < distances[shortest];
		if (currentIsShortest && !visited.includes(node)) {
			shortest = node;
		}
	}
	return shortest;
};

//Dijkstra algorithm
const Dijkstra = (graph, startNode, endNode) => {
	// establish object for recording distances from the start node
	let distances = {};
	distances[endNode] = "Infinity";
	distances = Object.assign(distances, graph[startNode]);

	// track paths
	let parents = { endNode: null };
	for (let child in graph[startNode]) {
		parents[child] = startNode;
	}

	// track nodes that have already been visited
	let visited = [];

	// find the nearest node
	let node = shortestDistanceNode(distances, visited);

	// for that node
	while (node) {
		// find its distance from the start node & its child nodes
		let distance = distances[node];
		let children = graph[node];
		// for each of those child nodes
		for (let child in children) {
			// make sure each child node is not the start node
			if (String(child) === String(startNode)) {
				//console.log("don't return to the start node! 🙅");
				continue;
			} else {
				//console.log("startNode: " + startNode); 
				//console.log("distance from node " + parents[node] + " to node " + node + ")");
				//console.log("previous distance: " + distances[node]);
				// save the distance from the start node to the child node
				let newdistance = distance + children[child];
				//console.log("new distance: " + newdistance);
				// if there's no recorded distance from the start node to the child node in the distances object
				// or if the recorded distance is shorter than the previously stored distance from the start node to the child node
				// save the distance to the object
				// record the path
				if (!distances[child] || distances[child] > newdistance) {
					distances[child] = newdistance;
					parents[child] = node;
					//console.log("distance + parents updated");
				} else {
					//console.log("not updating, because a shorter path already exists!");
				}
			}
		}
		// move the node to the visited set
		visited.push(node);
		// move to the nearest neighbor node
		node = shortestDistanceNode(distances, visited);
	}

	// using the stored paths from start node to end node
	// record the shortest path
	let shortestPath = [endNode];
	let parent = parents[endNode];
	while (parent) {
		shortestPath.push(parent);
		parent = parents[parent];
	}
	shortestPath.reverse();

	// return the shortest path from start node to end node & its distance
	let results = {
		distance: distances[endNode],
		path: shortestPath,
	};

	return results;
};