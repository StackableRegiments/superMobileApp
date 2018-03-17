var formatDateTime = function(dateLong){
	var d = new Date(dateLong);
	return sprintf("%s %02d:%02d",formatDate(dateLong),d.getHours(),d.getMinutes())
};
var formatDate = function(dateLong){
	var d = new Date(dateLong);
	return sprintf("%02d/%02d/%04d",d.getDate(),d.getMonth()+1,d.getYear()+1900);
};

var app = (function(){

	var events = {};
	var bindFunc = function(eventName,subscriberName,func){
		if (_.isFunction(func)){
			if (!(eventName in events)){
				events[eventName] = {};
			}
			events[eventName][subscriberName] = func;
		}
	};
	var unbindFunc = function(eventName,subscriberName){
		if (eventName in events){
			var group = events[eventName];
			if (subscriberName in group){
				delete group.subscriberName;
			}
		}
	};
	var callFunc = function(eventName,args){
		if (eventName in events){
			_.forEach(events[eventName],function(func,subscriberName){
				try {
					func.apply(null,args);
				} catch(e) {
					console.log("exception thrown in event",subscriberName,eventName,args,e);
				}
			});
		}
	};
	_.forEach(["deviceready","load","offline","online","suspend","resume","backbutton"],function(eventName){
		document.addEventListener(eventName,function(args){
			callFunc(eventName,[args]);
		},false);
	});

	var withAccounts = function(accountsFunc){
		$.ajax({
			url:"resources/accounts.json",
			method:"GET",
			dataType:"json",
			success:function(accounts){
				accountsFunc(accounts);
			},
			error:function(err){
				console.log("error getting accounts",err);
				accountsFunc([]);
			}
		});
	};
	var withTransactions = function(accountNumber,transactionsFunc){
		$.ajax({
			url:"resources/accounts/"+accountNumber+"/transactions.json",
			method:"GET",
			dataType:"json",
			success:function(transactions){
				transactionsFunc(transactions);
			},
			error:function(err){
				console.log("error getting transactions",err);
				transactionsFunc([]);
			}
		});
	};

	var auditHistory = (function(){
		var history = [];
		var addFunc = function(item){
			item.when = Date.now();
			history.push(item);
			callFunc("audit",[item]);
		};
		return {
			add:addFunc,
			getHistory:function(){return history;}
		};
	})();

	var reduceTransactions = function(transactions){
		return _.reduce(_.sortBy(transactions,function(item){return item.timestamp;}),function(acc,item){
			if ("adjustment" in item){
				acc.total += item.adjustment;
				if ("type" in item){
					switch (item.type){
						case "CC":
							acc.concessional += item.adjustment;
							break;
						case "NCC":
							acc.nonConcessional += item.adjustment;
							break;
						default:
							break;
					}
				}
			}
			item.subTotal = acc.total;
			acc.items.push(item);
			if ("timestamp" in item && item.timestamp >= acc.lastItem.timestamp){
				acc.lastItem = item;
			}
			return acc;
		},{
			total:0,
			nonConcessional:0,
			concessional:0,
			lastItem:{
				timestamp:0
			},
			items:[]
		});
	};
	var withCorrespondence = function(accountNumber,correspondenceFunc){
		$.ajax({
			url:"resources/accounts/"+accountNumber+"/correspondence.json",
			method:"GET",
			dataType:"json",
			success:function(items){
				correspondenceFunc(items);
			},
			error:function(err){
				console.log("error getting correspondence",err);
				correspondenceFunc([]);
			}
		});
	};

	var withInvestmentOptions = function(investmentsFunc){
		$.ajax({
			url:"resources/investmentOptions.json",
			method:"GET",
			dataType:"json",
			success:function(invOps){
				investmentsFunc(invOps);
			},
			error:function(err){
				console.log("error getting investmentOptions",err);
				investmentsFunc([]);
			}
		});
	};
	var withInsuranceSchemes = function(schemesFunc){
		$.ajax({
			url:"resources/insurance.json",
			method:"GET",
			dataType:"json",
			success:function(schemes){
				schemesFunc(schemes);
			},
			error:function(err){
				console.log("error getting insurance schemes",err);
				schemesFunc({});
			}
		});
	};
	var withNews = function(newsFunc){
		$.ajax({
			url:"resources/news.json",
			method:"GET",
			dataType:"json",
			success:function(news){
				newsFunc(news);
			},
			error:function(err){
				console.log("error getting news",err);
				newsFunc([]);
			}
		});
	};
	var withChatHistory = function(chatFunc){
		$.ajax({
			url:"resources/chatHistory.json",
			method:"GET",
			dataType:"json",
			success:function(history){
				chatFunc(history);
			},
			error:function(err){
				console.log("error getting chatHistory",err);
				chatFunc([]);
			}
		});
	};
	var withProfile = function(profFunc){
		$.ajax({
			url:"resources/profile.json",
			method:"GET",
			dataType:"json",
			success:function(prof){
				profFunc(prof);
			},
			error:function(err){
				console.log("error getting profile",err);
				profFunc({});
			}
		});
	};
	var withOffers = function(offerFunc){
		$.ajax({
			url:"resources/offers.json",
			method:"GET",
			dataType:"json",
			success:function(offers){
				offerFunc(offers);
			},
			error:function(err){
				console.log("error getting offers",err);
				offerFunc([]);
			}
		});
	};
	var news = (function(){
		var newsCache = [];
		withNews(function(o){
			newsCache = o;
		});
		var addNewsFunc = function(newNews){
			newsCache.push(newNews);
			callFunc("news",[newNews]);
			if (currentPage.name != "news"){
				if ("Notification" in window){
					Notification.requestPermission(function(permission){
						if (permission === "granted"){
							var notification = new Notification(newNews.heading,{
								tag:newNews.heading,
								body:newNews.summary
							});
							notification.onclick = function(){
								setPageFunc("news",[]);
							};
							if ("navigator" in window && "notification" in window.navigator && "beep" in window.navigator.notification){
								window.navigator.notification.beep(1);
							}
						}
					});
				}
			}
		};
		return {
			addNews:addNewsFunc,
			getAll:function(){return newsCache;}
		};
	}());

	var offers = (function(){
		var offerCache = [];
		withOffers(function(o){
			offerCache = o;
		});
		var addOfferFunc = function(newOffer){
			offerCache.push(newOffer);
			callFunc("offer",[newOffer]);
			if (currentPage.name != "offers"){
				if ("Notification" in window){
					Notification.requestPermission(function(permission){
						if (permission === "granted"){
							var notification = new Notification(newOffer.name,{
								tag:newOffer.name,
								body:newOffer.text
							});
							notification.onclick = function(){
								setPageFunc("offers",[]);
							};
							if ("navigator" in window && "notification" in window.navigator && "beep" in window.navigator.notification){
								window.navigator.notification.beep(1);
							}
						}
					});
				}
			}
		};
		return {
			addOffer:addOfferFunc,
			getAll:function(){return offerCache;}
		};
	}());

	var idleHelpdeskTime = 15 * 1000;
	var chat = (function(){
		var history = [];
		var readMessageFunc = function(m){
			return _.once(function(){
				m.unread = false;
				auditHistory.add({
					action:"readMessage",
					result:"successful",
					visible:true,
					parameters:{
						message:m
					}
				});
				delete m.readMessage();
			});
		};
		withChatHistory(function(chatHistory){
			history = _.map(chatHistory,function(m){
				if (m.unread == true){
					m.readMessage = readMessageFunc(m);
				}
				return m;
			});
		});
		var addMessageFunc = function(message,author){
			var m = {
				message:message,
				from:author,
				when:Date.now(),
				unread:true
			};
			m.readMessage = readMessageFunc(m);
			history.push(m);
			callFunc("chat",[m]);
			if (author != "me" && currentPage.name != "chat"){
				if ("Notification" in window){
					Notification.requestPermission(function(permission){
						if (permission === "granted"){
							var notification = new Notification(author,{
								tag:author,
								body:message
							});
							m.notification = notification;
							notification.onshow = m.readMessage;
							notification.onclick = function(){
								setPageFunc("chat",[]);
							};
							if ("navigator" in window && "notification" in window.navigator && "beep" in window.navigator.notification){
								window.navigator.notification.beep(1);
							}
						}
					});
				}
			}
		};
		return {
			getHistory:function(){
				return history;
			},
			addMessage:addMessageFunc
		};
	})();


	var formatCurrency = function(currency){
		if (currency < 0){
			return "-$"+_.round(Math.abs(currency),2).toLocaleString();
		} else {
			return "$"+_.round(currency,2).toLocaleString();
		}
	};

	var zoomableGraph = function(selector,data,xFunc,yFunc,lineSelectorFunc,xAxisLabel,yAxisLabel,includeTrends,predictionMultiplier){
	//data is a jsonArray of datum
	//selector is a jquery selector
	//xFunc is the extractor from datum to provide the xValue
	//yFunc is the extractor from datum to provide the yValue
	//lineSelectorFunc is a function which partitions the data into separate lines, with names
	//
		var margin = {top: 0, right: 0, bottom: 25, left: 50};
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
			d3.selectAll(".trendline")
				.style("stroke-width",2/d3.event.transform.k);
			gx.call(xAxis.scale(d3.event.transform.rescaleX(x)));							
			gy.call(yAxis.scale(d3.event.transform.rescaleY(y)));							
		}

		var zoom = d3.zoom()
			.scaleExtent([0.125,30])
			.on("zoom",zoomed);

		var svg = d3.select(selector).append("svg")
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
			var visible = true;
			var path = charts.append("path")
				.datum(values)
				.attr("class","line")
				.attr("fill", "none")
				.attr("stroke", colour)
				.attr("stroke-linejoin", "round")
				.attr("stroke-linecap", "round")
				.attr("stroke-width", 1.5)
				.attr("d", line);
			var circle = legends.append("circle")
				.attr("r",10)
				.attr("stroke","black")
				.attr("fill",colour)
				.attr("cx",0)
				.attr("cy",25*colourIndex)
				.on("click",function(){
					visible = !visible;
					renderVisibility();
				});
			var renderVisibility = function(){
				if (visible){
					circle.classed("visiblePathLegend",true);
					path.classed("visiblePath",true);
					circle.classed("invisiblePathLegend",false);
					path.classed("invisiblePath",false);
				}	else {
					circle.classed("visiblePathLegend",false);
					path.classed("visiblePath",false);
					circle.classed("invisiblePathLegend",true);
					path.classed("invisiblePath",true);
				}	
			};
			renderVisibility();

			legends.append("text")
					.attr("y",((25*colourIndex) + margin.top).toString())
					.attr("x",(25).toString())
					.attr("fill","black")
					.attr("text-anchor","start")
					.attr("font-family","Verdana")
					.attr("font-size","12")
					.text(key)
					.on("click",function(){
						visible = !visible;
						renderVisibility();
					});
			colourIndex++;

			if (includeTrends){
				var colour = colours[colourIndex];

				var trendVisible = false;
				var rawData = _.map(values,function(d){return [xFunc(d),yFunc(d)];})
				var logRegression = regression.logarithmic(rawData);
				var trendData = _.map(logRegression.points,function(d){return logRegression.predict(d[0]);});

				var firstStep = _.head(trendData)[0];
				var lastStep = _.last(trendData)[0];
				var futureSteps = [];
				if (predictionMultiplier >= 1){
					futureSteps = _.concat(trendData,_.flatMap(_.range(1,predictionMultiplier),function(i){
						return _.map(trendData,function(di){
							var newStep = (di[0] - firstStep) + (i * (lastStep - firstStep)) + firstStep;
							return logRegression.predict(newStep);  
						});
					}));
				} else {
					futureSteps = trendData;
				}
				var trendLine = d3.line()
					.x(function(d) { return x(d[0]); })
					.y(function(d) { return y(d[1]); });
				var trendPath = charts.append("path")
					.datum(futureSteps)
					.attr("class","trendline")
					.attr("d",trendLine)
					.attr("stroke-linejoin", "round")
					.attr("stroke-linecap", "round")
					.attr("stroke",colour)
					.attr("fill", "none")
					.attr("stroke-width",0.5);
				var trendCircle = legends.append("circle")
					.attr("r",10)
					.attr("stroke","black")
					.attr("fill",colour)
					.attr("cx",0)
					.attr("cy",25*colourIndex)
					.on("click",function(){
						trendVisible = !trendVisible;
						renderTrendVisibility();
					});
				var renderTrendVisibility = function(){
					if (trendVisible){
						trendCircle.classed("visiblePathLegend",true);
						trendPath.classed("visiblePath",true);
						trendCircle.classed("invisiblePathLegend",false);
						trendPath.classed("invisiblePath",false);
					}	else {
						trendCircle.classed("visiblePathLegend",false);
						trendPath.classed("visiblePath",false);
						trendCircle.classed("invisiblePathLegend",true);
						trendPath.classed("invisiblePath",true);
					}	
				};
				renderTrendVisibility();
				legends.append("text")
					.attr("y",((25*colourIndex) + margin.top).toString())
					.attr("x",(25).toString())
					.attr("fill","black")
					.attr("text-anchor","start")
					.attr("font-family","Verdana")
					.attr("font-size","12")
					.text(sprintf("%s trend",key))
					.on("click",function(){
						trendVisible = !trendVisible;
						renderTrendVisibility();
					});

				colourIndex++;
			}
		});
		return svg;
	};

	var JsGridHelpers = (function(){
		var initFunc = function(){
			var MyAlertField = function(config){
				jsGrid.Field.call(this,config);
			};
			MyAlertField.prototype = new jsGrid.Field({
				css:"alert-field",
				align:"center",
				sorter:function(a,b){
					return 1;
				},
				itemTemplate:function(item){
					return $("<button/>").append($("<i/>",{
						"class":"fa fa-list-alt"
					})).on("click",function(){
						alert(JSON.stringify(item,undefined,0));
					});
				}
			});
			jsGrid.fields.alert = MyAlertField;

			var MyJsonField = function(config){
				jsGrid.Field.call(this,config);
			};
			MyJsonField.prototype = new jsGrid.Field({
				css: "json-field",
				align:"right",
				sorter: function(json1,json2){
					return _.size(json1) - _.size(json2);
				},
				itemTemplate: function(json){
					return JSON.stringify(json,undefined,1);
				}
			});
			jsGrid.fields.json = MyJsonField;

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
						text:formatCurrency(cash)
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
						return formatDate(value);
				}
			});
			jsGrid.fields.date = MyDateField;
		}
		var createReadonlyGrid = function(selector,data,fields,onClick){
			var grid = selector.jsGrid({
				width:"100%",
				inserting:false,
				editing:false,
				sorting:true,
				paging:true,
				pageSize:10,
				pageButtonCount:5,
				data:data,
				fields:fields,
				rowClick:function(evt){
					if (onClick !== undefined && _.isFunction(onClick)){
						onClick(evt);
					}
				}
			});
			return grid;
		}
		initFunc();
		return {
			readonlyGrid:createReadonlyGrid
		};
	})();

	var mainPaneContainer,headerContainer,footerContainer,chatButton,newsButton,chatCount;

	bindFunc("backbutton","navigation",function(){
		if (currentPage.name != "login"){
			var cand = _.last(pageHistory);
			while (cand !== undefined){
				var item = pageHistory.pop();
				if (item !== undefined && item.name != currentPage.name){
					setPageFunc(item.name,item.args);
					cand = undefined;
				} else {
					cand = _.last(pageHistory);
				}
			}
		}
	});

	var pageHistory = [];
	var currentPage = {};
	var dontRenderHeadersFor = function(pageName){
		return _.some(["login","news","chat"],function(i){return i == pageName;});
	};

	var renderHeaderChatCount = function(){
		var count = _.size(_.filter(chat.getHistory(),function(cm){return cm.unread == true;}));
		if (count > 0){
			chatCount.text(count);
		} else {
			chatCount.text("");
		}
	};
	bindFunc("chat","header",function(m){
		renderHeaderChatCount();
	});


	var setPageFunc = function(pageName,args){
		var newPage = pages[pageName];
		if (newPage !== undefined && mainPaneContainer !== undefined){
			callFunc("prePageChange",[pageName,args]);
			pageHistory.push({name:pageName,args:args});
			if ("deactivate" in currentPage && _.isFunction(currentPage.deactivate)){
				currentPage.deactivate();
			}
			if ("messageDeferrer" in currentPage){
				currentPage.messageDeferrer.cancel();
			}
			currentPage = newPage;
			var oldPageContent = mainPaneContainer.find(".pageTemplate");
			oldPageContent.fadeOut(400,function(){
				oldPageContent.remove();
			});
			if ("deferredMessages" in newPage){
				currentPage.messageDeferrer = createDeferredMessages(newPage.deferredMessages);
				currentPage.messageDeferrer.start();
			};
			var renderFunc = function(){
				var backToParentButton = headerContainer.find(".backToParentButton").unbind("click");
				if ("render" in newPage){
					var template = templates[pageName];
					if (template !== undefined){
						template = template.clone();
					} else {
						template = $("<div/>");
					}
					var newPageContent = newPage.render(template);
					newPageContent.hide();
					mainPaneContainer.append(newPageContent);
					newPageContent.fadeIn();
				}
				if ("header" in newPage && _.isFunction(newPage.header)){
					var h = newPage.header();
					if ("name" in h){	
						headerContainer.find(".headerSection").text(h.name);
					}
					if ("parent" in h){
						backToParentButton.fadeIn().on("click",function(){
							setPageFunc(h.parent,h.parentArgs);
						});
					} else {
						backToParentButton.fadeOut();
					}
				}
				if (dontRenderHeadersFor(pageName)){
					chatButton.hide().unbind("click");
					newsButton.hide().unbind("click");
					chatCount.hide();
				} else {
					chatButton.show().on("click",function(){
						setPageFunc("chat");
					});
					chatCount.fadeIn();
					renderHeaderChatCount();
					newsButton.show().on("click",function(){
						setPageFunc("news");
					});
				}
				if ("footer" in newPage){
					footerContainer.html(newPage.footer());
				}
			};
			if ("activate" in newPage){
				newPage.activate(args,renderFunc);
			} else {
				renderFunc();
			}
			auditHistory.add({
				action:"viewedPage",
				result:"successful",
				visible:false,
				parameters:{
					page:pageName,
					args:args
				}
			});

			callFunc("postPageChange",[pageName,args]);
		}
	};
	var getPageFunc = function(){
		return currentPage;
	}
	var templates = {};
	$(function(){
		mainPaneContainer = $("#mainPane");
		headerContainer = $("#header");
		footerContainer = $("#footer");
		chatButton = $("#chatButton");
		newsButton = $("#newsButton");
		chatCount = $("#chatCount");
		$.ajax({
			method:"GET",
			url:"resources/pageTemplates.html",
			dataType:"text",
			success:function(rawHtml){
				var html = $(rawHtml);
				var templateRoot = html.find("#pageTemplates");
				_.forEach(templateRoot.find(".pageTemplate"),function(templateItem){
					var template = $(templateItem);
					var templateId = template.attr("id");
					templates[templateId] = template.clone();
				});
				setPageFunc("login");
			},
			error:function(err){
			}
		});

		var reauth = function(){
			setPageFunc("login",[]);
		};
		bindFunc("online","reauthentication",reauth);
		bindFunc("resume","reauthentication",reauth);
		bindFunc("deviceready","reauthentication",reauth);
	});
	var createDeferredMessages = function(messages){
		var currentFunc = function(){
		};
		var generateDelayFuncFromMessages = function(ms){
			var thisMessage = _.head(ms);
			var remainder = _.tail(ms);
			if (thisMessage !== undefined){
				currentFunc = _.debounce(function(){
					if (_.find(chat.getHistory(),function(item){
						return item.message == thisMessage.message && item.from == thisMessage.author;
					}) == undefined){ 
						chat.addMessage(thisMessage.message,thisMessage.author);
					}
					generateDelayFuncFromMessages(remainder);
					currentFunc();
				},thisMessage.delay);
			} else {
				currentFunc = function(){
				};
			}
		};
		var startFunc = function(){
			generateDelayFuncFromMessages(messages);
			currentFunc();
		};
		var cancelFunc = function(){
			if (currentFunc !== undefined && "cancel" in currentFunc){
				currentFunc.cancel();
			};
		};
		return {
			start:startFunc,
			cancel:cancelFunc
		};
	};

	var pages = _.mapKeys([
		(function(){
			var username = undefined;
			var password = undefined;
			var lastValidPage = undefined;
			var logIn = function(loginType){
				pageHistory = _.filter(pageHistory,function(i){
					return i.name != "login";
				});
				var params = {loginType:loginType};
				auditHistory.add({
					action:"login",
					result:"successful",
					parameters:params
				});
				callFunc("login",[params]);
				setPageFunc(lastValidPage.name,lastValidPage.args);
			};
			var rejectLogin = function(loginType,reason){
				auditHistory.add({
					action:"login",
					result:"failed",
					parameters:{
						loginType:loginType,
						reason:reason
					}
				});
				alert("Authentication failed.  Please try again");
			};
			var requestBiometrics = function(){
			};
			return {
				"name":"login",
				"activate":function(args,afterFunc){
					lastValidPage = _.head(_.filter(_.reverse(pageHistory),function(i){
						return i.name !== "login";
					}));
					if (lastValidPage === undefined){
						lastValidPage = {
							name:"accountChooser",
							args:[]
						};
					}
					afterFunc();
				},
				"deactivate":function(){
					if ("cancel" in requestBiometrics){
						requestBiometrics.cancel();
					}
				},
				"render":function(html){
					var attemptLogin = function(){
						if (username !== undefined && password !== undefined && username.toLowerCase().trim() == "dave" && password.toLowerCase().trim() == "test"){
							logIn("password");
						} else {
							rejectLogin("password","incorrect credentials");
						}
					};
					var checkKeyUpForSubmit = function(evt){
						if ("keyCode" in evt && evt.keyCode == 13){
							attemptLogin("password");
						}
					};
					var accCreds = html.find(".accountCredentials");
					var usernameInput = accCreds.find(".username").on("change",function(){
						var val = $(this).val();
						username = val;
					}).on("keyup",checkKeyUpForSubmit);
					_.defer(function(){
						usernameInput.focus();
					});
					accCreds.find(".password").on("change",function(){
						var val = $(this).val();
						password = val;
					}).on("keyup",checkKeyUpForSubmit);
					html.find(".submitCredential").on("click",attemptLogin);
					
					var deviceAuthContainer = html.find(".deviceAuthContainer");
					if ("Fingerprint" in window){
						Fingerprint.isAvailable(function(result){
							var deviceAuthButton = html.find(".deviceAuth");
							var doDeviceAuth = function(){
								Fingerprint.show({
									clientId:"superMobileApp",
									clientSecret:"secretPasswordForSuperMobileApp"
								},function(success){
									var authenticated = false;
									var authType = "";
									if ("withFingerprint" in success){
										authenticated = true;
										authType = "fingerprint";
									} else if ("withFace" in success){
										authenticated = true;
										authType = "face";
									} else if ("withPattern" in success){
										authenticated = true;
										authType = "pattern";
									} else if ("withPassword" in success){
										authenticated = true;
										authType = "password";
									} else {
										authenticated = true;
									}
									if (authenticated){
										logIn("biometrics",authType);
									} else {
										rejectLogin("deviceAuth");
									}
								},function(error){
									alert("failed to authenticate with biometrics: "+JSON.stringify(error));
									rejectLogin("deviceAuth");
								});
							};
							deviceAuthButton.on("click",doDeviceAuth);
							//requestBiometrics = _.debounce(doDeviceAuth,1000);
							//requestBiometrics();
						},function(error){
							deviceAuthContainer.remove();
						});
					} else {
						deviceAuthContainer.remove();	
					}
					return html;
				},
				"header":function(){
					return {
						name:"login"
					};
				},
				"footer":function(){
				}
			};
		})(),
		(function(){
			var accounts = [];
			return {
				name:"accountChooser",
				activate:function(args,afterFunc){
					withAccounts(function(accs){
						accounts = accs;
						var total = _.size(accounts);
						_.forEach(accounts,function(account,accIndex){
							withTransactions(account.number,function(trans){
								account.transactions = reduceTransactions(trans);
								if (!(_.some(accounts,function(acc){ return (!("transactions" in acc));}))){
									afterFunc();
								}
							});
						});
					});
				},
				deactivate:function(){
				},
				deferredMessages:[
					{
						message:"You've been looking at the account chooser page for a while.  Are you not seeing an account you were expecting?  Can I help with that?",
						author:"helpdesk",
						delay:10 * 1000
					},
					{
						message:"Perhaps you need to consolidate the account?  Pressing the Consolidate account button lets you enter the details of another account you might have with us, but which might not be showing up here.",
						author:"helpdesk",
						delay:5 * 1000
					}
				],
				header:function(){
					return {
						name:"accounts"
					};
				},
				render:function(html){
					var accountList = html.find(".accountList");
					var accountItemTemplate = accountList.find(".accountItem").clone();
					accountList.html(_.map(accounts,function(account){
						var elem = accountItemTemplate.clone();
						elem.addClass("accountButtonType_"+account.type);
						elem.find(".accountName").text(account.name);
						elem.find(".accountNumber").text(account.number);
						elem.find(".accountBalance").text(formatCurrency(account.transactions.total));
						elem.on("click",function(){
							setPageFunc("accountSummary",[account]);
						});
						return elem;
					}));
					html.find(".consolidateButton").on("click",function(){
						setPageFunc("consolidate");
					});
					html.find(".offersButton").on("click",function(){
						setPageFunc("offers");
					});
					html.find(".profileButton").on("click",function(){
						setPageFunc("profile");
					});
					html.find(".auditButton").on("click",function(){
						setPageFunc("audit");
					});
					return html;
				}
			}
		})(),
		(function(){
			return {
				name:"consolidate",
				activate:function(args,afterFunc){
					afterFunc();
				},
				render:function(html){
					var temp = {
						provider:"",
						number:""
					};
					html.find(".otherAccountProvider .profileInput").on("change",function(){
						var val = $(this).val();
						temp.provider = val;
					});
					html.find(".otherAccountIdentifier .profileInput").on("change",function(){
						var val = $(this).val();
						temp.number = val;
					});
					html.find(".submitNewAccount").on("click",function(){
						auditHistory.add({
							action:"consolidateAccountRequest",
							parameters:temp,
							result:"submitted"
						});
						alert("submitted request to consolidate: "+JSON.stringify(temp));
					});
					return html;
				},
				header:function(){
					return {
						name:"consolidate",
						parent:"accountChooser"
					};
				}
			};
		})(),
		(function(){
			var account = {};
			var transactions = {};
			return {
				activate:function(args,afterFunc){
					account = _.head(args);
					withTransactions(account.number,function(items){
						transactions = reduceTransactions(items);
						afterFunc();
					});
				},
				name:"accountSummary",
				deferredMessages:[
					{
						message:"Are you looking for a button you can't see here?  Can I help with that?",
						author:"helpdesk",
						delay:30 * 1000
					}
				],

				header:function(){
					return {
						name:"account summary",
						parent:"accountChooser"
					};
				},
				render:function(html){
					html.addClass("accountType_"+account.type);
					html.find(".accountName").text(account.name);
					html.find(".accountNumber").text(account.number);
					html.find(".accountBalance").text(formatCurrency(transactions.total));
					var bpayElem = html.find(".bpayDetails");
					if ("bpay" in account){
						bpayElem.find(".bpayBiller .attributeValue").text(account.bpay.billerId);
						bpayElem.find(".bpayRef .attributeValue").text(account.bpay.reference);
						bpayElem.show();
					} else {
						bpayElem.hide();
					}
					html.find(".concessionaryContributionsTotal").text(formatCurrency(transactions.concessional));
					html.find(".nonConcessionalContributionsTotal").text(formatCurrency(transactions.nonConcessional));
					html.find(".lastTransaction").text(formatDate(transactions.lastItem.timestamp));
					html.find(".correspondenceButton").on("click",function(){
						setPageFunc("accountCorrespondence",[account]);
					});
					html.find(".transactionListButton").on("click",function(){
						setPageFunc("accountTransactionList",[account,transactions]);
					});
					html.find(".investmentsBreakdownButton").on("click",function(){
						setPageFunc("accountInvestmentsBreakdown",[account]);
					});
					html.find(".adequacyButton").on("click",function(){
						setPageFunc("accountAdequacy",[account,transactions]);
					});
					html.find(".changeNominationsButton").on("click",function(){
						setPageFunc("accountChangeNomination",[account]);
					});
					var changeEmployerButton = html.find(".changeEmployerButton");
					if ("employer" in account){
						changeEmployerButton.unbind("click").on("click",function(){
							setPageFunc("accountChangeEmployer",[account]);
						}).show();
					} else {
						changeEmployerButton.unbind("click").hide();
					}
					html.find(".insuranceButton").on("click",function(){
						setPageFunc("accountInsurance",[account]);
					});
					return html;
				}
			};
		})(),
		(function(){
			var account = {};
			var transactions = {};
			return {
				name:"accountTransactionList",
				activate:function(args,afterFunc){
					account = args[0];
					transactions = args[1];
					afterFunc();
				},
				deferredMessages:[
					{
						message:"Having trouble finding a transaction you're looking for?  Did you know that you can click on the column headers and resort the list by those headers?  I find it easier to find a particular transaction by date or by type by doing that.  That way, I can sort them that way, and then just skip through the pages until I find it.",
						author:"helpdesk",
						delay:60 * 1000
					}
				],
				render:function(html){
					var gridRoot = html.find(".transactionsListGrid");
					JsGridHelpers.readonlyGrid(gridRoot,transactions.items,[
						{name:"adjustment",title:"adj",type:"currency",width:"25vw"},
						{name:"timestamp",title:"when",type:"date",width:"20vw"},
						{name:"description",title:"",type:"text",width:"25vw"},
						{name:"subTotal",type:"currency",width:"25vw"}
					]);
					return html;
				},
				header:function(){
					return {
						name:"transactions",
						parent:"accountSummary",
						parentArgs:[account]
					};
				},
			};
		})(),
		(function(){
			var account = {};
			var schemes = {};
			return {
				name:"accountInsurance",
				activate:function(args,afterFunc){
					account = args[0];
					withInsuranceSchemes(function(s){
						schemes = s;
						afterFunc();
					});
				},
				deferredMessages:[],
				render:function(html){
					var schemesContainer = html.find(".insuranceSchemesContainer");
					var schemeTemplate = schemesContainer.find(".insuranceScheme").clone();
					schemesContainer.html(_.map(schemes,function(scheme,schemeName){
						var el = schemeTemplate.clone();
						var coverageValue = el.find(".coverageValue");
						el.find(".schemeName").text(scheme.name);
						var premiumCost = el.find(".weeklyContribution");
						
						var elCId = "insuranceScheme_cb_"+schemeName;
						var isCovered = el.find(".coveredInput").attr("name",elCId);
						el.find(".coveredLabel").attr("for",elCId);
						var elId = "insuranceScheme_"+schemeName;
						el.find(".weeklyContributionLabel").attr("for",elId);
						var inputElem = el.find(".weeklyContributionInput").attr("name",elId);
						var reRenderCoverage = function(){
							var amountString = "not contributing";
							var valueString = "not covered";

							if ("insurance" in account && schemeName in account.insurance){
								premiumCost.show();
								var amount = account.insurance[schemeName].amount;
								var value =	amount * scheme.coverageMultiplier;
								valueString =	formatCurrency(amount * scheme.coverageMultiplier);
								amountString = formatCurrency(amount);

								inputElem.show().unbind("change").on("change",function(evt){
									var value = $(this).val();
									account.insurance[schemeName].amount = value;
									var auditItem = _.clone(value);
									value.scheme = schemeName;
									auditHistory.add({
										action:"changedCoverage",
										parameters:auditItem,
										account:account.number,
										result:"applied"
									});
									reRenderCoverage();
								}).val(account.insurance[schemeName].amount);
								isCovered.prop("checked",true);
							} else {
								inputElem.hide().unbind("change");
								isCovered.prop("checked",false);
							}
						 	premiumCost.text(amountString);
							coverageValue.text(valueString);
						};
						isCovered.on("click",function(){
							var isChecked = $(this).is(":checked");
							if (isChecked){
								var newItem = {amount:scheme.min,start:formatDate(Date.now())};
								account.insurance[schemeName] = newItem;
								var auditItem = _.clone(newItem);
								newItem.scheme = schemeName;
								auditHistory.add({
									action:"addCoverage",
									parameters:auditItem,
									account:account.number,
									result:"applied"
								});
							} else {
								auditHistory.add({
									action:"removedCoverage",
									parameters:schemeName,
									account:account.number,
									result:"applied"
								});
								delete account.insurance[schemeName];
							}
							reRenderCoverage();
						});
						inputElem.attr("min",scheme.min).attr("max",scheme.max).attr("step",5);
						reRenderCoverage();
						return el;
					}));
					return html;
				},
				header:function(){
					return {
						name:"insurance",
						parent:"accountSummary",
						parentArgs:[account],
					};
				}
			};
		})(),
		(function(){
			var account = {};
			var transactions = {};
			return {
				name:"accountAdequacy",
				activate:function(args,afterFunc){
					account = args[0];
					transactions = args[1];
					afterFunc();
				},
				deferredMessages:[
					{
						message:"If you're finding it difficult to make sense of the graph, you can zoom in and pan around with your fingers - just use two fingers.",
						author:"helpdesk",
						delay:60 * 1000
					}
				],
				render:function(html){
					var graphRoot = html.find(".transactionsGraph")[0];
					var svg = zoomableGraph(graphRoot,transactions.items,function(d){return d.timestamp;},function(d){return d.subTotal;},function(d){return "balance";},"time","$",true,30);
					return html;
				},
				header:function(){
					return {
						name:"adequacy",
						parent:"accountSummary",
						parentArgs:[account]
					};
				},
			};
		})(),
		(function(){
			var account = {};
			var investmentOptions = [];
			var investmentChoices = {};
			var editing = false;
			return {
				name:"accountInvestmentsBreakdown",
				activate:function(args,afterFunc){
					account = _.head(args);
					withInvestmentOptions(function(invs){
						investmentOptions = invs;
						afterFunc();
					});
				},
				deferredMessages:[
					{
						message:"You can redistribute your investments here - there's an edit button on this page which'll let you change what percentage is in which option.",
						author:"helpdesk",
						delay:60 * 1000
					}
				],
				render:function(html){
					var breakdownList = html.find(".breakdownList");
					var breakdownItemTemplate = breakdownList.find(".investmentOption").clone();
					var changeButton = html.find(".changeBreakdown");
					var cancelButton = html.find(".cancelChangeBreakdown");
					var submitButton = html.find(".applyChangeBreakdown");
					var reRender = function(){
						breakdownList.html(_.map(investmentOptions,function(io){
							var ioElem = breakdownItemTemplate.clone();
							var score = account.investmentOptions[io.name];
							if (score === undefined || _.isNaN(score)){
								score = 0;
							}
							var ioId = "io_" + io.name;
							var label = ioElem.find(".investmentOptionLabel").attr("for",ioId).text(io.name);
							var textValue = ioElem.find(".investmentOptionValue").attr("id","io_val_"+io.name).text(_.round(score,0));
							var inputElem = ioElem.find(".investmentOptionInput").attr("id",ioId).attr("value",_.round(score,0)).val(_.round(score,0));
							if (editing){
								inputElem.on("change",function(nv){
									var newValue = parseInt($(this).val());
									var oldValue = investmentChoices[io.name];
									investmentChoices[io.name] = newValue;
									textValue.text(_.round(newValue,0));
									var diff = _.sum(_.values(investmentChoices));
									if (diff != 100){
										var amount = 100 - diff;
										var options = _.flatMap(investmentChoices,function(v,k){
											if (k != io.name){
												return [{name:k,value:v}];
											} else {
												return [];
											}
										});

										var propTotal = _.sumBy(options,"value");
										if (propTotal == 0){
											_.forEach(options,function(kv){
												var k = kv.name;
												var v = kv.value;
												var nv = v + (amount / _.size(options));
												investmentChoices[k] = nv;
												$("#io_"+k).attr("value",_.round(nv,0)).val(_.round(nv,0));
												$("#io_val_"+k).text(_.round(nv,0));
											});

										} else {
											_.forEach(options,function(kv){
												var k = kv.name;
												var v = kv.value;
												var proportion = v / propTotal;
												var nv = v + (proportion * amount);
												investmentChoices[k] = nv;
												$("#io_"+k).attr("value",_.round(nv,0)).val(_.round(nv,0));
												$("#io_val_"+k).text(_.round(nv,0));
											});
										}
									}
								});
							} else {
								inputElem.attr("readonly",true).prop("disabled",true);
							}
							return ioElem;
						}));
						if (editing){
							changeButton.hide().unbind("click");
							cancelButton.show().on("click",function(){
								investmentChoices = {};
								editing = false;
								reRender();
							});
							submitButton.show().on("click",function(){
								account.investmentOptions = investmentChoices;
								investmentChoices = {};
								editing = false;
								auditHistory.add({
									action:"changedInvestments",
									parameters:account.investmentOptions,
									account:account.number,
									result:"applied"
								});
								reRender();
							});
						} else {
							changeButton.show().on("click",function(){
								investmentChoices = {};
								_.forEach(investmentOptions,function(io){
									if (io.name in account.investmentOptions){
										investmentChoices[io.name] = account.investmentOptions[io.name];
									} else {
										investmentChoices[io.name] = 0;
									}
								});
								editing = true;
								reRender();
							});
							cancelButton.hide().unbind("click");
							submitButton.hide().unbind("click");
						}
					};

					var breakdownGraph = html.find(".breakdownGraph")[0];
					var graphData = _.sortBy(_.flatMap(investmentOptions,function(io){
						return _.map(io.performance,function(pi){
							pi.optionName = io.name;
							return pi;
						});
					}),function(d){return d.timestamp;});
					var svg = zoomableGraph(breakdownGraph,graphData,function(d){return d.timestamp;},function(d){return d.adjustment;},function(d){return d.optionName;},"time","%",true,3);
					reRender();
					return html;
				},
				header:function(){
					return {
						name:"investments",
						parent:"accountSummary",
						parentArgs:[account]
					};
				},
			};
		})(),
		(function(){
			var url = "";
			return {
				name:"viewUrl",
				activate:function(args,afterFunc){
					url = args[0];
					afterFunc();
				},
				header:function(){
					var previous = _.last(_.filter(pageHistory,function(i){return i.name != "viewUrl" && i.name != "login";}));
					if (previous !== undefined){
						return {
							name:url,
							parent:previous.name,
							parentArgs:previous.args
						};
					} else {
						return {
							name:url,
							parent:"accountChooser",
							parentArgs:[]
						};
					}
				},
				render:function(html){
					html.find(".embeddedBrowser").attr("src",url);
					return html;
				}
			};
		})(),
		(function(){
			var account = {};
			var corro = [];
			return {
				name:"accountCorrespondence",
				activate:function(args,afterFunc){
					account = _.head(args);
					withCorrespondence(account.number,function(c){
						corro = c;
						afterFunc();
					});
				},
				deferredMessages:[
					{
						message:"Everything we've sent you should also appear here.  There might even be things we want to send you which haven't turned up in your mailbox yet.  You can always come back here to read it again.",
						author:"helpdesk",
						delay:60 * 1000
					}
				],

				render:function(html){
					var corroContainer = html.find(".correspondenceContainer");
					var corroTemplate = corroContainer.find(".correspondenceItem").clone();
					corroContainer.html(_.map(corro,function(c){
						var el = corroTemplate.clone();
						el.find(".correspondenceItemName").text(c.name);
						el.find(".correspondenceItemDate").text(c.date);
						el.on("click",function(){
							setPageFunc("viewUrl",[c.url]);
						});
						return el;
					}));
					return html;
				},
				header:function(){
					return {
						name:"correspondence",
						parent:"accountSummary",
						parentArgs:[account]
					};
				},
			};
		})(),
		(function(){
			var account = {};
			return {
				name:"accountChangeEmployer",
				activate:function(args,afterFunc){
					account = _.head(args);
					afterFunc();
				},
				render:function(html){
					var editing = false;
					var tempNom = _.clone(account.employer);

					html.find(".employerName .profileLabel").attr("for","nomName");
					var nameInput = html.find(".employerName .profileInput").attr("name","nomName");
					html.find(".employerTitle .profileLabel").attr("for","nomRel");
					var relInput = html.find(".employerTitle .profileInput").attr("name","nomRel");
					var editButton = html.find(".editButton");
					var applyButton = html.find(".applyEditButton");
					var rejectButton = html.find(".rejectEditButton");
					var reRender = function(){
						nameInput.val(tempNom.name);
						relInput.val(tempNom.title);
						if (editing){
							nameInput.unbind("change").attr("disabled",false).attr("readonly",false).on("change",function(){
								var val = $(this).val();
								tempNom.name = val;
							});
							relInput.unbind("change").attr("disabled",false).attr("readonly",false).on("change",function(){
								var val = $(this).val();
								tempNom.title = val;
							});
							editButton.unbind("click").hide();
							applyButton.unbind("click").on("click",function(){
								var oldNom = _.clone(account.nomination);
								account.employer = _.clone(tempNom);
								editing = false;
								auditHistory.add({
									action:"changedEmployer",
									parameters:account.employer,
									account:account.number,
									result:"requested"
								});
								reRender();
							}).show();
							rejectButton.unbind("click").on("click",function(){
								tempNom = _.clone(account.employer);
								editing = false;
								reRender();
							}).show();

						} else {
							nameInput.unbind("change").attr("disabled",true).attr("readonly",true);
							relInput.unbind("change").attr("disabled",true).attr("readonly",true);	
							editButton.unbind("click").on("click",function(){
								editing = true;
								reRender();
							}).show();
							applyButton.unbind("click").hide();
							rejectButton.unbind("click").hide();
						}
					};

					reRender();
					return html;
				},
				header:function(){
					return {
						name:"change employer",
						parent:"accountSummary",
						parentArgs:[account]
					};
				},
			};
		})(),

		(function(){
			var account = {};
			return {
				name:"accountChangeNomination",
				activate:function(args,afterFunc){
					account = _.head(args);
					afterFunc();
				},
				render:function(html){
					var editing = false;
					var tempNom = _.clone(account.nomination);

					html.find(".nominationName .profileLabel").attr("for","nomName");
					var nameInput = html.find(".nominationName .profileInput").attr("name","nomName");
					html.find(".nominationRelationship .profileLabel").attr("for","nomRel");
					var relInput = html.find(".nominationRelationship .profileInput").attr("name","nomRel");
					var editButton = html.find(".editButton");
					var applyButton = html.find(".applyEditButton");
					var rejectButton = html.find(".rejectEditButton");
					var reRender = function(){
						nameInput.val(tempNom.name);
						relInput.val(tempNom.relationship);
						if (editing){
							nameInput.unbind("change").attr("disabled",false).attr("readonly",false).on("change",function(){
								var val = $(this).val();
								tempNom.name = val;
							});
							relInput.unbind("change").attr("disabled",false).attr("readonly",false).on("change",function(){
								var val = $(this).val();
								tempNom.relationship = val;
							});
							editButton.unbind("click").hide();
							applyButton.unbind("click").on("click",function(){
								var oldNom = _.clone(account.nomination);
								account.nomination = _.clone(tempNom);
								editing = false;
								auditHistory.add({
									action:"changedNominations",
									parameters:account.nomination,
									account:account.number,
									result:"requested"
								});
								reRender();
							}).show();
							rejectButton.unbind("click").on("click",function(){
								tempNom = _.clone(account.nomination);
								editing = false;
								reRender();
							}).show();

						} else {
							nameInput.unbind("change").attr("disabled",true).attr("readonly",true);
							relInput.unbind("change").attr("disabled",true).attr("readonly",true);	
							editButton.unbind("click").on("click",function(){
								editing = true;
								reRender();
							}).show();
							applyButton.unbind("click").hide();
							rejectButton.unbind("click").hide();
						}
					};

					reRender();
					return html;
				},
				header:function(){
					return {
						name:"change nominations",
						parent:"accountSummary",
						parentArgs:[account]
					};
				},
			};
		})(),
		(function(){
			var profile = {};
			withProfile(function(prof){
				profile = prof;
			});
			return {
				name:"profile",
				activate:function(args,afterFunc){
					afterFunc();
				},	
				deferredMessages:[
					{
						message:"Are these not your details?  There's an edit button on this page which you can use to fix that.",
						author:"helpdesk",
						delay:60 * 1000
					}
				],
				header:function(){
					return {
						name:"profile",
						parent:"accountChooser",
						parentArgs:[]
					};
				},
				render:function(html){
					var editing = false;
					var tempProfile = _.clone(profile);
					var editAccount = function(selector,attribute){
						var rootElem = html.find(selector);
						var id = sprintf("profile_%s",attribute);
						var inputElem = rootElem.find(".profileInput").val(tempProfile[attribute]).attr("name",id);
						var labelElem = rootElem.find(".profileLabel").attr("for",id); 
						if (editing){
							inputElem.on("change",function(){
								var val = $(this).val();
								tempProfile[attribute] = val;
							}).attr("readonly",false).attr("disabled",false);
						} else {
							inputElem.attr("readonly",true).attr("disabled",true).unbind("change");
						}
					}
					var editButton = html.find(".editButton");
					var applyButton = html.find(".applyEditButton");
					var rejectButton = html.find(".rejectEditButton");	
					var reRender = function(){
						editAccount(".firstName","firstName");	
						editAccount(".middleNames","middleNames");	
						editAccount(".surname","surname");	
						editAccount(".dateOfBirth","dateOfBirth");	
						editAccount(".taxFileNumber","taxFileNumber");	
						editAccount(".homeAddress","homeAddress");	
						editAccount(".homeSuburb","homeSuburb");	
						editAccount(".homeState","homeState");	
						editAccount(".homeCountry","homeCountry");	
						editAccount(".homePostCode","homePostCode");	
						editAccount(".mobilePhoneNumber","mobilePhoneNumber");	
						editAccount(".emailAddress","emailAddress");	
						if (editing){
							editButton.unbind("click").hide();
							applyButton.unbind("click").on("click",function(){
								var oldProfile = _.clone(profile);
								profile = _.clone(tempProfile);
								editing = false;
								auditHistory.add({
									action:"changedProfile",
									parameters:profile,
									result:"applied"
								});
								offers.addOffer({
									name:"free movie ticket",
									imageUrl:"resources/offers/film.jpg",
									text:"thanks for updating your profile.  That's really important to us, and we'll take good care of the information.  Take care of yourself, with a free movie ticket!  (I hope you like free-domain movies)",
									expiry:formatDate(Date.now() + (30 * 24 * 60 * 60 * 1000))
								});
								reRender();
							}).show();
							rejectButton.unbind("click").on("click",function(){
								tempProfile = _.clone(profile);
								editing = false;
								reRender();
							}).show();
						} else {
							editButton.unbind("click").on("click",function(){
								editing = true;
								reRender();
							}).show();
							applyButton.unbind("click").hide();
							rejectButton.unbind("click").hide();
						}
					};
					reRender();
					return html;
				}
			};
		})(),
		(function(){
			var sendCurrentMessage = function(){
				if (currentMessage !== undefined && currentMessage != ""){
					chat.addMessage(currentMessage,"me");
					newMessageBox.val("");
					auditHistory.add({
						action:"sentChatMessage",
						parameters:{
							message:currentMessage,
							from:"me"
						},
						result:"sent"
					});
					currentMessage = "";
					reRenderChatHistory();
				}
			};
			var chatHistoryRoot,chatTemplate,newMessageBox;
			var reRenderChatHistory = function(){
				if (chatHistoryRoot !== undefined && chatTemplate !== undefined){
					var history = chat.getHistory();
					_.forEach(history,function(cm){
						cm.unread = false;
						if ("notification" in cm && "close" in cm.notification){
							try {
								cm.notification.close();
							} catch (e){
								console.log("failed to close notification",cm,e);
							}
							delete cm.notification;
						}
					});
					chatHistoryRoot.html(_.map(history,function(chatItem){
						var chatElem = chatTemplate.clone();
						chatElem.find(".chatFrom").text(chatItem.from);
						chatElem.find(".chatMessage").text(chatItem.message);
						chatElem.find(".chatTimestamp").text(formatDateTime(chatItem.when));
						chatElem.find(".chatImage").attr("src","resources/chat/"+chatItem.from+".jpg");
						if (chatItem.from == "me"){
							chatElem.addClass("outgoingMessage").removeClass("incomingMessage");
						} else {
							chatElem.addClass("incomingMessage").removeClass("outgoingMessage");
						}
						return chatElem;
					}));
					chatHistoryRoot.animate({ scrollTop: _.sumBy(chatHistoryRoot.find(".chatItem"),function(i){return $(i).height();}) },"slow");
				}
			};
			var currentMessage = "";
			var chatId = "chatPane_"+_.uniqueId().toString();
			return {
				name:"chat",
				activate:function(args,afterFunc){
						chatId = "chatPane_"+_.uniqueId().toString();
						bindFunc("chat",chatId,function(m){
							reRenderChatHistory();
						});	
						afterFunc();
				},
				deactivate:function(){
					unbindFunc("chat",chatId);
				},
				header:function(){
					var previous = _.last(_.filter(pageHistory,function(i){return i.name != "chat"  && i.name != "news" && i.name != "login";}));
					if (previous !== undefined){
						return {
							name:"chat",
							parent:previous.name,
							parentArgs:previous.args
						};
					} else {
						return {
							name:"chat",
							parent:"accountChooser",
							parentArgs:[]
						};
					}
				},
				render:function(html){
					chatHistoryRoot = html.find(".chatContainer");
					chatTemplate = chatHistoryRoot.find(".chatItem").clone();
					
					chatHistoryRoot.empty();
					reRenderChatHistory();
					newMessageBox = html.find(".newMessage").on("keyup",function(evt){
						var value = $(this).val();
						currentMessage = value;
						if ("keyCode" in evt){
							if (evt.keyCode == 13){
								sendCurrentMessage();
							}
						}
					});
					html.find(".sendMessage").on("click",function(){
						sendCurrentMessage();
					});
					return html;
				}
			};
		})(),
		(function(){
			var pageId = "news_"+_.uniqueId();
			var reRender = function(){
				if (newsContainer !== undefined && template !== undefined){
					newsContainer.html(_.map(news.getAll(),function(article){
						var newsElem = template.clone();
						newsElem.find(".newsItemHeader").text(article.heading);
						newsElem.find(".newsItemImage").attr("src",article.image);
						newsElem.find(".newsItemTimestamp").text(formatDate(article.timestamp));
						newsElem.find(".newsItemSummary").text(article.summary);
						newsElem.find(".newsItemLink").attr("href",article.url);
						return newsElem;
					}));
				}
			};
			return {
				name:"news",
				activate:function(args,afterFunc){
					afterFunc();
					bindFunc("news",pageId,reRender);
				},
				header:function(){
					var previous = _.last(_.filter(pageHistory,function(i){return i.name != "news" && i.name != "chat" && i.name != "login";}));
					if (previous !== undefined){
						return {
							name:"news",
							parent:previous.name,
							parentArgs:previous.args
						};
					} else {
						return {
							name:"news",
							parent:"accountChooser",
							parentArgs:[]
						};
					}
				},
				deactivate:function(){
					unbindFunc("news",pageId);
				},
				render:function(html){
					newsContainer = html.find(".newsContainer");	
					template = newsContainer.find(".newsItem").clone();
					reRender();
					return html;
				}
			};
		})(),
		(function(){
			return {
				name:"audit",
				activate:function(args,afterFunc){
					afterFunc();
				},
				deactivate:function(){
				},
				render:function(html){
					var gridRoot = html.find(".auditGrid");
					var items = _.filter(auditHistory.getHistory(),function(item){
						return (!("visible" in item) || item.visible == true);
					});
					JsGridHelpers.readonlyGrid(gridRoot,items,[
						{name:"when",title:"when",type:"date",width:"20vw"},
						{name:"account",title:"acct",type:"text",width:"10vw"},
						{name:"action",title:"action",type:"text",width:"30vw"},
						{name:"result",type:"text",width:"25vw"},
						{name:"parameters",title:"show",type:"alert",width:"10vw"}
					]);
					return html;
				},
				header:function(){
					return {
						name:"audit",
						parent:"accountChooser",
						parentArgs:[]
					};
				}
			};
		})(),
		(function(){
			var pageId = "offers_"+_.uniqueId();
			var offerContainer = undefined;
			var offerTemplate = undefined;
			var reRender = function(){
				if (offerTemplate !== undefined && offerContainer !== undefined){
					offerContainer.html(_.map(offers.getAll(),function(offer){
						var elem = offerTemplate.clone();
						elem.find(".offerName").text(offer.name);
						elem.find(".offerImage").attr("src",offer.imageUrl);
						elem.find(".offerText").text(offer.text);
						elem.find(".offerExpiry").text(offer.expiry);
						return elem;
					}));
				}
			};
			return {
				name:"offers",
				activate:function(args,afterFunc){
					bindFunc("offer",pageId,function(o){
						reRender();
					});
					afterFunc();
				},
				deactivate:function(){
					unbindFunc("offer",pageId);
				},
				render:function(html){
					offerContainer = html.find(".offersContainer");
					offerTemplate = offerContainer.find(".offerItem").clone();
					reRender();
					return html;
				},
				header:function(){
					return {
						name:"offers",
						parent:"accountChooser",
						parentArgs:[]
					};
				}
			};
		})()
	],function(page){
		return page.name;
	});

	return {
		on:bindFunc,
		off:unbindFunc,	
		call:callFunc,
		setPage:setPageFunc,
		getPage:getPageFunc,
		getAuditHistory:function(){
			return auditHistory.getHistory();
		},
		addOffer:offers.addOffer,
		addNews:news.addNews,
		addChat:chat.addMessage
	};
})();

