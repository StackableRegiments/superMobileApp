var generateMockTransactions = function(account,start,end,yearlyIncome,seed){
	var seedValue = seed ? seed : 0;
	var income = (yearlyIncome !== undefined ? yearlyIncome : 60000);
	var trans = [];
	var startParts = start.split('-');
	var startPoint = new Date(startParts[0],startParts[1],startParts[2]).getTime();
	var endParts = end.split('-');
	var endPoint = new Date(endParts[0],endParts[1],endParts[2]).getTime();

	//starting point
	if (seedValue != 0){
		trans.push({
			account:account,
			timestamp:startPoint,
			adjustment:seedValue,
			type:"SEED",
			description:"rollin"
		});
	}
	//a fee every month
	var feePoint = startPoint;
	while (feePoint <= endPoint){
		var adjustment = 10;
		if (!_.isNaN(adjustment) && adjustment > 0){
			trans.push({
				account:account,
				timestamp:feePoint,
				adjustment:adjustment,
				type:"FEE",
				description:"administration"
			});
		}
		feePoint += (1000 * 60 * 60 * 24 * 28);
	}
	//cc every fortnight
	var ccPoint = startPoint;
	while (ccPoint <= endPoint){
		var adjustment = (income / 24) * 0.07; //7% contribution
		if (!_.isNaN(adjustment) && adjustment > 0){
			trans.push({
				account:account,
				timestamp:ccPoint,
				adjustment:adjustment,
				type:"CC",
				description:"concessional contribution"
			});
		}
		ccPoint += (1000 * 60 * 60 * 24 * 14);
	}
	//ncc every month
	var nccPoint = startPoint;
	while (nccPoint <= endPoint){
		var adjustment = (income / 12) * 0.14;
		if (!_.isNaN(adjustment) && adjustment > 0){
			trans.push({
				account:account,
				timestamp:nccPoint,
				type:"NCC",
				description:"non-concessional contribution",
				adjustment:adjustment, // 14% contribution
			});
		}
		nccPoint += (1000 * 60 * 60 * 24 * 31);
	}
	//sort them now and attach 
	trans = _.sortBy(trans,function(item){return item.timestamp;});
	trans = _.reduce(trans,function(acc,item){
		var st = acc.subtotal + item.adjustment;
		item.subtotal = st;
		acc.subtotal = st;
		acc.items.push(item);
		return acc;
	},{
		items:[],
		subtotal:0
	}).items;
	//interest accrual every week
	var intPoint = startPoint;
	while (intPoint <= endPoint){
		var relevantItems = _.filter(trans,function(t){
			return "subtotal" in t && t.timestamp <= intPoint;
		});
		var lastItem = _.last(relevantItems);
		var rate = (((_.random(-3,30) / 30) * 4) / 100);
		var totalHoldings = lastItem !== undefined ? lastItem.subtotal : 0;
		var interest = (rate * totalHoldings) / 52;
		if (interest != 0 && interest != null && interest !== undefined && !_.isNaN(interest)){
			trans.push({
				account:account,
				timestamp:intPoint,
				adjustment:interest,
				type:"INT",
				description:"interest"
			});
		}
		intPoint += (1000 * 60 * 60 * 24 * 7);
	}
	//sort them again	
	trans = _.sortBy(trans,function(item){return item.timestamp;});
	trans = _.reduce(trans,function(acc,item){
		var st = acc.subtotal + item.adjustment;
		item.subtotal = st;
		acc.subtotal = st;
		acc.items.push(item);
		return acc;
	},{
		items:[],
		subtotal:0
	}).items;
	return trans;
};

var generateData = function(){
	var acc2 = generateMockTransactions(2,"1982-11-06","2004-05-28",86000,0); 
	var closingAcc2 = _.last(acc2);
	acc2.push({
		account:2,
		timestamp:closingAcc2.timestamp + (1000 * 60 * 60),
		adjustment:-1 * closingAcc2.subtotal,
		description:"rollover",
		type:"CLOSE"
	});
	var acc1 = generateMockTransactions(1,"2004-05-28","2018-03-12",32000,0); 
	var acc0 = generateMockTransactions(0,"2004-05-28","2018-03-12",0,closingAcc2.subtotal); 
	return [acc0,acc1,acc2];
};
