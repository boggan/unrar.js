# unrar.js

This is a pure-javascript implementation of unrar.
The code has been ported from Jeff Schiller's bitjs, Thanks :).

# how to use:
synchronous usage:

	var unrar = require('unrar.js'),
	    fs = require('fs'),
        unpackedFiles;

    unpackedFiles = unrar.unrarSync("ARCHIVE_PATH", {
        onProgress: function(data) {
            var l_nPercent = Math.round((data.currentBytesUnarchived / data.totalUncompressedBytesInArchive) * 100);
            console.log("Progress: ", l_nPercent, "%");
        }
    });

	unpackedFiles.forEach(function(file){
	    console.log(file.filename, file.fileData.length);
	});

asynchronous usage:

	var unrar = require('unrar.js'),
	    fs = require('fs');

	unrar.unrar("ARCHIVE_PATH", "OUTPUT_DIRECTORY", {
	    onProgress: function(data) {
        	var l_nPercent = Math.round((data.currentBytesUnarchived / data.totalUncompressedBytesInArchive) * 100);
        	console.log("Progress: ", l_nPercent, "%");
    	}
	}, function(err, unpackedFiles) {
        unpackedFiles.forEach(function(file){
    	    console.log(file.filename, file.fileData.length);
    	});
    });

the asynchronous method needs to write to disk because it runs in a child process, and transferring the binaries over a string channel is pretty damn slow. Maybe one day, I'll try using local sockets ;)

## Changelog

* 0.2.1 — fixed bad path for forked Unrar sub process (in previous check-in)
* 0.2.0 — added sync and async (forked process) execution of unrar
* 0.1.0 — Initial Release
