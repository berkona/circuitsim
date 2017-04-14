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

	Vector2.prototype.cross = function(other) {
		return this.x * other.y - this.y * other.x
	};

	Vector2.prototype.length = function() {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	};

	Vector2.prototype.lt = function(other) {
		return this.y < other.x && this.y < other.y;
	};

	Vector2.prototype.lte = function(other) {
		return this.x <= other.x && this.y <= other.y;
	};

	Vector2.prototype.gt = function(other) {
		return this.x > other.x && this.y > other.y;
	};

	Vector2.prototype.gte = function(other) {
		return this.x >= other.x && this.y >= other.y
	};

	root.Vector2 = Vector2;

	function Line(from, to) {
		if (!this instanceof Line)
			return new Line(x, y);
		this.from = from;
		this.to = to;
	}

	root.Line = Line;

	function PolyLine(points) {
		if (!this instanceof PolyLine)
			return new PolyLine(points);
		this.points = points;
		this.lines = [];
		for (var i = points.length - 1; i > 0; i--) {
			this.lines.push(new LibGeom.Line(points[i], points[i-1]));
		};
	}

	root.PolyLine = PolyLine;

	function Rect(x, y, width, height) {
		if (!this instanceof Rect)
			return new Rect(x, y, width, height);

		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;

		this.topLeft = new Vector2(x, y);
		this.topRight = new Vector2(x + width, y);
		this.bottomLeft = new Vector2(x, y + height);
		this.bottomRight = new Vector2(x + width, y + height);

		// define a PolyLine topLeft -> topRight -> bottomRight -> bottomLeft -> topLeft
		this.boundingBox = new PolyLine([this.topLeft, this.topRight, this.bottomRight, this.bottomLeft, this.topLeft]);
	}

	root.Rect = Rect;

	function Circle(pos, radius) {
		if (!this instanceof Circle)
			return new Circle(pos, radius)
		this.pos = pos;
		this.radius = radius;
	}

	root.Circle = Circle;

	var supported_intersection_funcs = {};

	function RegisterIntersectionSupport(func, aType, bType) {
		aType = aType.name;
		bType = bType.name;
		// accepts a function and two operands and allows them to be 'Intersected' 
		supported_intersection_funcs[[aType, bType]] = func;
		if (aType != bType) {
			// in this case, a & b are swapped, so swap them back
			supported_intersection_funcs[[bType, aType]] = function (a, b) {
				return func(b, a);
			}
		}
	}

	function Intersection(point, distance) {
		if (!this instanceof Intersection)
			return new Intersection(point, distance)
		this.point = point;
		this.distance = distance;
	}

	// accepts two LibGeom objects 'a' & 'b'.
	// if intersection is supported, returns some sane 'closest point'
	// see specific intersection functions for details about what this really means
	// generally, if multiple intersections exist, it only returns the 'first'/'best' one
	// again, see specific intersection function for implementation details
	function Intersects(a, b) {
		if (typeof a === 'object' && typeof b === 'object') {
			var aType = a.constructor.name
			var bType = b.constructor.name;
			var intersectFn = supported_intersection_funcs[[aType, bType]];
			if (intersectFn) {
				return intersectFn(a, b);
			}
		}

		return console.error("Unsupported intersection between " + a + " and " + b);
	}

	root.Intersects = Intersects;

	RegisterIntersectionSupport(CircleLineIntersection, Circle, Line);
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
		var distance = rejection.length();
		if (distance <= circle.radius) {
			return new Intersection(closest, distance);
		} else {
			return null;
		}
	}

	RegisterIntersectionSupport(CirclePolyLineIntersection, Circle, PolyLine);
	function CirclePolyLineIntersection(circle, polyline) {
		var intersection = null;
		for (var i = polyline.lines.length - 1; i >= 0; i--) {
			var closest = CircleLineIntersection(circle, polyline.lines[i]);
			if (closest && (!intersection || closest.distance < intersection.distance))
				intersection = closest;
		};
		return intersection;
	}

	RegisterIntersectionSupport(CircleRectIntersects, Circle, Rect);
	function CircleRectIntersects(circle, rect) {
		// TODO this doesn't handle the case that circle is fully inside rect
		return CirclePolyLineIntersection(circle, rect.boundingBox);
	}

	RegisterIntersectionSupport(PointRectIntersects, Vector2, Rect);
	function PointRectIntersects(point, rect) {
		if (point.gte(rect.topLeft) && point.lte(rect.bottomRight)) {
			// rect intersects point, find closest point on perimeter rect
			var relPoint = point.sub(rect.topLeft);
			var points = [
				new Vector2(relPoint.x, rect.height),
				new Vector2(0, relPoint.y),
				new Vector2(rect.width, relPoint.y)
			];
			var closest = new Vector2(relPoint.x, 0);
			var dist = relPoint.sub(closest).length();
			for (var i = points.length - 1; i >= 0; i--) {
				var p = points[i];
				var d = relPoint.sub(p).length();
				if (d < dist) {
					closest = p;
					dist = d;
				}
			};
			return new Intersection(closest.add(rect.topLeft), dist);
		}
		return null;
	}

	RegisterIntersectionSupport(RectIntersects, Rect, Rect);
	function RectIntersects(rect1, rect2) {
		var best_intersection;
		var points = [ rect1.topLeft, rect1.topRight, rect1.bottomRight, rect1.bottomLeft ];
		for (var i = points.length - 1; i >= 0; i--) {
			var intersection = PointRectIntersects(points[i], rect2);
			if (intersection && (!best_intersection || best_intersection.distance > intersection.distance))
				best_intersection = intersection;
		};
		return best_intersection;
	}

	RegisterIntersectionSupport(LineIntersects, Line, Line);
	function LineIntersects(a, b) {
		var p = a.from;
		var r = a.to.sub(a.from);

		var q = b.from;
		var s = b.to.sub(b.from);

		var rCrossS = r.cross(s);
		// use this to determine cases
		var qToPCrossR = q.sub(p).cross(r);

		var d1 = FloatCMP(rCrossS, 0);
		var d2 = FloatCMP(qToPCrossR, 0);

		if (d1) {
			// r x s = 0 && (q-p) x r = 0
			// two lines are colinear
			if (d2) {
				var dotOperand = r.div(r.dot(r));
				// express endpoints of lineB in terms of lineA
				// t0 = (q - p) dot r / (r dot r)
				var t0 = q.sub(p).dot(dotOperand);
				// t1 = (q + s - p) dot r / (r dot r)
				var t1 = q.add(s).sub(p).dot(dotOperand);

				var A, B;
				if (s.dot(r) < 0) {
					// check if [t1, t0] intersects [0, 1]
					A = t1;
					B = t0;
				} else {
					// check if [t0, t1] intersects [0, 1]
					A = t0;
					B = t1;
				}

				var X = 0, Y = 1;
				// for two intervals [A, B) && [X, Y)
				// then the two intervals intersect iff X < B && A < Y
				if (X < B && A < Y) {
					// TODO do better than just returning an arbitrary point here
					return new Intersection(p.add(r.mul(t0)), 0);
				} else {
					return null;
				}
			} 
			// r x s = 0 && (q-p) x r != 0
			// two lines are parallel and non-intersecting
			else {
				return null;
			}
		} 
		// r x s != 0
		else {
			// we need to find a t & u (scalars) s.t. p + t * r = q + u * s
			// t = (q - p) x s / (r x s)
			var t = q.sub(p).cross(s) / rCrossS;
			var u = q.sub(p).cross(r) / rCrossS;
			// lines intersect at p + t * r = q + u * s
			if (t >= 0 && t <= 1 && u >= 0 && u <= 0) {
				return new Intersection(p.add(r.mul(t)), 0);
			}
			// lines are not parallel, but do not intersect
			else {
				return null;
			}
		}
	}

	RegisterIntersectionSupport(PolyLineIntersects, PolyLine, PolyLine);
	function PolyLineIntersects(a, b) {
		for (var i = a.lines.length - 1; i >= 0; i--) {
			for (var j = b.lines.length - 1; j >= 0; j--) {
				var intersection = LineIntersects(a.lines[i], b.lines[j]);
				if (intersection)
					return intersection;
			};
		};
	}

	function FloatCMP(a, b, maxDist) {
		if (!maxDist) maxDist = 0.001;
		return Math.abs(a - b) <= maxDist
	}

	// running in node.js
	if (typeof window === 'undefined') {
		module.exports = root;
	}
	// running in browser
	else {
		window.LibGeom = root;
	}
})();