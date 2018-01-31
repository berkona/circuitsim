#!/usr/bin/env python2

# import subprocess, sys, os

import sys, os, re, subprocess, shutil, csv

SERVER_RUNNER = "/home/jon/src/circuitsim/server-runner.js"

FEEDBACK_DIR = "Feedback Attachment(s)"
SUB_DIR = "Submission attachment(s)"

PROBLEMS=[ tuple(p.split(",")) for p in "HW4_1_a,3 HW4_1_b,3 HW4_1_c,4 HW4_1_d,5 HW4_1_e,5 HW4_1_f,5 HW4_1_g,5 HW4_2_a,6 HW4_2_b,8 HW4_2_c,6 HW4_3_a,5 HW4_3_b,5 HW4_4_a,10 HW4_4_b,10".split(" ") ]


# from collections import OrderedDict

def splitCSV(line, delimiter):
	return [ f.replace('"', "") for f in line.replace("\n", "").split(delimiter) ]


class CSVMunger(object):

	def __init__(self, sourceFileName, destFileName, skipRows=0, delimiter=",", quotechar='"'):
		self.sourceFile = open(sourceFileName, 'r')
		self.destFile = open(destFileName, 'w')
		self.delimiter = delimiter

		for i in range(skipRows):
			line = self.sourceFile.readline()
			self.destFile.write(line)
		header_line = self.sourceFile.readline()
		self.destFile.write(header_line)
		
		self.header = splitCSV(header_line, self.delimiter)
		self.sourceCSV = csv.DictReader(self.sourceFile, fieldnames=self.header, delimiter=delimiter, quotechar=quotechar)
		self.destCSV = csv.DictWriter(self.destFile, fieldnames=self.header, delimiter=delimiter, quotechar=quotechar, quoting=csv.QUOTE_ALL)

	def iter(self):
		for row in self.sourceCSV:
			yield row

	def write(self, row):
		assert len(row) == len(self.header)
		self.destCSV.writerow(row)

	def close(self):
		self.sourceFile.close()
		self.destFile.close()


def gradeResponse(studentID, problem, points, gradingDir, answerDir):
	"""
	Attempt to grade a specific student's response to a question
	params:
		-- studentID, string, a unique identifier for a student, generally an onyen
		-- problem, string, the problem currently being graded
		-- points, number, the total # of points for a correct answer
		-- gradingDir, path, a directory in which the students responses lie
		-- answerDir, path, a directory in which the correct answer resides, expected to be in format FileName(questionName)
	returns:
		-- tuple of:
			-- number, the total number of points awarded to student for problem in range [0, points]
			-- string, the comments for this question
	side effects:
		-- prints errors if any or that the problem matched the answer key 
		-- if an error occurred, the full error message is placed in gradingDir/student/FEEDBACK_DIR/problem.json
	"""

	studentDir = os.path.join(gradingDir, studentID)
	problemFile = os.path.join(studentDir, SUB_DIR, problem + ".json")

	if not os.path.exists(problemFile):
		print "!!! %s did not answer %s !!!" % (studentID, problem)
		return ( 0.0, "did not answer %s." % problem )

	# responseFName = questionName.replace(',', '').replace(' ', '-')
	# outputFile = os.path.join(studentDir, responseFName + '.json')
	# # write our students response to a file
	# with open(outputFile, 'w') as responseFile:
	# 	responseFile.write(response)

	answerFile = os.path.join(answerDir, problem + '.txt')

	# print "Grading %s" % problem
	grader = subprocess.Popen(('node', SERVER_RUNNER, problemFile), stdout=subprocess.PIPE)
	grader.wait()
	if grader.returncode != 0:
		print "!!! Could not run server-runner on %s !!!" % problem
		error = "".join(grader.stdout.readlines())
		print error
		errorFileName = os.path.join(studentDir, FEEDBACK_DIR, problem + '.json')
		with open(errorFileName, 'w') as errorFile:
			errorFile.write("Could not simulate circuit due to error:\n")
			errorFile.write(error)
		return (0.0, "Could not simulate circuit due to error.")

	try:
		subprocess.check_output(('diff', answerFile, '-'), stdin=grader.stdout, stderr=subprocess.STDOUT)
		print "%s matched answer key" % problem
		return (points, "all tests passed.")
	except subprocess.CalledProcessError as e:
		total_lines = 0.0
		with open(answerFile) as answer:
			total_lines = sum(1.0 for line in answer)
		# for header
		total_lines -= 1.0

		# a sanity check that diff didn't substitute any lines
		assert sum(1 for line in e.output if line.startswith('|')) == 0

		# is this equivalent to < line??
		lines_mismatched = sum(1.0 for line in e.output if line.startswith('>'))

		percent_wrong = lines_mismatched/total_lines
		deduction = points * percent_wrong
		points_awarded =  max(points - deduction, 0.0)

		errorFileName = os.path.join(studentDir, FEEDBACK_DIR, problem + '.json')
		error_msg = "%0.1f%% truth table rows wrong (-%0.1f):" % (percent_wrong * 100, deduction)
		with open(errorFileName, 'w') as errorFile:
			errorFile.write(error_msg + "\n")
			errorFile.write(e.output)

		print "!!! %s did not match answer key: %s.  Check '%s' for details !!!" % (problem, error_msg, errorFileName)

		return (points_awarded, error_msg)


