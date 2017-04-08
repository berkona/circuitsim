
"use strict";

var fs = require('fs');

var LibCircuit = require("./libcircuit");
var CircuitData = require("./circuit-data");

if (process.argv.length != 3) {
	console.log("USAGE: node server-runner.js CIRCUIT_DATA");
} else {
	main();
}

function main() {
	var fName = process.argv[2];
	var result = runSimulation(fName);

	result.inputs.sort();
	result.outputs.sort();

	console.log(result.inputs.join(' ') + ' ' + result.outputs.join(' '));
	for (var i = 0; i < result.rows.length; i++) {
		console.log(result.rows[i].join(' '));
	};
}

function runSimulation(fname) {
	var serialized = fs.readFileSync(fname);
	var data = JSON.parse(serialized);
	var circuitData = new CircuitData();
	circuitData.import(data);

	var verifiedResult = LibCircuit.runAllChecks(circuitData.graph);
	if (verifiedResult) {
		console.log("Circuit was not able to be verified:");
		console.log(verifiedResult[0] + " returned error: " +verifiedResult[1]);
		return;
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