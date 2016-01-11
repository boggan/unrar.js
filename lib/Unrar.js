/**
 * Unrar.js
 *
 * Copyright(c) 2011 Google Inc.
 * Copyright(c) 2011 antimatter15
 * Copyright(c) 2016 Thomas Lanteigne -- code porting
 *
 * Reference Documentation:
 *
 * http://kthoom.googlecode.com/hg/docs/unrar.html
 */

var BitStream = require("./BitStream"),
    RarVolumeHeader = require("./RarVolumeHeader"),
    RarLocalFile = require("./RarLocalFile"),
    RarUtils = require("./RarUtils"),
    RarEventMgr = require("./RarEventMgr");

// Helper functions.
// var info = function(str) {
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
    RarEventMgr.emitStart();

    var bstream = new BitStream(arrayBuffer, false /* rtl */ );

    var header = new RarVolumeHeader(bstream);
    if (header.crc == 0x6152 &&
        header.headType == 0x72 &&
        header.flags.value == 0x1A21 &&
        header.headSize == 7) {
        RarEventMgr.emitInfo("Found RAR signature");

        var mhead = new RarVolumeHeader(bstream);
        if (mhead.headType != RarUtils.VOLUME_TYPES.MAIN_HEAD) {
            RarEventMgr.emitError("Error! RAR did not include a MAIN_HEAD header");
        } else {
            var localFiles = [],
                localFile = null;
            do {
                try {
                    localFile = new RarLocalFile(bstream);
                    RarEventMgr.emitInfo("RAR localFile isValid=" + localFile.isValid + ", volume packSize=" + localFile.header.packSize);
                    if (localFile && localFile.isValid && localFile.header.packSize > 0) {
                        RarUtils.PROGRESS.totalUncompressedBytesInArchive += localFile.header.unpackedSize;
                        localFiles.push(localFile);
                    } else if (localFile.header.packSize == 0 && localFile.header.unpackedSize == 0) {
                        localFile.isValid = true;
                    }
                } catch (err) {
                    break;
                }
                RarEventMgr.emitInfo("bstream" + bstream.bytePtr + "/" + bstream.bytes.length);
            } while (localFile.isValid);

            RarUtils.PROGRESS.totalFilesInArchive = localFiles.length;

            // now we have all console.information but things are unpacked
            // TODO: unpack
            localFiles = localFiles.sort(function(a, b) {
                var aname = a.filename;
                var bname = b.filename;
                return aname > bname ? 1 : -1;
            });

            RarEventMgr.emitInfo(localFiles.map(function(a) {
                return a.filename
            }).join(', '));

            for (var i = 0; i < localFiles.length; ++i) {
                var localfile = localFiles[i];

                RarEventMgr.emitInfo("Local file: ", localfile.filename);
                // update progress
                RarUtils.PROGRESS.currentFilename = localfile.header.filename;
                RarUtils.PROGRESS.currentBytesUnarchivedInFile = 0;

                // actually do the unzipping
                localfile.unrar();

                if (localfile.isValid) {
                    // notify extract event with file
                    RarEventMgr.emitExtract(localfile);
                    RarEventMgr.emitProgress(RarUtils.PROGRESS);
                }
            }

            RarEventMgr.emitProgress(RarUtils.PROGRESS);
        }
    } else {
        RarEventMgr.emitError("Invalid RAR file");
    }

    RarEventMgr.emitFinish(localFiles);

    return localFiles;
};

module.exports = unrar;
