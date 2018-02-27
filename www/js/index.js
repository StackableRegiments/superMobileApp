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
	return {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
				document.addEventListener('load', this.onLoad, false);
				document.addEventListener('offline', this.onOffline, false);
				document.addEventListener('online', this.onOnline, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function(device) {
			var ev = this;
			var db = getDb();
			console.log('Received Device Ready Event',device,ev,db);
    },
    onLoad: function(device) {
			var ev = this;
        console.log('Received Load Event',device,ev);
    },
    onOffline: function(device) {
			var ev = this;
        console.log('Received Offline Event',device,ev);
    },
    onOnline: function(device) {
			var ev = this;
        console.log('Received Online Event',device,ev);
    },
		login:loginFunc,
		getUser: getUserFunc
	};
})();

$(function(){
	var MyCurrencyField = function(config){
		jsGrid.Field.call(this,config);
	};

	MyCurrencyField.prototype = new jsGrid.Field({
		css: "currency-field",
		align: "right",
		sorter: function(cash1,cash2){
			return cash1 - cash2;
		},
		itemTemplate: function(cash){
			return $("<span/>",{
				text:"$"+_.round(cash,2).toString()
			});
		}
	});
	jsGrid.fields.currency = MyCurrencyField;
	//add a date field to jsgrid
	var MyDateField = function(config) {
		jsGrid.Field.call(this, config);
	};
	MyDateField.prototype = new jsGrid.Field({
		css: "date-field",            // redefine general property 'css'
		align: "center",              // redefine general property 'align'
		sorter: function(date1, date2) {
				return new Date(date1) - new Date(date2);
		},
		itemTemplate: function(value) {
				return new Date(value).toDateString();
		}
	});
	jsGrid.fields.date = MyDateField;
});

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
		console.log("item",p,items,key,value);
		parts[key] = value;
	});

	console.log("qp",search,parts);
	var getFunc = function(key){
		return parts[key];
	};	
	return {
		get:getFunc
	};
})();