def main():
	"""
	It's a main method... what do you want? A poem?
	"""

	if len(sys.argv) != 4:
		print "USAGE: python2 grader.py CSV_EXPORT_FILE GRADING_DIR ANSWER_DIR"
		return

	responses = []
	destCSV = sys.argv[1]
	gradingDir = sys.argv[2]
	answerDir = sys.argv[3]

	correct_students = []
	incorrect_students = []

	correct_by_parts = {}

	average_grade_by_parts = {}
	average_grade = 0.0

	num_autograded = len(PROBLEMS)
	num_students = 0.0
	total_answers = 0.0
	total_correct = 0.0
	total_completely_incorrect = 0.0
	total_partial_correct = 0.0
	total_no_submission = 0.0

	sourceCSV = os.path.join(gradingDir, "grades.csv")

	assert sourceCSV != destCSV

	csv = CSVMunger(sourceCSV, destCSV, skipRows=2)
	try:

		for row in csv.iter():
			assert row['Display ID'] == row['ID']
			
			onyen = row['ID']
			student = "%s, %s(%s)" % (row['Last Name'], row['First Name'], onyen)

			# studentID = row[id_field]
			num_students += 1
			print "Grading %s" % student

			# delete all files in feedback dir
			feedbackDir = os.path.join(gradingDir, student, FEEDBACK_DIR)
			if os.path.exists(feedbackDir):
				shutil.rmtree(feedbackDir)
			os.mkdir(feedbackDir)

			correct_answers = 0
			total_grade = 0.0

			# open comments file
			commentsFName = os.path.join(gradingDir, student, 'comments.txt')
			with open(commentsFName, 'w') as commentsFile:		
				for problem, points in PROBLEMS:
					points = float(points)
					points_awarded, comments = gradeResponse(student, problem, points, gradingDir, answerDir)
					total_grade += points_awarded
					correct = points_awarded == points
					
					if problem not in average_grade_by_parts:
						average_grade_by_parts[problem] = 0.0

					average_grade_by_parts[problem] += points_awarded

					if problem not in correct_by_parts:
						correct_by_parts[problem] = []

					if correct:
						correct_by_parts[problem].append(student)
						correct_answers += 1

					# append comments for problem to comments file
					commentsFile.write("%s: %s\n" % (problem, comments))

			# add grade to csv file
			row['grade'] = "%0.2f" % total_grade
			csv.write(row)

			average_grade += total_grade

			if correct_answers == num_autograded:
				total_correct += 1.0
				correct_students.append(student)
			elif correct_answers == 0:
				total_completely_incorrect += 1.0
				incorrect_students.append(student)
			else:
				total_partial_correct += 1.0
				incorrect_students.append(student)

	finally:
		csv.close()

	print "Autograde complete, statistics follow:"
	print "Percent totally correct: %d%%" % ((total_correct / num_students) * 100.0)
	print "Percent completely incorrect: %d%%" % ((total_completely_incorrect / num_students) * 100.0)
	print "Percent partially correct: %d%%" % ((total_partial_correct / num_students) * 100.0)
	print "Percent no submission: %d%%" % ((total_no_submission / num_students) * 100.0)

	print "Percent 100% correct by question:"
	for questionName, students in sorted(correct_by_parts.items()):
		print "%s: %0.1f%%" % (questionName, (len(students) / num_students) * 100.0)

	print "Average total points: %0.1f" % (average_grade / num_students)
	print "Average points by question:"
	for questionName, grade in sorted(average_grade_by_parts.items()):
		print "%s: %0.1f" % (questionName, (grade / num_students))


main()