
import sys, glob

import time

from multiprocessing import Pool, cpu_count

from functools import partial

AUTOGRADE_PARTS = [ 
	(1, 1),
	(1, 2),
	(1, 3),
	(1, 4),
	(1, 5),
	(1, 6),
	(1, 7),
	(2, 1),
	(2, 2),
	(2, 3),
	(5, 1),
	(5, 2),
	(6, 3),
	(6, 6), 
]

RESPONSE_DIR = ''

import os

import copy

from LevDist import LevDist

import signal

# kludge for making ctrl-C work
def init_worker():
    signal.signal(signal.SIGINT, signal.SIG_IGN)
    pass

def NearestNeighbor(strA, tup):
	student, strB = tup
	return (LevDist(strA, strB), student)

import re 

def main():
	if len(sys.argv) < 3:
		print "USAGE: python similarity_search.py RESULT_FILE STUDENT_IDS"
		return

	main_start_time = time.time()

	resultFile = open(sys.argv[1], 'w')
	studentIds = sys.argv[2:]

	pool = Pool(cpu_count(), init_worker)

	resultFile.write('File,student_A,student_B,Edit_distance' + os.linesep)

	labRegex = re.compile(r'^lab\d+$|^labX-\w+$')
	fileRegex = re.compile(r'^ex\d\.(c|asm)$')
	fileNames = set()
	for student in studentIds:
		labNames = [ fName for fName in os.listdir(student) if labRegex.match(fName) ]
		for lab in labNames:
			labPath = [ os.path.join(lab, fName) for fName in os.listdir(os.path.join(student, lab)) if fileRegex.match(fName) ]
			fileNames = fileNames | set(labPath)

	for fName in fileNames:
		lab_start_time = time.time()
		print 'Checking %s' % fName

		fileStrs = []
		for student in studentIds:
			p = os.path.join(student, fName)
			if not os.path.exists(p): continue
			with open(p) as f:
				fileStrs.append((student, '\n'.join(f)))

		# optimize by doing longest strings first
		fileStrs = sorted(fileStrs, cmp=lambda x, y: len(y[1]) - len(x[1]))

		total_students = len(fileStrs)
		students_done = 0
		all_distances = {}
		for student, strA in fileStrs:

			start_time = time.time()
			
			nearestFunc = partial(NearestNeighbor, strA)
			stringsToDo = filter(lambda x:  x[0] != student and (student, x[0]) not in all_distances and (x[0], student) not in all_distances, fileStrs)

			print 'Calculating distances from %s to %d other students' % (student, len(stringsToDo))

			try:
				distances = pool.map(nearestFunc, stringsToDo)
			except KeyboardInterrupt:
				print "Caught KeyboardInterrupt, terminating"
				pool.terminate()
				pool.join()
				resultFile.close()
				return

			for dist, studentB in distances:
				# only use lexigraphically first tuple
				all_distances[tuple(sorted((student, studentB)))] = dist

			delta_time = (time.time() - start_time) * 1000.0

			students_done += 1
			print 'Finished calculating distances from %s to all other students, took %d (ms), %d %% done' % (student, delta_time, (float(students_done) / float(total_students)) * 100.0)

		for students, distance in all_distances.iteritems():
			studentA, studentB = students
			resultFile.write(','.join([ str(fName), studentA, studentB, str(distance) ]) + os.linesep)

		part_delta_time = (time.time() - lab_start_time) / 60.0
		print 'Finished checking file %s, took %.2f (mins)' % (fName, part_delta_time)

	pool.close()
	pool.join()
	resultFile.close()

	print 'Took %.2f (mins) to run script' % ((time.time() - main_start_time) / 60.0)
main()