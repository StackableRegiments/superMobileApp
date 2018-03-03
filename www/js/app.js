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
	var withTransactions = function(account,transactionsFunc){
	};
	var withInvestmentOptions = function(investmentsFunc){
	};
	var withNews = function(newsFunc){

	};

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
			if ("activate" in newPage){
				newPage.activate(args);
			}
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
				var backToParentButton = headerContainer.find(".backToParentButton");
				if ("parent" in h){
					backToParentButton.fadeIn().on("click",function(){
						setPageFunc(h.parent);
					});
				} else {
					backToParentButton.fadeOut().unbind("click");
				}
			}
			if ("footer" in newPage){
				footerContainer.html(newPage.footer());
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
				"name":"accountChooser",
				"activate":function(args){
					withAccounts(function(accs){
						accounts = accs;
					});
				},
				"header":function(){
					return {
						name:"accounts"
					};
				},
				"render":function(html){
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
					return html;
				}
			}
		})(),
		{
			name:"consolidate",
		},
		(function(){
			var account = {};
			var transactions = [];
			return {
				activate:function(args){
					account = _.head(args);
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
					html.find(".accountBalance").text("$0");
					html.find(".concessionaryContributionsTotal").text("$0");
					html.find(".nonConcessionalContributionsTotal").text("$0");
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
			return {
				name:"accountTransactionList",
				activate:function(args){
					account = _.head(args);
				},
				header:function(){
					return {
						name:"transactions",
						parent:"accountSummary",
						parentArgs:account
					};
				},
			};
		})(),
		(function(){
			var account = {};
			return {
				name:"accountTransactionGraph",
				activate:function(args){
					account = _.head(args);
				},
				header:function(){
					return {
						name:"transactions graph",
						parent:"accountSummary",
						parentArgs:account
					};
				},
			};
		})(),
		(function(){
			var account = {};
			return {
				name:"accountInvestmentsBreakdown",
				activate:function(args){
					account = _.head(args);
				},
				header:function(){
					return {
						name:"investments",
						parent:"accountSummary",
						parentArgs:account
					};
				},
			};
		})(),
		(function(){
			var account = {};
			return {
				name:"accountCorrespondence",
				activate:function(args){
					account = _.head(args);
				},
				header:function(){
					return {
						name:"correspondence",
						parent:"accountSummary",
						parentArgs:account
					};
				},
			};
		})(),
		(function(){
			var account = {};
			return {
				name:"accountAdequacy",
				activate:function(args){
					account = _.head(args);
				},
				header:function(){
					return {
						name:"adequacy",
						parent:"accountSummary",
						parentArgs:account
					};
				},
			};
		})(),
		(function(){
			var account = {};
			return {
				name:"accountChangeNominations",
				activate:function(args){
					account = _.head(args);
				},
				header:function(){
					return {
						name:"change nominations",
						parent:"accountSummary",
						parentArgs:account
					};
				},
			};
		})(),
		{
			name:"profile"
		},
		{
			name:"chat"
		},
		{
			name:"news"
		}
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
