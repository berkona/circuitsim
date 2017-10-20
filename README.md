# circuitsim
A small webpage to draw and simulate circuits.

# Architecture
CircuitSim is a SPA which leverages jQuery and Bootstrap (3.3.x) to handle some of the weirdness of HTML/JS.
Code is roughly organized in MVC architecture with the model being contained in circuit-data.js, 
view being a combination of index.html for DOM-level view and circuit-drawer.js for Canvas-level view,
and the controller being index.js.

# License & Permissions
Copyright (c) 2017 Jon Monroe, licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License. To view a copy of this license, visit http://creativecommons.org/licenses/by-nc-sa/4.0/.
