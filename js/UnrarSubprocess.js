var fs = require("fs"),
    path = require("path"),
    mkdirp = require("mkdirp"),
    unrar = require("../lib/unrar"),
    RarEventMgr = require("../lib/RarEventMgr");

function _registerEvents() {
    RarEventMgr.on(RarEventMgr.TYPES.PROGRESS, function(i_oProgressData) {
        process.send({
            event: RarEventMgr.TYPES.PROGRESS,
            data: i_oProgressData
        });
    });

    RarEventMgr.on(RarEventMgr.TYPES.ERROR, function(i_sStr) {
        process.send({
            event: RarEventMgr.TYPES.ERROR,
            data: i_sStr
        });
    });
}

//==============================================================================
function storeFilesToDisk(i_aFiles, i_sOutput, i_oCallback) {
    var l_aPromises = i_aFiles.map(function(i_oFile) {
        return storeFileToDisk(i_oFile, i_sOutput);
    });
    Promise.all(l_aPromises).then(i_oCallback);
}

//==============================================================================
function storeFileToDisk(i_oFile, i_sOutput) {
    var l_sDirname = path.dirname(i_oFile.filename),
        l_sFilename;

    console.log("File name: ", i_oFile.filename, " size: ", i_oFile.header.unpackedSize);
    console.log("Saving content of file ");

    l_sDirname = path.join(i_sOutput, path.dirname(i_oFile.filename));
    l_sFilename = path.join(l_sDirname, path.basename(i_oFile.filename));
    return new Promise(function(i_oResolve) {
        mkdirp(l_sDirname, function (err) {
            if (err) console.error(err);
            _writeFile(l_sFilename, i_oFile, i_oResolve);
        });
    });
}

//==============================================================================
function _writeFile(i_sFilename, i_oFile, i_oCallback) {
    var l_sFilename = i_sFilename,
        l_oBuffer = new Buffer(i_oFile.fileData); // filedata is Uint8Array
    fs.writeFile(l_sFilename, l_oBuffer, function(err) {
        if (err) {
            console.log("Error writting file ", err);
            l_sFilename = null;
        }
        i_oCallback(l_sFilename);
    });
}

function main() {
    var l_sFileToUnrar = process.argv[2],
        l_sOutputDir = process.argv[3],
        l_aFiles,
        l_nST,
        l_nET;

    fs.readFile(l_sFileToUnrar, function(err, i_oBuffer) {
        if (!err) {
            _registerEvents();
            l_nST = new Date().getTime();
            l_aFiles = unrar(i_oBuffer);
            storeFilesToDisk(l_aFiles, l_sOutputDir, function(i_aFiles) {
                l_nET = new Date().getTime();
                console.log("Time to unpack in sub process: ", (l_nET - l_nST), "ms");
                process.send({
                    event: RarEventMgr.TYPES.FINISH,
                    data: i_aFiles
                });
            });
        } else {
            process.send({
                event: "abort",
                data: "Error occured while trying to read file (" + l_sFileToUnrar + ")"
            });
        }
    });
}

// execute child process
main();
