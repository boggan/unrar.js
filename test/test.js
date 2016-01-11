var fs = require("fs"),
    path = require("path"),
    Unrar = require("../unrar");

//==============================================================================
function unrarToMem(i_sFile) {
    var l_nST,
        l_aUnrarredFiles,
        l_nET;

    console.log("Synchronous decompression of archive (test.rar) to memory...");
    l_nST = new Date().getTime();
    l_aUnrarredFiles = Unrar.unrarSync(i_sFile, {
        onProgress: function(data) {
            var l_nPercent = Math.round((data.currentBytesUnarchived / data.totalUncompressedBytesInArchive) * 100);
            console.log("SYNC Progress: ", l_nPercent, "%");
        }
    });
    l_nET = new Date().getTime();
    console.log("Decompressing took: ", (l_nET - l_nST), "ms");
    console.log("Number of decompressed Files: ", l_aUnrarredFiles.length);

    return l_aUnrarredFiles;
}

//==============================================================================
function unrarAsyncToDisk(i_sFile, i_oCallback) {
    var l_nST,
        l_nET;

    console.log("Asynchronous decompression of archive (test.rar) to memory...");
    l_nST = new Date().getTime();
    Unrar.unrar(i_sFile, g_sOutputdir, {
        onProgress: function(data) {
            var l_nPercent = Math.round((data.currentBytesUnarchived / data.totalUncompressedBytesInArchive) * 100);
            console.log("ASYNC Progress: ", l_nPercent, "%");
        }
    }, function(err, i_aFiles) {
        l_nET = new Date().getTime();
        if (err) {
            console.log("Error occured while unraring, ", err);
        } else {
            console.log("Decompressing took: ", (l_nET - l_nST), "ms");
            console.log("Number of decompressed Files: ", i_aFiles.length);
        }
        i_oCallback(i_aFiles || []);
    });
}

//==============================================================================
function cleanUp(i_sFilename, i_oCallback) {
    console.log("Removing file ", i_sFilename);
    fs.unlink(i_sFilename, (err) => {
        if (err) {
            console.log("Error removing file ", i_sFilename, err);
        }
        i_oCallback();
    });
}

//==============================================================================
function cleanUpSync(i_sFilename) {
    console.log("Removing file ", i_sFilename);
    fs.unlinkSync(path.normalize(i_sFilename));
}

//==============================================================================
function testUnrarSync() {
    console.log("Testing synchronous unrar\n================================\n");
    var l_aFiles = unrarToMem(g_sArchive);
    l_aFiles.forEach(function(i_oFile) {
        console.log("File in memory: ", i_oFile.filename, i_oFile.fileData.length);
    });
    console.log("Sync Tests completed.\n");
}

//==============================================================================
function testUnrarASync() {
    console.log("Testing asynchronous unrar\n================================\n");
    unrarAsyncToDisk(g_sArchive, function(i_aFiles) {
        i_aFiles.forEach(function(i_sFile) {
            console.log("File -> ", i_sFile);
            cleanUpSync(i_sFile);
        });
        console.log("Async Tests completed.\n");
    });
}

var g_sArchive = __dirname + '/' + "test.rar";
    g_sOutputdir = __dirname + '/';

// sync test, unrar to mem
testUnrarSync();

// async test unrar to outputdir
testUnrarASync();
