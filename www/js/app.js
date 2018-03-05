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
		var templateRoot = $("#pageTemplates");
		_.forEach(templateRoot.find(".pageTemplate"),function(templateItem){
			var template = $(templateItem);
			var templateId = template.attr("id");
			templates[templateId] = template.clone();
		});
		templateRoot.empty();
		templateRoot.remove();

		var reauth = function(){
			setPageFunc("login",[]);
		};
		bindFunc("online","reauthentication",reauth);
		bindFunc("resume","reauthentication",reauth);
		//bindFunc("deviceready","reauthentication",reauth);

		bindFunc("deviceready","startup",function(){
			setPageFunc("accountChooser");
		});
		setPageFunc("accountChooser");
	});
	var pages = _.mapKeys([
		{
			"name":"login",
			"activate":function(args){
			},
			"render":function(html){
				var accCreds = html.find(".accountCredentials");
					accCreds.find(".username");
					accCreds.find(".password");
				return html;
			},
			"header":function(){
				return {
					name:"login"
				};
			},
			"footer":function(){
			}
		},
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
					JsGridHelpers.readonlyGrid(html.find("#transactionsListGrid"),transactions.items,[
						{name:"adjustment",title:"adj",type:"currency"},
						{name:"timestamp",title:"when",type:"date"},
						{name:"total",type:"currency"}
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
			return {
				name:"accountInvestmentsBreakdown",
				activate:function(args,afterFunc){
					account = _.head(args);
					afterFunc();
				},
				render:function(html){
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
