# CircuitSim
A SPA for diagramming, verifying and simulating transitor-level and gate-level circuits.  Created by me (Jon Monroe) for usage in Montek Singh's Spring/Fall 2017 COMP411 class.  Anyone else is free to download and try it out for themselves.  There are no dependencies other than a webserver which can serve static files from a folder (Are there any that can't?) and all operations are completely client side.  A demo version can be found at solipsisdev.com/circuitsim but may not always be the most up-to-date.

# License & Permissions
## TLDR
Any one can use, modify, transform, etc. this work for any educational or personal reason.  Commericial usage is expressly forbidden without explicit permission from me (Jon Monroe) beforehand.  All I ask is that if you do use it, you provide proper attribution (and ideally link to this github) and share alike.

## Full Legalese
Copyright (c) 2017 Jon Monroe, licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License. To view a copy of this license, visit http://creativecommons.org/licenses/by-nc-sa/4.0/.

# Doc-y Goodness

## Architecture
CircuitSim is a SPA which leverages jQuery and Bootstrap (3.3.x) to handle some of the weirdness of HTML/JS.
Code is roughly organized in MVC architecture with the model being contained in circuit-data.js, 
view being a combination of index.html for DOM-level view and circuit-drawer.js for Canvas-level view,
and the controller being index.js.

## Grading Students
If your university uses Sakai, a grading script has been provided (grading_script.py) which will parse out an exported Sakai file and perform grading based on # of mis-matched rows.  See grading_doc.txt for details about usage
