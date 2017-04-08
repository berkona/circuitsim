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

	function Line(from, to) {
		if (!this instanceof Line)
			return new Line(x, y);
		this.from = from;
		this.to = to;
	};

	root.Line = Line;

	function PolyLine(points) {
		if (!this instanceof PolyLine)
			return new PolyLine(points);
		this.points = points;
	};

	root.PolyLine = PolyLine;

	function Rect(x, y, width, height) {
		if (!this instanceof Rect)
			return new Rect(x, y, width, height);
	}

	root.Rect = Rect;

	function Circle(pos, radius) {
		if (!this instanceof Circle)
			return new Circle(pos, radius)
		this.pos = pos;
		this.radius = radius;
	}

	function CircleLineIntersection(circle, line) {
		// finds the intersection between a circle and a line
		// the circle is assumed to be represented by the center (C, a 2d point vector) and a radius (r, scalar)
		// the line is assumed to be a 2-tuple of 2d point vectors
		var seg_a = line.from;
		var seg_b = line.to;
		var cir_pos = circle.pos;

		// find the vector A -> B
		var seg_v = seg_b.sub(seg_a);

		// find the vector A -> C
		var pt_v = cir_pos.sub(seg_a);

		var seg_v_unit = seg_v.div(seg_v.length());
		var proj = pt_v.dot(seg_v_unit);
		var closest;
		if (proj < 0) {
			// projection is "before" start of line segment
			closest = seg_a;
		} else if (proj > seg_v.length()) {
			// projection is "after" end of line segment
			closest = seg_b; 
		} else {
			// get vector of projection and convert to world-space
			closest = seg_v_unit.mult(proj).add(seg_a);
		}
		var rejection = cir_pos.sub(closest);
		if (rejection.length() <= circle.radius) {
			return closest;
		} else {
			return null;
		}
	}

	root.CircleLineIntersection = CircleLineIntersection;

	function CirclePolyLineIntersection(circle, polyline) {
		for (var i = polyline.points.length - 1; i > 0; i--) {
			var closest = CircleLineIntersection(circle, new LibGeom.Line(polyline.points[i], polyline.points[i-1]));
			if (closest)
				return closest;
		};
		return null;
	}

	root.CirclePolyLineIntersection = CirclePolyLineIntersection;

	// running in node.js
	if (typeof window === 'undefined') {
		module.exports = root;
	}
	// running in browser
	else {
		window.LibGeom = root;
	}
})();