var mocker = (function(){
	/* fake events for the demo as though the server had supplied them*/
	var submitLoginOffer = _.once(function(){
		app.addOffer({
			name:"free coffee",
			imageUrl:"resources/offers/coffee.jpg",
			text:"thanks for logging in.  Have a free coffee, on us!",
			expiry:formatDate(Date.now() + (30 * 24 * 60 * 60 * 1000))
		});
	});
	app.on("login","mocker",_.debounce(submitLoginOffer,20 * 1000));

	var submitNewsItem = _.debounce(function(){
		app.addNews({
			heading:"testNews",
			timestamp:Date.now(),
			summary:"something happened!",
			image:"",
			url:""
		});
	},30 * 1000)();

	var gamification = (function(){
		var trackRecord = [];
		var genCode = function(){
			return "trophyCode_"+_.uniqueId();
		};
		var trophy = function(name,message,item){
			console.log("trophy!",name,message,item);
			var fm = message;
			if (item !== undefined){
				fm += sprintf("  quote this code: %s to receive %s",genCode(),item);
			}
			app.addOffer({
				name:sprintf("trophy: %s",name),
				imageUrl:"",
				text:fm,
				expiry:formatDate(Date.now() + (30 * 24 * 60 * 60 * 1000))
			});
		};
		var initiateTrophy = _.once(function(){
			trophy("initiate","thanks for looking around.  Looks like you're getting a sense of where everything is.","a free cookie");
		});
		var initiateRule = function(){
			if (_.size(trackRecord) > 10){
				initiateTrophy();
			}
		};
		var spectatorTrophy = _.once(function(){
			trophy("spectator","obsessed with your super?  That's a good thing!  It's important to keep an eye on your future.","a red balloon");
		});
		var spectatorRule = function(){
			if (_.size(_.filter(trackRecord,function(a){
				return a.action == "viewedPage";
			})) > 25){
				spectatorTrophy();
			}
		};
		var chatTrophy = _.once(function(){
			trophy("chatty","looking for a friend?  We're always happy to listen.");
		});
		var chattyRule = function(){
			if (_.size(_.filter(trackRecord,function(a){
				return a.action == "sentChatMessage";
			})) > 5){
				chatTrophy();
			}
		};
		app.on("audit","mocker_gamification",function(a){
			trackRecord.push(a);
			console.log("new message",a);
			_.forEach([initiateRule,spectatorRule,chattyRule],function(rule){
				rule();
			});
		});
	})();

	var chatBot = (function(){
		var eliza = new ElizaBot();
		eliza.memSize = 200;
		var elizaInitial = eliza.getInitial();
		var getDelayInterval = function(){
			return 1000 * _.random(1,5);
		};
		app.on("chat","chatBot",function(m){
			var author = m.from;
			var message = m.message;
			if (author == "me"){
				_.delay(function(){
					var reply = eliza.transform(message);
					app.addChat(reply,"helpdesk");
				},getDelayInterval());
			}
		});
	})();

/* end fake events */


})();
