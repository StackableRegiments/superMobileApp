var app = (function(){

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

	var formatCurrency = function(currency){
		return "$"+_.round(currency,2).toString();
	};

	var formatDate = function(dateLong){
		var d = new Date(dateLong);
		return d.getDate() +"/"+ (d.getMonth() + 1).toString() +"/"+ (d.getYear() + 1900).toString();
	};
	
	var zoomableGraph = function(selector,data,xFunc,yFunc,lineSelectorFunc,xAxisLabel,yAxisLabel){
	//data is a jsonArray of datum
	//selector is a jquery selector
	//xFunc is the extractor from datum to provide the xValue
	//yFunc is the extractor from datum to provide the yValue
	//lineSelectorFunc is a function which partitions the data into separate lines, with names
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
	var JsGridHelpers = (function(){
		var initFunc = function(){
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
		document.addEventListener(eventName,function(){
			callFunc(eventName,[]);
		},false);
	});
	var initialize = _.once(function(){

	});
	bindFunc("deviceready","initializer",function(args){
		initialize();
	});

	var mainPaneContainer,headerContainer,footerContainer;

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
	var setPageFunc = function(pageName,args){
		var newPage = pages[pageName];
		if (newPage !== undefined && mainPaneContainer !== undefined){
			callFunc("prePageChange",[pageName,args]);
			pageHistory.push({name:pageName,args:args});
			if ("deactivate" in currentPage){
				currentPage.deactivate();
			}
			currentPage = newPage;
			var oldPageContent = mainPaneContainer.find(".pageTemplate");
			oldPageContent.fadeOut(400,function(){
				oldPageContent.remove();
			});
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
				if ("footer" in newPage){
					footerContainer.html(newPage.footer());
				}
			};
			if ("activate" in newPage){
				newPage.activate(args,renderFunc);
			} else {
				renderFunc();
			}
			callFunc("postPageChange",[pageName,args]);
		}
	};
	var getPageFunc = function(){
		return page;
	}
	var templates = {};
	$(function(){
		mainPaneContainer = $("#mainPane");
		headerContainer = $("#header");
		footerContainer = $("#footer");
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
		//bindFunc("deviceready","reauthentication",reauth);

		bindFunc("deviceready","startup",function(){
			setPageFunc("login");
		});
	});
	var pages = _.mapKeys([
		(function(){
			var username = undefined;
			var password = undefined;
			var lastValidPage = undefined;
			var logIn = function(){
				pageHistory = _.filter(pageHistory,function(i){
					return i.name != "login";
				});
				setPageFunc(lastValidPage.name,lastValidPage.args);
			};
			var rejectLogin = function(){
				alert("Authentication failed.  Please try again");
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
				"render":function(html){
					var attemptLogin = function(){
						if (username !== undefined && password !== undefined && username == "dave" && password == "test"){
							logIn();
						} else {
							rejectLogin();
						}
					};
					var checkKeyUpForSubmit = function(evt){
						if ("keyCode" in evt && evt.keyCode == 13){
							attemptLogin();
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
					accCreds.find(".submitCredential").on("click",attemptLogin);
					
					var deviceAuthContainer = html.find(".deviceAuthContainer");
					if ("Fingerprint" in window){
						Fingerprint.isAvailable(function(result){
							var deviceAuthButton = html.find(".deviceAuth");
							deviceAuthButton.on("click",function(){
								Fingerprint.show({
									clientId:"superMobileApp",
									clientSecret:"secretPasswordForSuperMobileApp"
								},function(success){
									var authenticated = false;
									if ("withFingerprint" in success){
										authenticated = true;
									} else if ("withFace" in success){
										authenticated = true;
									} else if ("withPattern" in success){
										authenticated = true;
									} else if ("withPassword" in success){
										authenticated = true;
									} else {
										authenticated = true;
									}
									if (authenticated){
										logIn();
									} else {
										rejectLogin();
									}
								},function(error){
									alert("failed to authenticate with biometrics");
								});
							});
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
						afterFunc();
					});
				},
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
						elem.find(".accountName").text(account.name);
						elem.on("click",function(){
							setPageFunc("accountSummary",[account]);
						});
						return elem;
					}));
					html.find(".consolidateButton").on("click",function(){
						setPageFunc("consolidate");
					});
					return html;
				}
			}
		})(),
		{
			name:"consolidate",
			render:function(html){
				return html;
			},
			header:function(){
				return {
					name:"consolidate",
					parent:"accountChooser"
				};
			}
		},
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
				header:function(){
					return {
						name:"account summary",
						parent:"accountChooser"
					};
				},
				render:function(html){
					html.find(".accountName").text(account.name);
					html.find(".accountNumber").text(account.number);
					html.find(".accountBalance").text(formatCurrency(transactions.total));
					html.find(".concessionaryContributionsTotal").text(formatCurrency(transactions.concessional));
					html.find(".nonConcessionalContributionsTotal").text(formatCurrency(transactions.nonConcessional));
					html.find(".lastTransaction").text(formatDate(transactions.lastItem.timestamp));
					html.find(".correspondenceButton").on("click",function(){
						setPageFunc("accountCorrespondence",[account]);
					});
					html.find(".transactionListButton").on("click",function(){
						setPageFunc("accountTransactionList",[account,transactions]);
					});
					html.find(".transactionsGraphButton").on("click",function(){
						setPageFunc("accountTransactionsGraph",[account,transactions]);
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
				render:function(html){
					var gridRoot = html.find(".transactionsListGrid");
					JsGridHelpers.readonlyGrid(gridRoot,transactions.items,[
						{name:"adjustment",title:"adj",type:"currency"},
						{name:"timestamp",title:"when",type:"date"},
						{name:"description",title:"",type:"text"},
						{name:"subTotal",type:"currency"}
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
			var transactions = {};
			return {
				name:"accountTransactionsGraph",
				activate:function(args,afterFunc){
					account = args[0];
					transactions = args[1];
					afterFunc();
				},
				render:function(html){
					var graphRoot = html.find(".transactionsGraph")[0];
					var svg = zoomableGraph(graphRoot,transactions.items,function(d){return d.timestamp;},function(d){return d.subTotal;},function(d){return "balance";},"time","$");
					return html;
				},
				header:function(){
					return {
						name:"transactions graph",
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
					var graphData = _.flatMap(investmentOptions,function(io){
						return _.map(io.performance,function(pi){
							pi.optionName = io.name;
							return pi;
						});
					});
					var svg = zoomableGraph(breakdownGraph,graphData,function(d){return d.timestamp;},function(d){return d.adjustment;},function(d){return d.optionName;},"time","%");
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
			var account = {};
			return {
				name:"accountCorrespondence",
				activate:function(args,afterFunc){
					account = _.head(args);
					afterFunc();
				},
				render:function(html){
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
				name:"accountAdequacy",
				activate:function(args,afterFunc){
					account = _.head(args);
					afterFunc();
				},
				render:function(html){
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
			return {
				name:"accountChangeNomination",
				activate:function(args,afterFunc){
					account = _.head(args);
					afterFunc();
				},
				render:function(html){
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
			return {
				name:"profile",
				activate:function(args,afterFunc){
					afterFunc();
				},
				render:function(html){
					return html;
				}
			};
		})(),
		(function(){
			return {
				name:"chat",
				activate:function(args,afterFunc){
					afterFunc();
				},
				render:function(html){
					return html;
				}
			};
		})(),
		(function(){
			return {
				name:"news",
				activate:function(args,afterFunc){
					afterFunc();
				},
				render:function(html){
					return html;
				}
			};
		})()
	],function(page){
		return page.name;
	});

	return {
		on:bindFunc,
		call:callFunc,
		setPage:setPageFunc,
		getPage:getPageFunc
	};
})();
