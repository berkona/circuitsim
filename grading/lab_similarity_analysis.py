
import pandas as pd

import sys

from graphviz import Graph
import matplotlib
# matplotlib.style.use('ggplot')
import matplotlib.pyplot as plt

CUTOFF = 0

def main():
	if len(sys.argv) != 3:
		print "USAGE: python similarity_analysis.py EDIT_DISTANCE_FILE OUTPUT_FILE"
		return

	all_distances = pd.read_csv(sys.argv[1])
	matches = all_distances[all_distances['Edit_distance'] <= CUTOFF]
	fNameList = all_distances['File'].unique()
	edit_distance_graph = Graph(engine='dot')
	nodes = set()
	for fileName in fNameList:
		in_fName= all_distances[all_distances.File == fileName]
		matches = in_fName[in_fName['Edit_distance'] <= CUTOFF]
		for row in matches.itertuples(index=False):
			node_A = '%s' % (row.student_A)
			node_B = '%s' % (row.student_B)
			if node_A not in nodes:
				edit_distance_graph.node(node_A)
				nodes.add(node_A)
			if node_B not in nodes:
				edit_distance_graph.node(node_B)
				nodes.add(node_B)
			edit_distance_graph.edge(node_A, node_B, label='%s' % (fileName))

	edit_distance_graph.format = 'png'
	edit_distance_graph.render(sys.argv[2])

main()