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

var ByteBuffer = require("./ByteBuffer"),
    RarUtils = require("./RarUtils"),
    RarEventMgr = require("./RarEventMgr"),
    RarVolumeHeader = require("./RarVolumeHeader"),
    Unpack = require("./RarUnpack");

// bstream is a bit stream
function RarLocalFile(bstream) {
    this.header = new RarVolumeHeader(bstream);
    this.filename = this.header.filename;

    if (this.header.headType != RarUtils.VOLUME_TYPES.FILE_HEAD && this.header.headType != RarUtils.VOLUME_TYPES.ENDARC_HEAD) {
        this.isValid = false;
        RarEventMgr.error("Error! RAR Volume did not include a FILE_HEAD header ");
    } else {
        // read in the compressed data
        this.fileData = null;
        if (this.header.packSize > 0) {
            this.fileData = bstream.readBytes(this.header.packSize);
            this.isValid = true;
        }
    }
};

RarLocalFile.prototype.unrar = function() {
    if (!this.header.flags.LHD_SPLIT_BEFORE) {
        // unstore file -- 0x30 -> 48 Decimal -> means that there's no compression in archive, just storing
        if (this.header.method == 0x30) {
            RarEventMgr.emitInfo("Unstore " + this.filename); // **** NEEDS NOTIFICATION REPORTER
            this.isValid = true;

            RarUtils.PROGRESS.currentBytesUnarchivedInFile += this.fileData.length;
            RarUtils.PROGRESS.currentBytesUnarchived += this.fileData.length;

            // Create a new buffer and copy it over.
            var len = this.header.packSize,
                newBuffer = new ByteBuffer(len);

            newBuffer.insertBytes(this.fileData);
            this.fileData = newBuffer.data;
        } else {
            this.isValid = true;
            this.fileData = Unpack(this);
        }
    }
}

module.exports = RarLocalFile;
