(function () {
	"use strict";

	var root = {};

	function Vector2(x, y) {
		if (!this instanceof Vector2)
			return new Vector2(x, y);
		this.x = x;
		this.y = y;
	};

	Vector2.prototype.add = function(other) {
		return new Vector2(this.x + other.x, this.y + other.y);
	};

	Vector2.prototype.sub = function(other) {
		return new Vector2(this.x - other.x, this.y - other.y);
	};

	Vector2.prototype.mult = function(scalar) {
		return new Vector2(this.x * scalar, this.y * scalar);
	};

	Vector2.prototype.div = function(scalar) {
		return new Vector2(this.x / scalar, this.y / scalar);
	};

	Vector2.prototype.dot = function(other) {
		return this.x * other.x + this.y * other.y;
	};

	Vector2.prototype.length = function() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	};

	root.Vector2 = Vector2;

	// running in node.js
	if (typeof window === 'undefined') {
		module.exports = root;
	}
	// running in browser
	else {
		window.LibGeom = root;
	}
})();