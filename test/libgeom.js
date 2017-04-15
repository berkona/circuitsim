
var assert = require('assert');
var LibGeom = require('../libgeom');

describe('LibGeom', function () {
	describe('Vector2', function () {
		it('Should be an object class', function () {
			assert(typeof LibGeom.Vector2 === 'function');
			assert(typeof (new LibGeom.Vector2(0, 0)) === 'object');
			assert(typeof (LibGeom.Vector2(0, 0)) === 'object');
			assert((new LibGeom.Vector2(0, 0)) instanceof LibGeom.Vector2);
			assert((LibGeom.Vector2(0, 0)) instanceof LibGeom.Vector2);
		});

		it('Should accept 2 Numbers', function () {
			var v = new LibGeom.Vector2(0, 0);
			assert(v.x == 0 && v.y == 0);
		});

		var two_vector_params = [
			[0, 0, 0, 0],
			[0, 1, 1, 0],
			[0, -1, -1, 0],
			[1, 0, 0, 1],
			[-1, 0, 0, -1],
			[1, 1, 0, 0],
			[0, 0, 1, 1],
			[-1, -1, 0, 0],
			[0, 0, -1, -1],
			[0, 0, -1, -1],
			[1, 1, 1, 1],
			[-1, -1, -1, -1],
		];

		it('Should properly do vector addition', function () {
			for (var i = two_vector_params.length - 1; i >= 0; i--) {
				var params = two_vector_params[i];
				var u = new LibGeom.Vector2(params[0], params[1]);
				var v = new LibGeom.Vector2(params[2], params[3]);
				var w = u.add(v);
				// should not change u and v
				assert(u.x == params[0] && u.y == params[1]);
				assert(v.x == params[2] && v.y == params[3]);
				assert(w.x == params[0] + params[2] && w.y == params[1] + params[3]);
				var w = v.add(u);
				// should not change u and v
				assert(u.x == params[0] && u.y == params[1]);
				assert(v.x == params[2] && v.y == params[3]);
				assert(w.x == params[0] + params[2] && w.y == params[1] + params[3]);
			};
		});

		it('Should properly do vector subtraction', function () {
			for (var i = two_vector_params.length - 1; i >= 0; i--) {
				var params = two_vector_params[i];
				var u = new LibGeom.Vector2(params[0], params[1]);
				var v = new LibGeom.Vector2(params[2], params[3]);
				var w = u.sub(v);
				// should not change u and v
				assert(u.x == params[0] && u.y == params[1]);
				assert(v.x == params[2] && v.y == params[3]);
				assert(w.x == params[0] - params[2] && w.y == params[1] - params[3]);
				var w = v.sub(u);
				// should not change u and v
				assert(u.x == params[0] && u.y == params[1]);
				assert(v.x == params[2] && v.y == params[3]);
				assert(w.x == params[2] - params[0] && w.y == params[3] - params[1]);
			};
		});

		var vector_scalar_params = [
			[0, 0, -1],
			[0, 0, 0],
			[0, 0, 1],
			[1, 0, -1],
			[1, 0, 0],
			[1, 0, 1],
			[0, 1, -1],
			[0, 1, 0],
			[0, 1, 1],
			[1, 1, -1],
			[1, 1, 0],
			[1, 1, 1],
		];

		it("Should properly do vector multiplication", function () {
			for (var i = vector_scalar_params.length - 1; i >= 0; i--) {
				var params = vector_scalar_params[i];
				var u = new LibGeom.Vector2(params[0], params[1]);
				var v = params[2];
				var w = u.mult(v);
				// should not change u
				assert(u.x == params[0] && u.y == params[1]);
				assert(w.x == params[0] * params[2] && w.y == params[1] * params[2]);
			};
		});

		it("Should properly do vector division", function () {
			for (var i = vector_scalar_params.length - 1; i >= 0; i--) {
				var params = vector_scalar_params[i];
				var u = new LibGeom.Vector2(params[0], params[1]);
				var v = params[2];
				var w = u.div(v);
				// should not change u
				assert(u.x == params[0] && u.y == params[1]);
				if (v == 0) {
					if (u.x == 0 && u.y == 0) {
						assert(Number.isNaN(w.x) && Number.isNaN(w.y));
					} else if (u.x == 0 && u.y != 0) {
						assert(Number.isNaN(w.x) && (w.y == Number.POSITIVE_INFINITY || w.y == Number.NEGATIVE_INFINITY));
					} else if (u.x != 0 && u.y == 0) {
						assert(Number.isNaN(w.y) && (w.x == Number.POSITIVE_INFINITY || w.x == Number.NEGATIVE_INFINITY));
					} else { // ux != 0 && u.y != 0
						assert(
							(w.y == Number.POSITIVE_INFINITY || w.y == Number.NEGATIVE_INFINITY) 
						 && (w.x == Number.POSITIVE_INFINITY || w.x == Number.NEGATIVE_INFINITY)
						);
					}
				} else {
					assert(w.x == params[0] / params[2] && w.y == params[1] / params[2]);
				}
			};
		});
		

		it("Should properly do vector dot product", function () {
			for (var i = two_vector_params.length - 1; i >= 0; i--) {
				var params = two_vector_params[i];
				var u = new LibGeom.Vector2(params[0], params[1]);
				var v = new LibGeom.Vector2(params[2], params[3]);
				var w = u.dot(v);
				// should not change u and v
				assert(u.x == params[0] && u.y == params[1]);
				assert(v.x == params[2] && v.y == params[3]);
				var dp = params[0] * params[2] + params[1] * params[3];
				assert(w == dp);
				w = v.dot(u);
				// should not change u and v
				assert(u.x == params[0] && u.y == params[1]);
				assert(v.x == params[2] && v.y == params[3]);
				assert(w == dp);
			};
		});

		it("Should properly do vector cross product", function () {
			for (var i = two_vector_params.length - 1; i >= 0; i--) {
				var params = two_vector_params[i];
				var u = new LibGeom.Vector2(params[0], params[1]);
				var v = new LibGeom.Vector2(params[2], params[3]);
				var w = u.cross(v);
				// should not change u and v
				assert(u.x == params[0] && u.y == params[1]);
				assert(v.x == params[2] && v.y == params[3]);
				var product = params[0] * params[3] - params[1] * params[2];
				assert(w == product);
				w = v.cross(u);
				product = params[2] * params[1] - params[3] * params[0];
				// should not change u and v
				assert(u.x == params[0] && u.y == params[1]);
				assert(v.x == params[2] && v.y == params[3]);
				assert(w == product);
			};
		});

		var vector_params = [
			[-1, -1],
			[0, -1],
			[-1, 0],
			[0, 0],
			[0, 1],
			[1, 0],
			[1, 1],
		];

		it("Should properly calculate vector length", function () {
			for (var i = vector_params.length - 1; i >= 0; i--) {
				var params = vector_params[i];
				var u = new LibGeom.Vector2(params[0], params[1]);
				var d = Math.sqrt(params[0] * params[0] + params[1] * params[1]);
				var l = u.length();
				// should not change u and v
				assert(u.x == params[0] && u.y == params[1]);
				assert(d == l);
			};
		});

		it("Should properly calculate vector less than", function () {
			for (var i = two_vector_params.length - 1; i >= 0; i--) {
				var params = two_vector_params[i];
				var u = new LibGeom.Vector2(params[0], params[1]);
				var v = new LibGeom.Vector2(params[2], params[3]);
				var cmp = params[0] < params[2] && params[1] < params[3];
				assert(u.lt(v) == cmp);
				cmp = params[2] < params[0] && params[3] < params[1];
				assert(v.lt(u) == cmp);
			};
		});

		it("Should properly calculate vector greater than", function () {
			for (var i = two_vector_params.length - 1; i >= 0; i--) {
				var params = two_vector_params[i];
				var u = new LibGeom.Vector2(params[0], params[1]);
				var v = new LibGeom.Vector2(params[2], params[3]);
				var cmp = params[0] > params[2] && params[1] > params[3];
				assert(u.gt(v) == cmp);
				cmp = params[2] > params[0] && params[3] > params[1];
				assert(v.gt(u) == cmp);
			};
		});

		it("Should properly calculate vector less than or equal to", function () {
			for (var i = two_vector_params.length - 1; i >= 0; i--) {
				var params = two_vector_params[i];
				var u = new LibGeom.Vector2(params[0], params[1]);
				var v = new LibGeom.Vector2(params[2], params[3]);
				var cmp = params[0] <= params[2] && params[1] <= params[3];
				assert(u.lte(v) == cmp);
				cmp = params[2] <= params[0] && params[3] <= params[1];
				assert(v.lte(u) == cmp);
			};
		});

		it("Should properly calculate vector greater than or equal to", function () {
			for (var i = two_vector_params.length - 1; i >= 0; i--) {
				var params = two_vector_params[i];
				var u = new LibGeom.Vector2(params[0], params[1]);
				var v = new LibGeom.Vector2(params[2], params[3]);
				var cmp = params[0] >= params[2] && params[1] >= params[3];
				assert(u.gte(v) == cmp);
				cmp = params[2] >= params[0] && params[3] >= params[1];
				assert(v.gte(u) == cmp);
			};
		});

	});

	describe('Rect', function () {
		it('Should be an object class', function () {
			assert(typeof LibGeom.Rect === 'function');
			assert(typeof (new LibGeom.Rect(0, 0, 0, 0)) === 'object');
			assert(typeof (LibGeom.Rect(0, 0, 0, 0)) === 'object');
			assert((new LibGeom.Rect(0, 0, 0, 0)) instanceof LibGeom.Rect);
			assert((LibGeom.Rect(0, 0, 0, 0)) instanceof LibGeom.Rect);
		});
	});

	describe('Circle', function () {
		it('Should be an object class', function () {
			assert(typeof LibGeom.Circle === 'function');
			assert(typeof (new LibGeom.Circle(new LibGeom.Vector2(0, 0), 0)) === 'object');
			assert(typeof (LibGeom.Circle(new LibGeom.Vector2(0, 0), 0)) === 'object');
			assert((new LibGeom.Circle(new LibGeom.Vector2(0, 0), 0)) instanceof LibGeom.Circle);
			assert((LibGeom.Circle(new LibGeom.Vector2(0, 0), 0)) instanceof LibGeom.Circle);
		});
	});

	describe('Line', function () {
		it('Should be an object class', function () {
			assert(typeof LibGeom.Line === 'function');
			assert(typeof (new LibGeom.Line(new LibGeom.Vector2(0, 0), new LibGeom.Vector2(0, 0))) === 'object');
			assert(typeof (LibGeom.Line(new LibGeom.Vector2(0, 0), new LibGeom.Vector2(0, 0))) === 'object');
			assert((new LibGeom.Line(new LibGeom.Vector2(0, 0), new LibGeom.Vector2(0, 0))) instanceof LibGeom.Line);
			assert((LibGeom.Line(new LibGeom.Vector2(0, 0), new LibGeom.Vector2(0, 0))) instanceof LibGeom.Line);
		});
	});

	describe('PolyLine', function () {
		it('Should be an object class', function () {
			assert(typeof LibGeom.PolyLine === 'function');
			assert(typeof (new LibGeom.PolyLine()) === 'object');
			assert(typeof (LibGeom.PolyLine()) === 'object');
			assert((new LibGeom.PolyLine()) instanceof LibGeom.PolyLine);
			assert((LibGeom.PolyLine()) instanceof LibGeom.PolyLine);
		});
	});

	describe("Intersects", function () {
		it("Should return null when non-intersecting", function () {
			var a = new LibGeom.Line(new LibGeom.Vector2(0, -1), new LibGeom.Vector2(0, 1));
			var b = new LibGeom.Line(new LibGeom.Vector2(-1, 2), new LibGeom.Vector2(1, 2));
			var intersection = LibGeom.Intersects(a, b);
			assert(intersection === null);
		});

		it("Should return a proper Intersection object on intersection", function () {
			var a = new LibGeom.Line(new LibGeom.Vector2(0, -1), new LibGeom.Vector2(0, 1));
			var b = new LibGeom.Line(new LibGeom.Vector2(-1, 0), new LibGeom.Vector2(1, 0));
			var intersection = LibGeom.Intersects(a, b);
			assert((typeof intersection) === 'object');
			assert(typeof intersection.distance === 'number');
			assert(intersection.point instanceof LibGeom.Vector2);
		});

		it("Should properly find intersection of a line with another line", function () {
			// case non-parallel and intersecting
			var a = new LibGeom.Line(new LibGeom.Vector2(0, -1), new LibGeom.Vector2(0, 1));
			var b = new LibGeom.Line(new LibGeom.Vector2(-1, 0), new LibGeom.Vector2(1, 0));
			var intersection = LibGeom.Intersects(a, b);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 0 && intersection.point.y === 0);

			// case non-parallel and not intersecting
			var a = new LibGeom.Line(new LibGeom.Vector2(0, -1), new LibGeom.Vector2(0, 1));
			var b = new LibGeom.Line(new LibGeom.Vector2(-1, 2), new LibGeom.Vector2(1, 2));
			var intersection = LibGeom.Intersects(a, b);
			assert(intersection === null);

			// case parallel and not colinear
			var a = new LibGeom.Line(new LibGeom.Vector2(0, -1), new LibGeom.Vector2(0, 1));
			var b = new LibGeom.Line(new LibGeom.Vector2(1, -1), new LibGeom.Vector2(1, 1));
			var intersection = LibGeom.Intersects(a, b);
			assert(intersection === null);

			// case parallel and colinear
			var a = new LibGeom.Line(new LibGeom.Vector2(0, -1), new LibGeom.Vector2(0, 1));
			var b = new LibGeom.Line(new LibGeom.Vector2(0, 0), new LibGeom.Vector2(0, 1));
			var intersection = LibGeom.Intersects(a, b);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 0 && intersection.point.y === 0);

			// case parallel and colinear, but non-intersecting
			var a = new LibGeom.Line(new LibGeom.Vector2(0, -1), new LibGeom.Vector2(0, 1));
			var b = new LibGeom.Line(new LibGeom.Vector2(0, 2), new LibGeom.Vector2(0, 3));
			var intersection = LibGeom.Intersects(a, b);
			assert(intersection === null);
		});

		it("Should properly find intersection between Line and Circle", function () {
			var circle, line, intersection;

			// case circle is on line
			circle = new LibGeom.Circle(new LibGeom.Vector2(0, 0), 5);
			line = new LibGeom.Line(new LibGeom.Vector2(-1, 0), new LibGeom.Vector2(1, 0));
			intersection = LibGeom.Intersects(circle, line);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 0 && intersection.point.y === 0);

			intersection = LibGeom.Intersects(line, circle);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 0 && intersection.point.y === 0);

			// case circle is offset from line by <= radius
			circle = new LibGeom.Circle(new LibGeom.Vector2(0, 5), 5);
			intersection = LibGeom.Intersects(circle, line);
			assert(intersection);
			assert(intersection.distance === 5);
			assert(intersection.point.x === 0 && intersection.point.y === 0);

			intersection = LibGeom.Intersects(line, circle);
			assert(intersection);
			assert(intersection.distance === 5);
			assert(intersection.point.x === 0 && intersection.point.y === 0);

			// case circle does not intersect line
			circle = new LibGeom.Circle(new LibGeom.Vector2(0, 6), 5);
			intersection = LibGeom.Intersects(circle, line);
			assert(intersection === null);

			intersection = LibGeom.Intersects(line, circle);
			assert(intersection === null);
		});

		it("Should properly find intersection between Circle and PolyLine", function () {
			var circle, line, intersection;

			// case circle is on line
			circle = new LibGeom.Circle(new LibGeom.Vector2(0, 0), 5);
			line = new LibGeom.PolyLine([ new LibGeom.Vector2(-1, 0), new LibGeom.Vector2(1, 0) ]);
			intersection = LibGeom.Intersects(circle, line);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 0 && intersection.point.y === 0);

			intersection = LibGeom.Intersects(line, circle);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 0 && intersection.point.y === 0);

			// case circle is offset from line by <= radius
			circle = new LibGeom.Circle(new LibGeom.Vector2(0, 5), 5);
			intersection = LibGeom.Intersects(circle, line);
			assert(intersection);
			assert(intersection.distance === 5);
			assert(intersection.point.x === 0 && intersection.point.y === 0);

			intersection = LibGeom.Intersects(line, circle);
			assert(intersection);
			assert(intersection.distance === 5);
			assert(intersection.point.x === 0 && intersection.point.y === 0);

			// case circle does not intersect line
			circle = new LibGeom.Circle(new LibGeom.Vector2(0, 6), 5);
			intersection = LibGeom.Intersects(circle, line);
			assert(intersection === null);

			intersection = LibGeom.Intersects(line, circle);
			assert(intersection === null);
		});

		it("Should properly find intersection between Circle and Rect", function () {
			var rect = new LibGeom.Rect(0, 0, 2, 2), circle, intersection;
			// case 1, circle intersects TL of rect
			circle = new LibGeom.Circle(new LibGeom.Vector2(0, 0), 1);
			intersection = LibGeom.Intersects(circle, rect);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 0 && intersection.point.y === 0);

			intersection = LibGeom.Intersects(rect, circle);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 0 && intersection.point.y === 0);

			// case 2, circle intersects mid-point of top of rect
			circle = new LibGeom.Circle(new LibGeom.Vector2(1, 0), 1);
			intersection = LibGeom.Intersects(circle, rect);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 1 && intersection.point.y === 0);

			intersection = LibGeom.Intersects(rect, circle);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 1 && intersection.point.y === 0);

			// case 3, circle intersects TR of rect
			circle = new LibGeom.Circle(new LibGeom.Vector2(2, 0), 1);
			intersection = LibGeom.Intersects(circle, rect);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 2 && intersection.point.y === 0);

			intersection = LibGeom.Intersects(rect, circle);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 2 && intersection.point.y === 0);

			// case 4 circle intersects mid-point of right side of rect
			circle = new LibGeom.Circle(new LibGeom.Vector2(2, 1), 1);
			intersection = LibGeom.Intersects(circle, rect);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 2 && intersection.point.y === 1);

			intersection = LibGeom.Intersects(rect, circle);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 2 && intersection.point.y === 1);	

			// case 5 cicle intersection RB of rect
			circle = new LibGeom.Circle(new LibGeom.Vector2(2, 2), 1);
			intersection = LibGeom.Intersects(circle, rect);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 2 && intersection.point.y === 2);

			intersection = LibGeom.Intersects(rect, circle);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 2 && intersection.point.y === 2);	

			// case 6 circle intersects mid-point of bottom side of rect
			circle = new LibGeom.Circle(new LibGeom.Vector2(1, 2), 1);
			intersection = LibGeom.Intersects(circle, rect);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 1 && intersection.point.y === 2);

			intersection = LibGeom.Intersects(rect, circle);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 1 && intersection.point.y === 2);

			// case 7 circle intersects LB of rect
			circle = new LibGeom.Circle(new LibGeom.Vector2(0, 2), 1);
			intersection = LibGeom.Intersects(circle, rect);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 0 && intersection.point.y === 2);

			intersection = LibGeom.Intersects(rect, circle);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 0 && intersection.point.y === 2);

			//case 8 circle intersects mid-point of left side of rect
			circle = new LibGeom.Circle(new LibGeom.Vector2(0, 1), 1);
			intersection = LibGeom.Intersects(circle, rect);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 0 && intersection.point.y === 1);

			intersection = LibGeom.Intersects(rect, circle);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 0 && intersection.point.y === 1);

			// TODO case 9, circle is fully contained by rect
		});

		it("Should properly find intersection between point and rect", function () {
			var rect, point, intersection;

			rect = new LibGeom.Rect(0, 0, 2, 2);

			// case 1, point does not intersect rect
			point = new LibGeom.Vector2(-1, 1);
			intersection = LibGeom.Intersects(rect, point);
			assert(intersection === null);

			intersection = LibGeom.Intersects(point, rect);
			assert(intersection === null);

			// case 2, point intersects left mid-point of rect
			point = new LibGeom.Vector2(0, 1)
			intersection = LibGeom.Intersects(rect, point);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 0 && intersection.point.y === 1);

			intersection = LibGeom.Intersects(point, rect);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 0 && intersection.point.y === 1);

			// case 3, point intersects top mid-point of rect
			point = new LibGeom.Vector2(1, 0)
			intersection = LibGeom.Intersects(rect, point);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 1 && intersection.point.y === 0);

			intersection = LibGeom.Intersects(point, rect);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 1 && intersection.point.y === 0);

			// case 4, point intersects right mid-point of rect
			point = new LibGeom.Vector2(2, 1)
			intersection = LibGeom.Intersects(rect, point);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 2 && intersection.point.y === 1);

			intersection = LibGeom.Intersects(point, rect);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 2 && intersection.point.y === 1);

			//case 5, point intersects bottom mid-point of rect
			point = new LibGeom.Vector2(1, 2)
			intersection = LibGeom.Intersects(rect, point);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 1 && intersection.point.y === 2);

			intersection = LibGeom.Intersects(point, rect);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 1 && intersection.point.y === 2);
		});

		it("Should properly intersect rect with itself", function () {
			var a, b, intersection;
			a = new LibGeom.Rect(0, 0, 5, 5);

			// case 1, b intersects a by TL corner
			b = new LibGeom.Rect(5, 4, 5, 5);
			intersection = LibGeom.Intersects(a, b);
			assert(intersection);

			//TODO figure out cases for this
		});

		it("Should intersect PolyLine with itself", function () {
			// case non-parallel and intersecting
			var a = new LibGeom.PolyLine([ new LibGeom.Vector2(0, -1), new LibGeom.Vector2(0, 1) ]);
			var b = new LibGeom.PolyLine([ new LibGeom.Vector2(-1, 0), new LibGeom.Vector2(1, 0) ]);
			var intersection = LibGeom.Intersects(a, b);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 0 && intersection.point.y === 0);

			// case non-parallel and not intersecting
			var a = new LibGeom.PolyLine([ new LibGeom.Vector2(0, -1), new LibGeom.Vector2(0, 1) ]);
			var b = new LibGeom.PolyLine([ new LibGeom.Vector2(-1, 2), new LibGeom.Vector2(1, 2) ]);
			var intersection = LibGeom.Intersects(a, b);
			assert(intersection === null);

			// case parallel and not colinear
			var a = new LibGeom.PolyLine([ new LibGeom.Vector2(0, -1), new LibGeom.Vector2(0, 1) ]);
			var b = new LibGeom.PolyLine([ new LibGeom.Vector2(1, -1), new LibGeom.Vector2(1, 1) ]);
			var intersection = LibGeom.Intersects(a, b);
			assert(intersection === null);

			// case parallel and colinear
			var a = new LibGeom.PolyLine([ new LibGeom.Vector2(0, -1), new LibGeom.Vector2(0, 1) ]);
			var b = new LibGeom.PolyLine([ new LibGeom.Vector2(0, 0), new LibGeom.Vector2(0, 1) ]);
			var intersection = LibGeom.Intersects(a, b);
			assert(intersection);
			assert(intersection.distance === 0);
			assert(intersection.point.x === 0 && intersection.point.y === 1);
		});
	});
});