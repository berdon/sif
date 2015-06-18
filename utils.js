function property(name, defaultValue) {
	this['_' + name] = defaultValue;
	return function(value) {
		if(arguments.length == 0 || value == undefined) {
			return this['_' + name];
		}

		this['_' + name] = value;
		return value;
	}
}

function getter(name, defaultValue) {
	this['_' + name] = defaultValue;
	return function(value) {
		return this['_' + name];
	}
}

module.exports = {
	property: property,
	getter: getter,
	setter: setter
}