#! /usr/bin/env python2

import sys, os, re, subprocess, shutil, csv

ID_FIELD_NAME = 'User Name'
SUBMISSION_FIELD_NAME = "Order of Submission (1=first)"
# format is a tuple of part and question
AUTOGRADE_PARTS= [ 
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


def parseHeader(header):
	"""
	Parse a csv header from Saki and return a 3-tuple of:
		id_field -- int -- field index of who submitted this row, generally an onyen
		submission_field -- int -- field index of "Order of Submission (1=first)"
		answer_fields -- 2 tuple of:
			0 -- int, field index of this answer
			1 -- string, name of Part X, Question Y processes into a filename like string
	"""

	id_field = -1
	submission_field = -1
	answer_fields = []
	for i in xrange(len(header)):
		if header[i] == ID_FIELD_NAME:
			id_field = i
			continue
		elif header[i] == SUBMISSION_FIELD_NAME:
			submission_field = i
			continue

		for part, question in AUTOGRADE_PARTS:
			match = re.match("^(Part "+str(part)+", Question "+str(question)+"), Response$", header[i]) 
			if match:
				answer_fields.append((i, match.group(1)))

	if id_field == -1:
		raise ValueError("!!!Could not find ID field!!!")
	elif submission_field == -1:
		raise ValueError("!!!COuld not find submission field!!!")
	elif len(answer_fields) == 0:
		raise ValueError("!!! Could not find autograde parts !!! Are you sure you set AUTOGRADE_PARTS correctly?")

	return id_field, submission_field, answer_fields


def gradeResponse(studentID, response, questionName, gradingDir, answerDir):
	"""
	Attempt to grade a specific student's response to a question
	params:
		-- studentID, string, a unique identifier for a student, generally an onyen
		-- response, string, the text of the students response as exported by CircuitSim
		-- questionName, string, human readable string of the question being graded
		-- gradingDir, path, a directory to write the response to in order to run server-runner.js on, folder will be named after student onyen
		-- answerDir, path, a directory in which the correct answer resides, expected to be in format FileName(questionName)
	returns:
		-- 0 if answer was incorrect for any reason.  Possible reasons: did not respond or simulation result did not match expected answer
		-- 1 if answer was totally correct, i.e, matched the answer via diff
	side effects:
		-- always prints Grading <onyen> for ease of grading
		-- prints if answer matches expected output: "Output and answer key are identical"
		-- prints if does not match: "!!! mismatch betweeen output and answer !!!", check errorFile for specific mismatch
	"""
	if (response == 'No Answer'):
		print "!!! %s did not answer %s !!!" % (studentID, questionName)
		return 0

	studentDir = os.path.join(gradingDir, studentID)
	if not os.path.isdir(studentDir):
		os.makedirs(studentDir)

	responseFName = questionName.replace(',', '').replace(' ', '-')
	outputFile = os.path.join(studentDir, responseFName + '.json')
	# write our students response to a file
	with open(outputFile, 'w') as responseFile:
		responseFile.write(response)

	answerFile = os.path.join(answerDir, responseFName + '.txt')
	print "Grading %s" % questionName
	grader = subprocess.Popen(('node', 'server-runner.js', outputFile), stdout=subprocess.PIPE)
	grader.wait()
	try:
		subprocess.check_output(('diff', answerFile, '-'), stdin=grader.stdout, stderr=subprocess.STDOUT)
		print "Output and answer key are identical"
		return 1
	except subprocess.CalledProcessError as e:
		errorFile = os.path.join(studentDir, 'ERROR.' + responseFName + '.txt')
		print "!!! Mismatch betweeen output and answer !!!"
		print "Check %s for details" % errorFile
		with open(errorFile, 'w') as errorFile:
			errorFile.write(e.output)
		return 0


def main():
	"""
	It's a main method... what do you want? A poem?
	"""

	if len(sys.argv) != 4:
		print "USAGE: python csv_converter.py CSV_EXPORT_FILE GRADING_DIR ANSWER_DIR"
		return

	responses = [];
	csvFName = sys.argv[1];
	gradingDir = sys.argv[2];
	answerDir = sys.argv[3];

	# delete all files in grading temp  dir
	if os.path.exists(gradingDir):
		shutil.rmtree(gradingDir)
	os.mkdir(gradingDir)


	with open(csvFName) as csvFile:
		reader = csv.reader(csvFile, delimiter=',', quotechar="'")
		# automagically find all the questions we need to grade
		id_field, submission_field, answer_fields = parseHeader(reader.next())
		num_autograded = len(answer_fields)
		num_students = 0.0
		total_answers = 0.0
		total_correct = 0.0
		total_completely_incorrect = 0.0
		total_partial_correct = 0.0
		total_no_submission = 0.0
		for row in reader:
			studentID = row[id_field]
			num_students += 1
			print "Grading %s" % studentID
			if (row[submission_field] == 'No submission'):
				print "!!! No submission from %s !!!" % studentID
				total_no_submission += 1.0
				# total_completely_incorrect += 1.0
				continue
			correct_answers = 0
			for idx, questionName in answer_fields:
				correct_answers += gradeResponse(studentID, row[idx], questionName, gradingDir, answerDir)
			if correct_answers == num_autograded:
				total_correct += 1.0
			elif correct_answers == 0:
				total_completely_incorrect += 1.0
			else:
				total_partial_correct += 1.0
		print "Autograde complete, statistics follow:"
		print "Percent totally correct: %d%%" % ((total_correct / num_students) * 100)
		print "Percent completely incorrect: %d%%" % ((total_completely_incorrect / num_students) * 100)
		print "Percent partially correct: %d%%" % ((total_partial_correct / num_students) * 100)
		print "Percent no submission: %d%%" % ((total_no_submission / num_students) * 100)

main()