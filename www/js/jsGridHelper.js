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
		var grid = $(selector).jsGrid({
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
	return {
		initialize:_.once(initFunc),
		readonlyGrid:createReadonlyGrid
	};
})();

var formatCurrency = function(currency){
	return "$"+_.round(currency,2).toString();
}

var formatDate = function(dateLong){
	var d = new Date(dateLong);
	return d.getDate() +"/"+ (d.getMonth() + 1).toString() +"/"+ (d.getYear() + 1900).toString();
}

