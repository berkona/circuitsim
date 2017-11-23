const assert = require('assert');

const fs = require('fs');
const path =require('path');

const LibCircuit = require('../libcircuit');
const CircuitData = require('../circuit-data');

describe("LibCircuit", function () {

	describe("#simulate", function() {

		function compareResults(expected, actual) {
			assert.equal(expected.inputs.length, actual.inputs.length);
			for (var i = expected.inputs.length - 1; i >= 0; i--) {
				assert.equal(expected.inputs[i], actual.inputs[i]);
			};
			assert.equal(expected.outputs.length, actual.outputs.length);
			for (var i = expected.outputs.length - 1; i >= 0; i--) {
				assert.equal(expected.outputs[i], actual.outputs[i]);
			};
			assert.equal(expected.rows.length, actual.rows.length);
			for (var i = expected.rows.length - 1; i >= 0; i--) {
				var expectedRow = expected.rows[i];
				var actualRow = actual.rows[i];
				assert.equal(expectedRow.length, actualRow.length);
				for (var j = expectedRow.length - 1; j >= 0; j--) {
					assert.equal(expectedRow[j], actualRow[j]);
				};
			};
		}

		function testFile(name) {
			it("Should work on test file '" + name + "'", function() {
				var fileName = path.join("test/gates", name);
				var circuitData = new CircuitData();
				circuitData.import(JSON.parse(fs.readFileSync(fileName)));
				var result = LibCircuit.simulate(circuitData.graph);
				//console.log(name, result);
				compareResults(JSON.parse(fs.readFileSync(path.join("test/expected", name))), result);
			});
		}

		var gateFiles = fs.readdirSync("test/gates");
		for (var i = gateFiles.length - 1; i >= 0; i--) {
			testFile(gateFiles[i]);
		};
	});

});