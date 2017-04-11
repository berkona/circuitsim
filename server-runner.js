
"use strict";

var fs = require('fs');

var LibCircuit = require("./libcircuit");
var CircuitData = require("./circuit-data");

if (process.argv.length != 3) {
	console.log("USAGE: node server-runner.js CIRCUIT_DATA");
} else {
	main();
}

function convertToColumns(header, rows) {
	// convert from row-based matrix to column based matrix;
	var col_matrix = [];
	for (var i = 0; i < header.length; i++) {
		var col = [ header[i] ];
		for (var j = 0; j < rows.length; j++) {
			col.push(rows[j][i]);
		};
		col_matrix.push(col);
	};
	return col_matrix;
}

function convertToRows(col_matrix) {
	var row_matrix = [];
	var width = col_matrix.length;
	var height = col_matrix[0].length;
	for (var i = 0; i < height; i++) {
		var row = [];
		for (var j = 0; j < width; j++) {
			row.push(col_matrix[j][i]);
		};
		row_matrix.push(row);
	};
	return row_matrix;
}

function main() {
	var fName = process.argv[2];
	try {
		var result = runSimulation(fName);
	} catch (err) {
		console.log("runSimulation failed with message:");
		console.log(err);
		return;
	}

	// inputs are guaranteed to come first by LibCircuit's behavior, no need to slice
	var input_cols = convertToColumns(result.inputs, result.rows);
	// have to slice the rows here though
	var outputs_cols = convertToColumns(result.outputs, result.rows.map(function (x) {
		return x.slice(result.inputs.length, x.length);
	}));

	function sortCols(a, b) {
		if (a[0] < b[0]) {
			return -1;
		} else if (a[0] > b[0]) {
			return 1;
		} else {
			return 0;
		}
	}
	// sort based on lexographic ordering of header
	// indepedently sort input and output so that inputs are always before outputs
	input_cols.sort(sortCols);
	outputs_cols.sort(sortCols);

	var input_rows = convertToRows(input_cols);
	var output_rows = convertToRows(outputs_cols);

	// if this is not true bad things will happen on output
	if (input_rows.length !== output_rows.length){
		return console.log("Something horrible happened, input_rows !== output_rows");
	}

	// spiffy one liner printing for a matrix
	console.log(
		input_rows.map(function (row, idx) {
			return row.concat(output_rows[idx]);
		}).map(function (row) {
			return row.join(' ');
		}).join('\n')
	);
}

function runSimulation(fname) {
	var serialized = fs.readFileSync(fname);
	var data = JSON.parse(serialized);
	var circuitData = new CircuitData();
	circuitData.import(data);

	var verifiedResult = LibCircuit.runAllChecks(circuitData.graph);
	if (verifiedResult) {
		throw new Error("Circuit was not able to be verified: " + verifiedResult[0] + " returned error " +verifiedResult[1]);
	}

	var result;
	if (circuitData.simType == CircuitData.SIM_TYPE_TRANSISTOR) {
		result = LibCircuit.simulate(circuitData.graph);
	} else if (circuitData.simType == CircuitData.SIM_TYPE_GATE) {
		result == LibCircuit.simulateGates(circuitData.graph);
	} else {
		throw new Error("Circuit could not be simulated: invalid simType");
	}

	function GetName(x) {
		return circuitData.graph[x].name;
	}

	result.inputs = result.inputs.map(GetName);
	result.outputs = result.outputs.map(GetName);

	return result;
}