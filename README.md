# unrar.js

This is a pure-javascript implementation of unrar.
The code has been ported from Jeff Schiller's bitjs, Thanks :).

how to use:

	var unrar = require('unrar.js');
	var fs = require('fs');

	var file = fs.readFileSync(__dirname + '/' + 'test.rar');
	unrar(file).forEach(function(file){
	    console.log(file.filename, file.fileData.length);
	})

## Changelog

* 0.1.0 — Initial Release
