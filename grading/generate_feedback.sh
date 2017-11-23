# This script accepts the following args
# $1 response directory
# $2 feedback directory
# $3 answer key directory

# modify this as needed
PROBLEMS="HW4_1_a,3 HW4_1_b,3 HW4_1_c,4 HW4_1_d,5 HW4_1_e,5 HW4_1_f,5 HW4_1_g,5 HW4_2_a,6 HW4_2_b,8 HW4_2_c,6 HW4_3_a,5 HW4_3_b,5 HW4_4_a,10 HW4_4_b,10"
RESULT_SUFFIX=".txt"
ERROR_SUFFIX=".json"

echo "Comparing responses in $1 to answer key in $2"
for problem in $PROBLEMS; do
	# get points and problem name
	points="$(cut -d',' -f2 <<< $problem)"
	problem="$(cut -d',' -f1 <<< $problem)"

	echo "Checking $problem"
	response_file="$1/$problem$RESULT_SUFFIX"
	error_file="$3/$problem$ERROR_SUFFIX"
	answer_key_file="$2/$problem$RESULT_SUFFIX"

	if [ ! -f "$response_file" ]; then
		echo "No submission for $problem (-$points)"
		echo "No submission for $problem (-$points)" > "$error_file"
		continue
	fi

	diff -q "$response_file" "$answer_key_file" > /dev/null
	if [ $? -ne 0 ]; then
		echo "Mismatch between response and answer key, calculating deduction and putting feedback in $error_file"
		# grading logic
		n_mismatch="$(diff '$response_file' '$answer_key_file' | grep '<' | wc -l)"
		n_expected="$(cat '$answer_key_file' | wc -l)"
		diff "$response_file" "$answer_key_file" > "$error_file"
	fi
done