/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var app = (function(){
	var getDb = function(){
		if (!"openDatabase" in window){
			return undefind;
		}
		var db = window.openDatabase("superMembers","0.1","backingDatabaseForTheApp",1 * 1024 * 1024);
		db.transaction(function(tx){
			tx.executeSql("create table if not exists users (id,username,password)",[],function(tx,_results){
				tx.executeSql("select id from users where id = ?",[0],function(tx2,results2){
					if (results2.rows.length < 1){
						tx.executeSql("insert into users (id,username,password) values (?,?,?)",[0,'dave','test']);
					}
				});
			});
		});
		return db;
	};
	var getUserFunc = function(){
		var db = getDb();
		if (db === undefined){
			return undefined;
		}
		db.transaction(function(tx){
			var result = tx.executeSql("select * from users limit 1");		
		});	
	};
	var loginFunc = function(u,p,successFunc,errorFunc){
		var db = getDb();
		if (db === undefined){
			errorFunc();
		}
		db.transaction(function(tx){
			var findUserSelect = "select * from users where username = ?";
			tx.executeSql(findUserSelect,[u],function(tx,results){
				var userObj = results.rows.item(0);
				if (userObj.username.trim().toLowerCase() == u && userObj.password.trim().toLowerCase() == p){
					successFunc(userObj);
				}
				else {
					errorFunc();
				}	
			});
		});	
	};
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
		//    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
	var ready = false;
	var preReady = [];
	var loaded = false;
	var preLoaded = [];
	var device = undefined;
	var onDeviceReadyEvent = undefined;
	var onDeviceReady = function(dev) {
		device = dev;
		ready = true;
		var ev = this;
		onDeviceReadyEvent = ev;
		var db = getDb();
		console.log('Received Device Ready Event',device,ev,db);
		_.forEach(preReady,function(action){
			if (_.isFunction(action)){
				action(ev,device);
			}
		});
		preReady = [];
		$(function(){
			loaded = true;
			_.forEach(preLoaded,function(action){
				if (_.isFunction(action)){
					action(ev,device);
				}
			});
			preLoad = [];
		});
	};
	var onReadyFunc = function(action){
		if (_.isFunction(action)){
			if (ready){
				action(onDeviceReadyEvent,device);
			} else {
				preReady.push(action);
			}
		}
	};
	var onReadyAndLoadedFunc = function(action){
		if (_.isFunction(action)){
			if (loaded){
				action(onDeviceReadyEvent,device);
			} else {
				preLoaded.push(action);
			}
		}
	}
	var onLoad = function(device) {
		var ev = this;
		console.log('Received Load Event',device,ev);
	};
	var onOffline = function(device) {
		var ev = this;
			console.log('Received Offline Event',device,ev);
	};
	var onOnline = function(device) {
		var ev = this;
			console.log('Received Online Event',device,ev);
	};
  var bindEvents = function() {
		document.addEventListener('deviceready', onDeviceReady, false);
		document.addEventListener('load', onLoad, false);
		document.addEventListener('offline', onOffline, false);
		document.addEventListener('online', onOnline, false);
	};


	return {
    // Application Constructor
    initialize: _.once(function() {
        bindEvents();
    }),
		login:loginFunc,
		onReady:onReadyFunc,
		onReadyAndLoaded:onReadyAndLoadedFunc,
		getUser: getUserFunc
	};
})();

var QueryParams = (function(){
	var search = window.location.search;
	if (_.startsWith(search,"?")){
		search = search.substring(1);
	}
	var parts = {};
	_.forEach(search.split("&"),function(p){
		var items = p.split('=');
		var key = _.head(items);
		var value = _.tail(items).join("=");
		parts[key] = value;
	});
	var getFunc = function(key){
		return parts[key];
	};	
	return {
		get:getFunc
	};
})();

