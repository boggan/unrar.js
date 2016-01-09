/**
 * unrar.js
 *
 * Copyright(c) 2011 Google Inc.
 * Copyright(c) 2011 antimatter15
 * Copyright(c) 2016 Thomas Lanteigne -- code porting
 *
 * Reference Documentation:
 *
 * http://kthoom.googlecode.com/hg/docs/unrar.html
 */

var BitStream = require("./lib/BitStream"),
    RarVolumeHeader = require("./lib/RarVolumeHeader"),
    RarLocalFile = require("./lib/RarLocalFile"),
    RarUtils = require("./lib/RarUtils");

// Helper functions.
// var console.info = function(str) {
//     postMessage(new bitjs.archive.UnarchiveInfoEvent(str));
// };
// var err = function(str) {
//     postMessage(new bitjs.archive.UnarchiveErrorEvent(str));
// };
// var postProgress = function() {
//     postMessage(new bitjs.archive.UnarchiveProgressEvent(
//         RarUtils.PROGRESS.currentFilename,
//         RarUtils.PROGRESS.currentFileNumber,
//         RarUtils.PROGRESS.currentBytesUnarchivedInFile,
//         RarUtils.PROGRESS.currentBytesUnarchived,
//         RarUtils.PROGRESS.totalUncompressedBytesInArchive,
//         RarUtils.PROGRESS.totalFilesInArchive));
// };



RarUtils.reset(); // make sure we flush all tracking variables

function unrar(arrayBuffer) {
    RarUtils.PROGRESS.currentFilename = "";
    RarUtils.PROGRESS.currentFileNumber = 0;
    RarUtils.PROGRESS.currentBytesUnarchivedInFile = 0;
    RarUtils.PROGRESS.currentBytesUnarchived = 0;
    RarUtils.PROGRESS.totalUncompressedBytesInArchive = 0;
    RarUtils.PROGRESS.totalFilesInArchive = 0;

    // postMessage(new bitjs.archive.UnarchiveStartEvent());

    var bstream = new BitStream(arrayBuffer, false /* rtl */ );

    var header = new RarVolumeHeader(bstream);
    if (header.crc == 0x6152 &&
        header.headType == 0x72 &&
        header.flags.value == 0x1A21 &&
        header.headSize == 7) {
        console.info("Found RAR signature");

        var mhead = new RarVolumeHeader(bstream);
        if (mhead.headType != RarUtils.VOLUME_TYPES.MAIN_HEAD) {
            console.info("Error! RAR did not include a MAIN_HEAD header");
        } else {
            var localFiles = [],
                localFile = null;
            do {
                try {
                    localFile = new RarLocalFile(bstream);
                    console.info("RAR localFile isValid=" + localFile.isValid + ", volume packSize=" + localFile.header.packSize);
                    if (localFile && localFile.isValid && localFile.header.packSize > 0) {
                        RarUtils.PROGRESS.totalUncompressedBytesInArchive += localFile.header.unpackedSize;
                        localFiles.push(localFile);
                    } else if (localFile.header.packSize == 0 && localFile.header.unpackedSize == 0) {
                        localFile.isValid = true;
                    }
                } catch (err) {
                    break;
                }
                //console.info("bstream" + bstream.bytePtr+"/"+bstream.bytes.length);
            } while (localFile.isValid);

            RarUtils.PROGRESS.totalFilesInArchive = localFiles.length;

            // now we have all console.information but things are unpacked
            // TODO: unpack
            localFiles = localFiles.sort(function(a, b) {
                var aname = a.filename;
                var bname = b.filename;
                return aname > bname ? 1 : -1;

                // extract the number at the end of both filenames
                /*
			  var aindex = aname.length, bindex = bname.length;

			  // Find the last number character from the back of the filename.
			  while (aname[aindex-1] < '0' || aname[aindex-1] > '9') --aindex;
			  while (bname[bindex-1] < '0' || bname[bindex-1] > '9') --bindex;

			  // Find the first number character from the back of the filename
			  while (aname[aindex-1] >= '0' && aname[aindex-1] <= '9') --aindex;
			  while (bname[bindex-1] >= '0' && bname[bindex-1] <= '9') --bindex;

			  // parse them into numbers and return comparison
			  var anum = parseInt(aname.substr(aindex), 10),
				  bnum = parseInt(bname.substr(bindex), 10);
			  return bnum - anum;*/
            });

            console.info(localFiles.map(function(a) {
                return a.filename
            }).join(', '));

            for (var i = 0; i < localFiles.length; ++i) {
                var localfile = localFiles[i];

                console.log("Local file: ", localfile.filename);
                // update progress
                RarUtils.PROGRESS.currentFilename = localfile.header.filename;
                RarUtils.PROGRESS.currentBytesUnarchivedInFile = 0;

                // actually do the unzipping
                localfile.unrar();

                // if (localfile.isValid) {
                //     postMessage(new bitjs.archive.UnarchiveExtractEvent(localfile));
                //     postProgress();
                // }
            }

            // postProgress();
        }
    } else {
        console.error("Invalid RAR file");
    }

    return localFiles;
    // postMessage(new bitjs.archive.UnarchiveFinishEvent());
};

module.exports = unrar;

// // event.data.file has the ArrayBuffer.
// onmessage = function(event) {
//     var ab = event.data.file;
//     unrar(ab, true);
// };
