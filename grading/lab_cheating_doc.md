
1) Log into classroom and archive all labs into a single file (for easy scp-ing)
	- tar cjfvv ~/LABS_$TERM.tar.bz ~{montek}/comp411
2) download archive file into convient destination folder and unzip
	- scp $LOGIN@classroom.cs.unc.edu:~/LABS_$TERM.tar.bz .
3) unzip archive file using desired method (I used file-roller)
4) remove samples & bin folder
5) Run lab_sim_search.py in unzipped lab directory via:
	- python2 $PATH_TO_CIRCUITSIM_REPO/grading/lab_sim_search.py $RESULT_FILE *
