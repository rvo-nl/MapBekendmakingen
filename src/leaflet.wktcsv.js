// dit is leaflet.wktcsv.js die leest een csv file met een wkt geometrie kolom of met lat en lng coordinaten, zet deze om in geojson

//  dit is leaflet.wktcsv.js
/*
Made by Lydia Dijkshoorn for CSV with a geom field in WKT format
with use of
* https://github.com/joker-x/Leaflet.geoCSV
*
* This program is free software; you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation; either version 2 of the License, or
* (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program; if not, write to the Free Software
*/
var dataCsv ='';
var maxZoom = 14;
var minZoom = 5;
var fieldSeparator = '|';
//var labelColumn = "Naam";
var opacity = 1.0;
var csvType = 'wkt';  //'csv' of 'wkt'
var wktTitle= 'wkt';
var radfactor = 3;  //vergrotings factor radius points

var EPSG4326 =  '+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees';
var EPSG28992 = '+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +units=m +towgs84=565.2369,50.0087,465.658,-0.406857330322398,0.350732676542563,-1.8703473836068,4.0812 +no_defs';
var coordArr = [];

L.GeoCSV = L.GeoJSON.extend({
  // opciones por defecto
  options: {
    titles: ['lat', 'lng', 'popup'],
    latitudeTitle: 'lat',
    longitudeTitle: 'lng',
    wktTitle: 'wkt',
    fieldSeparator: '|',
    lineSeparator: '\n',
    deleteDoubleQuotes: false,
    firstLineTitles: false,
    csvType: 'wkt',
		csvCRS: 'EPSG4326',
		minZoom: 5
  },

  _propertiesNames: [],

  initialize: function (csv, options) {
    this._propertiesNames = []
    L.Util.setOptions(this, options)
    L.GeoJSON.prototype.initialize.call(this, csv, options)
  },

  addData: function (data) {
    if (typeof data === 'string') {
      // leemos titulos
      // console.log('log dataString')
      // console.table(data)
      var titulos = this.options.titles
      if (this.options.firstLineTitles) {
        data = data.split(this.options.lineSeparator)
        if (data.length < 2) return
        titulos = data[0]
        data.splice(0, 1)
        data = data.join(this.options.lineSeparator)
        titulos = titulos.trim().split(this.options.fieldSeparator)
        for (var i = 0; i < titulos.length; i++) {
          titulos[i] = this._deleteDoubleQuotes(titulos[i])
        }
        this.options.titles = titulos
      }
      // generamos _propertiesNames
      for (var i = 0; i < titulos.length; i++) {
        var prop = titulos[i].toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '_')
        if (prop == '' || prop == '_') prop = 'prop-' + i
        this._propertiesNames[i] = prop
      }
      // convertimos los datos a geoJSON
      // console.log('log data')
      // console.table(data)
      data = this._csv2json(data)
    }

    return L.GeoJSON.prototype.addData.call(this, data)
  },

  getPropertyName: function (title) {
    var pos = this.options.titles.indexOf(title),
      prop = ''
    if (pos >= 0) prop = this._propertiesNames[pos]
    return prop
  },

  getPropertyTitle: function (prop) {
    var pos = this._propertiesNames.indexOf(prop),
      title = ''
    if (pos >= 0) title = this.options.titles[pos]
    return title
  },

  _deleteDoubleQuotes: function (cadena) {
    if (this.options.deleteDoubleQuotes) cadena = cadena.trim().replace(/^"/, '').replace(/"$/, '')
    return cadena
  },

  _wkt2geojson: function (wkt) {
    var str = ''
    var geojson
    var geojsontxt
    var coord_list
    var coord
    var linestring_list
    var polygon_list
    var geom_list
    var geom
    var coordProj = [];




    var wkt = wkt.replace(/\s*\(\s*/g, '(')
    wkt = wkt.replace(/\s*\)\s*/g, ')')
    wkt = wkt.replace(/\s*\,\s*/g, ',')
//   console.log('wkt: '+ wkt)
    var geom_lastindex

    if (wkt.search('GEOMETRYCOLLECTION') == 0) {
      geojsontxt = '{"type":"GeometryCollection","geometries":['
      geom_list = wkt.substring(wkt.indexOf('(') + 1, wkt.lastIndexOf(')'))
      geom_list = geom_list.trim()
      //  console.log('wkt_geom_list: '+ geom_list)
      var geom_list_max = geom_list.length
      while (geom_list.length > 5) {
        subgeojsontxt = wktgeom2geojsontxt(geom_list)
        geojsontxt = geojsontxt + subgeojsontxt + ','
     //          console.log('geojson_txt: '+ geojsontxt)
        geom_list = geom_list.substring(geom_lastindex + 2, geom_list.length)
      //      console.log('wkt_geom_list: '+ geom_list)
      }
      geojsontxt = geojsontxt.substring(0, geojsontxt.length - 1) + ']}'
    }else {
      geom = wkt
      geojsontxt = wktgeom2geojsontxt(geom)
    }
 //    console.log('geojson: '+ geojsontxt)
    var geojson = JSON.parse(geojsontxt)
    return geojson

    function wktgeom2geojsontxt (geom_list) {
	geom_list = geom_list.replace(/^[,\s]+|[,\s]+$/g, '');
  //    console.log('geom_list: ' + geom_list);
      var geom_pos
      // POLYGON((0.0524887245 46.34721813,0.0524887245 48.938372,3.128101325 48.938372,3.128101325 46.34721813,0.0524887245 46.34721813))
      if (geom_list.search('MULTILINESTRING') == 0) {
        geojson = {'type': 'MultiLineString', 'coordinates': []}
        str = geom_list.substring(geom_list.indexOf('((') + 2, geom_list.indexOf('))'))
        geom_lastindex = geom_list.indexOf('))')+1;
        // console.log('f-multilinestring: ')
        linestring_list = str.split('),(')
        //   console.log('linelist0: ' + linestring_list[0])
        //   console.log('linelist1: ' + linestring_list[1])
        for (var p in linestring_list) {
          coord_list = linestring_list[p].split(',')
          var latlonArr = [];
          for (var i in coord_list) {
            coord = coord_list[i].trim().split(' ')
         //   console.log('multiline:' + coord);
            coordProj = proj4(EPSG28992,EPSG4326,[parseFloat(coord[0]), parseFloat(coord[1])]);
            //geojson.coordinates.push([coordProj[0], coordProj[1]])
            latlonArr.push([coordProj[0], coordProj[1]])
          }
            geojson.coordinates.push(latlonArr)
        }
      } else if (geom_list.search('LINESTRING') == 0) {
        geojson = {'type': 'LineString', 'coordinates': []}
        geom_pos = geom_list.indexOf('LINESTRING')
        str = geom_list.substring(geom_list.indexOf('(') + 1, geom_list.indexOf(')'))
        geom_lastindex = geom_list.indexOf(')')
        // console.log('f-linestring: ')
        coord_list = str.split(',')
        for (var i in coord_list) {
          coord = coord_list[i].trim().split(' ')
      //    console.log('LINESTRING: ' + coord)
          coordProj = proj4(EPSG28992,EPSG4326,[parseFloat(coord[0]), parseFloat(coord[1])]);
          geojson.coordinates.push([coordProj[0], coordProj[1]])
        }
      } else if (geom_list.search('POINT') == 0) {
        geojson = {'type': 'Point', 'coordinates': []}
        var geom_pos = geom_list.indexOf('POINT')
        coord_list = geom_list.substring(geom_list.indexOf('(') + 1, geom_list.indexOf(')'))
        geom_lastindex = geom_list.indexOf(')')
        // console.log('f-point: ')
        coord = coord_list.trim().split(' ')
        coordProj = proj4(EPSG28992,EPSG4326,[parseFloat(coord[0]), parseFloat(coord[1])]);
        geojson.coordinates.push(coordProj[0])
        geojson.coordinates.push(coordProj[1])
      } else if (geom_list.search('POLYGON') == 0) {
        geojson = {'type': 'Polygon', 'coordinates': []}
        str = geom_list.substring(geom_list.indexOf('((') + 2, geom_list.indexOf('))'))
        geom_lastindex = geom_list.indexOf('))')
        // console.log('f-polygon: ')
        linestring_list = str.split('),(')
	//			console.log('linestring_list: ' +   linestring_list)
	//			          var polygonArr =[]

        for (var p in linestring_list) {
          coord_list = linestring_list[p].split(',')
	//				console.log('coord: '+ coord_list);
          var latlonArr = [];
          for (var i in coord_list) {
            coord = coord_list[i].trim().split(' ')
            coordProj = proj4(EPSG28992,EPSG4326,[parseFloat(coord[0]), parseFloat(coord[1])]);
            latlonArr.push([coordProj[0], coordProj[1]])
            //geojson.coordinates.push([coordProj[0], coordProj[1]])
          }	
				            geojson.coordinates.push(latlonArr);					
        }
			//	          polygonArr.push(latlonArr);

//						geojson = turf.polygonToLine(geojson);


      } else if (geom_list.search('MULTIPOLYGON') == 0) {
        geojson = {'type': 'MultiPolygon', 'coordinates': []}
        str = geom_list.substring(geom_list.indexOf('(((') + 3, geom_list.indexOf(')))'))
        geom_lastindex = geom_list.indexOf(')))')
	//			console.log('str: ' + str)
        // console.log('f-multipolygon: ')
        polygon_list = str.split(')),((')
    //     console.log('polylist: ' + polygon_list)
        for (var j in polygon_list) {
          linestring_list = polygon_list[j].split('),(')
			//console.log('linestring_list: ' +   linestring_list)
          var polygonArr =[]
          for (var p in linestring_list) {
            coord_list = linestring_list[p].split(',')
            var latlonArr = [];
            for (var i in coord_list) {
              coord = coord_list[i].trim().split(' ')
              coordProj = proj4(EPSG28992,EPSG4326,[parseFloat(coord[0]), parseFloat(coord[1])]);
              latlonArr.push([coordProj[0], coordProj[1]])
            }
          }
          polygonArr.push(latlonArr)
        }
        geojson.coordinates.push(polygonArr);
      } else {}
 //     console.log('geojson_geom: ' + JSON.stringify(geojson))
      return JSON.stringify(geojson)
    }
  },

  _csv2json: function (csv) {
    var json = {}
    json['type'] = 'FeatureCollection'
    json['features'] = []
    var titulos = this.options.titles

    csv = csv.split(this.options.lineSeparator)
    if (csvType == 'csv') {
      for (var num_linea = 0; num_linea < csv.length; num_linea++) {
        var campos = csv[num_linea].trim().split(this.options.fieldSeparator),
          lng = parseFloat(campos[titulos.indexOf(this.options.longitudeTitle)]),
          lat = parseFloat(campos[titulos.indexOf(this.options.latitudeTitle)])
        if (campos.length == titulos.length && lng < 180 && lng > -180 && lat < 90 && lat > -90) {
          var feature = {}
          feature['type'] = 'Feature'
          feature['geometry'] = {}
          feature['properties'] = {}
          feature['geometry']['type'] = 'Point'
          feature['geometry']['coordinates'] = [lng, lat]
          //   console.log('featureGeometry ' +    JSON.stringify(feature["geometry"]))

          // propiedades
          for (var i = 0; i < titulos.length; i++) {
            if (titulos[i] != this.options.latitudeTitle && titulos[i] != this.options.longitudeTitle) {
              feature['properties'][this._propertiesNames[i]] = this._deleteDoubleQuotes(campos[i])
            }
          }
          json['features'].push(feature)
        }
      }
      return json
    }

    if (csvType == 'wkt') {
      for (var num_linea = 0; num_linea < csv.length; num_linea++) {
        var campos = csv[num_linea].trim().split(this.options.fieldSeparator),
          wkt = campos[titulos.indexOf(this.options.wktTitle)]

        if (campos.length == titulos.length && wktTitle == 'wkt') {
          var feature = {}
          feature['type'] = 'Feature'
          var geomjson = this._wkt2geojson(wkt)
   //       console.log('test geom geoJson ' + JSON.stringify(geomjson))

          feature['geometry'] = geomjson
          feature['properties'] = {}
          // propiedades
          for (var i = 0; i < titulos.length; i++) {
            if (titulos[i] != this.options.wktTitle) {
              feature['properties'][this._propertiesNames[i]] = this._deleteDoubleQuotes(campos[i])
            }
          }
   //       console.log('geojson feature: '  +  JSON.stringify(feature));
          json['features'].push(feature)
        }
      }
      console.log('json: ' + JSON.stringify(json));
      return json
    }
  }

})

L.geoCsv = function (csv_string, options) {
  return new L.GeoCSV(csv_string, options)
}