var zoomableGraph = function(selector,data,xFunc,yFunc,lineSelectorFunc,xAxisLabel,yAxisLabel){
//data is a jsonArray of datum
//selector is a jquery selector
//xFunc is the extractor from datum to provide the xValue
//yFunc is the extractor from datum to provide the yValue
//lineSelectorFunc is a function which partitions the data into separate lines, with names
//
//
	var margin = {top: 0, right: 0, bottom: 90, left: 50};
	var	width = 640 - margin.left - margin.right;
	var	height = 480 - margin.top - margin.bottom;

	var parseTime = d3.timeParse("%d-%b-%y");

	var x = d3.scaleTime()
		.rangeRound([0, width]);
	x.domain(d3.extent(data, xFunc));
	var xAxis = d3.axisBottom(x);

	var y = d3.scaleLinear()
		.rangeRound([height, 0]);
	y.domain(d3.extent(data, yFunc));
	var yAxis = d3.axisLeft(y); 

	var zoomed = function(){
		svg.selectAll(".charts")
			.attr("transform",d3.event.transform);
		d3.selectAll(".line")
			.style("stroke-width",2/d3.event.transform.k);
		gx.call(xAxis.scale(d3.event.transform.rescaleX(x)));							
		gy.call(yAxis.scale(d3.event.transform.rescaleY(y)));							
	}

	var zoom = d3.zoom()
		.scaleExtent([1,30])
		.on("zoom",zoomed);

	var svg = d3.select(selector)
		.attr("viewBox","0 0 640 480")
		.call(zoom)
		.append("g")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	var graphClipId = "graphClip_"+_.uniqueId().toString();

	svg.append("clipPath")
		.attr("id",graphClipId)
		.append("rect")
			.attr("width",width)
			.attr("height",height)
			.attr("x",margin.left)
			.attr("y",margin.y);

	
	var gy = svg.append("g")
		.attr("transform", "translate("+margin.left +"," + margin.top + ")")
		.call(yAxis);

	gy.selectAll("text")	
				.style("text-anchor", "end")
				.attr("dx", "-.8em")
				.attr("dy", ".15em")
				.text(yAxisLabel ? yAxisLabel : "");

	var gx = svg.append("g")
			.attr("transform", "translate("+margin.left+","+height + ")")
			.call(xAxis);

	gx.append("text")
			.attr("fill", "#000")
			.attr("transform", "translate("+margin.left+","+height + ") rotate(-90)")
			.attr("y", 6)
			.attr("dy", "0.71em")
			.attr("text-anchor", "end")
			.text(xAxisLabel ? xAxisLabel : "");

	var line = d3.line()
		.x(function(d) { return x(xFunc(d)); })
		.y(function(d) { return y(yFunc(d)); });

	var g = svg.append("g")
		.attr("class","chartContiner")
		.attr("clip-path","url(#"+graphClipId+")");

	var charts = g.append("g")
		.attr("class","charts");

	var colours = [
		"steelblue",
		"blueviolet",
		"coral",
		"forestgreen",
		"magenta",
		"yellow",
		"springgreen",
		"red"
	];
	var colourIndex = 0;
	var legends = svg.append("g")
		.attr("class","legend")
		.attr("x",25 + margin.left)
		.attr("y",25 + margin.top)
		.attr("transform","translate("+( 25+margin.left )+","+( 25+margin.top )+")");
	var groupedData = _.groupBy(data,lineSelectorFunc);
	_.forEach(groupedData,function(values,key){
		var colour = colours[colourIndex];
		charts.append("path")
			.datum(values)
			.attr("class","line")
			.attr("fill", "none")
			.attr("stroke", colour)
			.attr("stroke-linejoin", "round")
			.attr("stroke-linecap", "round")
			.attr("stroke-width", 1.5)
			.attr("d", line);
		legends.append("circle")
			.attr("r",10)
			.attr("stroke","black")
			.attr("fill",colour)
			.attr("cx",0)
			.attr("cy",25*colourIndex);
		legends.append("text")
				.attr("y",((25*colourIndex) + margin.top).toString())
				.attr("x",(25).toString())
				.attr("fill","black")
				.attr("text-anchor","start")
				.attr("font-family","Verdana")
				.attr("font-size","12")
				.text(key);
		colourIndex++;
	});
	return svg;
};
