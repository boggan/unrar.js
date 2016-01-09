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

var RarUtils = require("./RarUtils");

// NEED TO INCLUDE SOME KIND OF UTILS for -> RarUtils.twoByteValueToHexString, RarUtils.byteValueToHexString,  NOTIFICATION REPORTER (info)

// bstream is a bit stream
function RarVolumeHeader(bstream) {

    var headPos = bstream.bytePtr;
    // byte 1,2
    console.info("Rar Volume Header @" + bstream.bytePtr); // **** NEEDS NOTIFICATION REPORTER

    this.crc = bstream.readBits(16);
    console.info("  crc=" + this.crc); // **** NEEDS NOTIFICATION REPORTER

    // byte 3
    this.headType = bstream.readBits(8);
    console.info("  headType=" + this.headType); // **** NEEDS NOTIFICATION REPORTER

    // Get flags
    // bytes 4,5
    this.flags = {};
    this.flags.value = bstream.peekBits(16);

    console.info("  flags=" + RarUtils.twoByteValueToHexString(this.flags.value)); // **** NEEDS NOTIFICATION REPORTER
    switch (this.headType) {
        case RarUtils.VOLUME_TYPES.MAIN_HEAD:
            this.flags.MHD_VOLUME = !!bstream.readBits(1);
            this.flags.MHD_COMMENT = !!bstream.readBits(1);
            this.flags.MHD_LOCK = !!bstream.readBits(1);
            this.flags.MHD_SOLID = !!bstream.readBits(1);
            this.flags.MHD_PACK_COMMENT = !!bstream.readBits(1);
            this.flags.MHD_NEWNUMBERING = this.flags.MHD_PACK_COMMENT;
            this.flags.MHD_AV = !!bstream.readBits(1);
            this.flags.MHD_PROTECT = !!bstream.readBits(1);
            this.flags.MHD_PASSWORD = !!bstream.readBits(1);
            this.flags.MHD_FIRSTVOLUME = !!bstream.readBits(1);
            this.flags.MHD_ENCRYPTVER = !!bstream.readBits(1);
            bstream.readBits(6); // unused
            break;
        case RarUtils.VOLUME_TYPES.FILE_HEAD:
            this.flags.LHD_SPLIT_BEFORE = !!bstream.readBits(1); // 0x0001
            this.flags.LHD_SPLIT_AFTER = !!bstream.readBits(1); // 0x0002
            this.flags.LHD_PASSWORD = !!bstream.readBits(1); // 0x0004
            this.flags.LHD_COMMENT = !!bstream.readBits(1); // 0x0008
            this.flags.LHD_SOLID = !!bstream.readBits(1); // 0x0010
            bstream.readBits(3); // unused
            this.flags.LHD_LARGE = !!bstream.readBits(1); // 0x0100
            this.flags.LHD_UNICODE = !!bstream.readBits(1); // 0x0200
            this.flags.LHD_SALT = !!bstream.readBits(1); // 0x0400
            this.flags.LHD_VERSION = !!bstream.readBits(1); // 0x0800
            this.flags.LHD_EXTTIME = !!bstream.readBits(1); // 0x1000
            this.flags.LHD_EXTFLAGS = !!bstream.readBits(1); // 0x2000
            bstream.readBits(2); // unused
            console.info("  LHD_SPLIT_BEFORE = " + this.flags.LHD_SPLIT_BEFORE);
            break;
        default:
            bstream.readBits(16);
    }

    // byte 6,7
    this.headSize = bstream.readBits(16);
    console.info("  headSize=" + this.headSize); // **** NEEDS NOTIFICATION REPORTER
    switch (this.headType) {
        case RarUtils.VOLUME_TYPES.MAIN_HEAD:
            this.highPosAv = bstream.readBits(16);
            this.posAv = bstream.readBits(32);
            if (this.flags.MHD_ENCRYPTVER) {
                this.encryptVer = bstream.readBits(8);
            }
            console.info("Found RarUtils.VOLUME_TYPES.MAIN_HEAD with highPosAv=" + this.highPosAv + ", posAv=" + this.posAv);
            break;
        case RarUtils.VOLUME_TYPES.FILE_HEAD:
            this.packSize = bstream.readBits(32);
            this.unpackedSize = bstream.readBits(32);
            this.hostOS = bstream.readBits(8);
            this.fileCRC = bstream.readBits(32);
            this.fileTime = bstream.readBits(32);
            this.unpVer = bstream.readBits(8);
            this.method = bstream.readBits(8);
            this.nameSize = bstream.readBits(16);
            this.fileAttr = bstream.readBits(32);

            if (this.flags.LHD_LARGE) {
                console.info("Warning: Reading in LHD_LARGE 64-bit size values"); // **** NEEDS NOTIFICATION REPORTER
                this.HighPackSize = bstream.readBits(32);
                this.HighUnpSize = bstream.readBits(32);
            } else {
                this.HighPackSize = 0;
                this.HighUnpSize = 0;
                if (this.unpackedSize == 0xffffffff) {
                    this.HighUnpSize = 0x7fffffff
                    this.unpackedSize = 0xffffffff;
                }
            }
            this.fullPackSize = 0;
            this.fullUnpackSize = 0;
            this.fullPackSize |= this.HighPackSize;
            this.fullPackSize <<= 32;
            this.fullPackSize |= this.packSize;

            // read in filename
            this.filename = bstream.readBytes(this.nameSize);
            var _i,
                fileNameStr = '';

            for (_i = 0; _i < this.filename.length; _i++) {
                fileNameStr += String.fromCharCode(this.filename[_i]);
            }

            this.filename = fileNameStr;

            if (this.flags.LHD_SALT) {
                console.info("Warning: Reading in 64-bit salt value"); // **** NEEDS NOTIFICATION REPORTER
                this.salt = bstream.readBits(64); // 8 bytes
            }

            if (this.flags.LHD_EXTTIME) {
                // 16-bit flags
                var extTimeFlags = bstream.readBits(16);

                // this is adapted straight out of arcread.cpp, Archive::ReadHeader()
                for (var I = 0; I < 4; ++I) {
                    var rmode = extTimeFlags >> ((3 - I) * 4);
                    if ((rmode & 8) == 0)
                        continue;
                    if (I != 0)
                        bstream.readBits(16);
                    var count = (rmode & 3);
                    for (var J = 0; J < count; ++J)
                        bstream.readBits(8);
                }
            }

            if (this.flags.LHD_COMMENT) {
                console.info("Found a LHD_COMMENT");  // **** NEEDS NOTIFICATION REPORTER
            }


            while (headPos + this.headSize > bstream.bytePtr) {
                bstream.readBits(1);
            }

            console.info("Found RarUtils.VOLUME_TYPES.FILE_HEAD with packSize=" + this.packSize + ", unpackedSize= " + this.unpackedSize + ", hostOS=" + this.hostOS + ", unpVer=" + this.unpVer + ", method=" + this.method + ", filename=" + this.filename);  // **** NEEDS NOTIFICATION REPORTER

            break;
        default:
            console.info("Found a header of type 0x" + RarUtils.byteValueToHexString(this.headType));  // **** NEEDS NOTIFICATION REPORTER, NEEDS RarUtils.byteValueToHexString
            // skip the rest of the header bytes (for now)
            bstream.readBytes(this.headSize - 7);
            break;
    }
};

module.exports = RarVolumeHeader;
