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

/*****************************************************************
 * Libs
 *****************************************************************/
var BitStream = require("./BitStream"),
    ByteBuffer = require("./ByteBuffer"),
    RarUtils = require( "./RarUtils"),
    RarEventMgr = require( "./RarEventMgr"),
    Unpack15 = require("./RarUnpack15"),
    Unpack20 = require("./RarUnpack20"),
    Unpack29 = require("./RarUnpack29");

/*****************************************************************
 * vars
 *****************************************************************/

// v must be a valid RarVolume
function unpack(rarVolume) {

    // TODO: implement what happens when unpVer is < 15
    var Ver = rarVolume.header.unpVer <= 15 ? 15 : rarVolume.header.unpVer,
        Solid = rarVolume.header.LHD_SOLID,
        bstream = new BitStream(rarVolume.fileData.buffer, true /* rtl */ , rarVolume.fileData.byteOffset, rarVolume.fileData.byteLength);

    RarUtils.BUFFERS.unpack = new ByteBuffer(rarVolume.header.unpackedSize);

    RarEventMgr.emitInfo("Unpacking " + rarVolume.filename + " RAR v" + Ver);

    switch (Ver) {
        case 15: // rar 1.5 compression
            Unpack15(bstream, Solid);
            break;
        case 20: // rar 2.x compression
        case 26: // files larger than 2GB
            Unpack20(bstream, Solid);
            break;
        case 29: // rar 3.x compression
        case 36: // alternative hash
            Unpack29(bstream, Solid);
            break;
    } // switch(method)

    RarUtils.BUFFERS.oldBuffers.push(RarUtils.BUFFERS.unpack);

    //TODO: clear these old buffers when there's over 4MB of history
    return RarUtils.BUFFERS.unpack.data;
}

module.exports = unpack;
