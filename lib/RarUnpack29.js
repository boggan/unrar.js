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
var RarUtils = require("./RarUtils"),
    RarEventMgr = require("./RarEventMgr");

/*****************************************************************
 * vars
 *****************************************************************/

var rLOW_DIST_REP_COUNT = 16;

var lowDistRepCount = 0,
    prevLowDist = 0;

// unused
var BLOCK_LZ = 0,
    BLOCK_PPM = 1;

var rOldDist = [0, 0, 0, 0];
var lastDist;
var lastLength;

var UnpBlockType = BLOCK_LZ; // unused ?
var UnpOldTable = new Array(RarUtils.CONST.rHUFF_TABLE_SIZE);

function Unpack29(bstream, Solid) {
    // lazy initialize RarUtils.CONST.rDDecode and RarUtils.CONST.rDBits

    var DDecode = new Array(RarUtils.CONST.rDC);
    var DBits = new Array(RarUtils.CONST.rDC);

    var Dist = 0,
        BitLength = 0,
        Slot = 0;

    for (var I = 0; I < RarUtils.CONST.rDBitLengthCounts.length; I++, BitLength++) {
        for (var J = 0; J < RarUtils.CONST.rDBitLengthCounts[I]; J++, Slot++, Dist += (1 << BitLength)) {
            DDecode[Slot] = Dist;
            DBits[Slot] = BitLength;
        }
    }

    var Bits;
    //tablesRead = false;

    rOldDist = [0, 0, 0, 0]

    lastDist = 0;
    lastLength = 0;

    for (var i = UnpOldTable.length; i--;) UnpOldTable[i] = 0;

    // read in Huffman tables
    RarReadTables(bstream);

    while (true) {
        var num = RarUtils.RarDecodeNumber(bstream, RarUtils.CONST.LD);

        if (num < 256) {
            RarUtils.BUFFERS.unpack.insertByte(num);
            continue;
        }
        if (num >= 271) {
            var Length = RarUtils.CONST.rLDecode[num -= 271] + 3;
            if ((Bits = RarUtils.CONST.rLBits[num]) > 0) {
                Length += bstream.readBits(Bits);
            }
            var DistNumber = RarUtils.RarDecodeNumber(bstream, RarUtils.CONST.DD);
            var Distance = DDecode[DistNumber] + 1;
            if ((Bits = DBits[DistNumber]) > 0) {
                if (DistNumber > 9) {
                    if (Bits > 4) {
                        Distance += ((bstream.getBits() >>> (20 - Bits)) << 4);
                        bstream.readBits(Bits - 4);
                        //todo: check this
                    }
                    if (lowDistRepCount > 0) {
                        lowDistRepCount--;
                        Distance += prevLowDist;
                    } else {
                        var LowDist = RarUtils.RarDecodeNumber(bstream, RarUtils.CONST.LDD);
                        if (LowDist == 16) {
                            lowDistRepCount = rLOW_DIST_REP_COUNT - 1;
                            Distance += prevLowDist;
                        } else {
                            Distance += LowDist;
                            prevLowDist = LowDist;
                        }
                    }
                } else {
                    Distance += bstream.readBits(Bits);
                }
            }
            if (Distance >= 0x2000) {
                Length++;
                if (Distance >= 0x40000) {
                    Length++;
                }
            }
            RarInsertOldDist(Distance);
            RarInsertLastMatch(Length, Distance);
            RarUtils.RarCopyString(Length, Distance);
            continue;
        }
        if (num == 256) {
            if (!RarReadEndOfBlock(bstream)) break;

            continue;
        }
        if (num == 257) {
            //console.log("READVMCODE");
            if (!RarReadVMCode(bstream)) break;
            continue;
        }
        if (num == 258) {
            if (lastLength != 0) {
                RarUtils.RarCopyString(lastLength, lastDist);
            }
            continue;
        }
        if (num < 263) {
            var DistNum = num - 259;
            var Distance = rOldDist[DistNum];

            for (var I = DistNum; I > 0; I--) {
                rOldDist[I] = rOldDist[I - 1];
            }
            rOldDist[0] = Distance;

            var LengthNumber = RarUtils.RarDecodeNumber(bstream, RarUtils.CONST.RD);
            var Length = RarUtils.CONST.rLDecode[LengthNumber] + 2;
            if ((Bits = RarUtils.CONST.rLBits[LengthNumber]) > 0) {
                Length += bstream.readBits(Bits);
            }
            RarInsertLastMatch(Length, Distance);
            RarUtils.RarCopyString(Length, Distance);
            continue;
        }
        if (num < 272) {
            var Distance = RarUtils.CONST.rSDDecode[num -= 263] + 1;
            if ((Bits = RarUtils.CONST.rSDBits[num]) > 0) {
                Distance += bstream.readBits(Bits);
            }
            RarInsertOldDist(Distance);
            RarInsertLastMatch(2, Distance);
            RarUtils.RarCopyString(2, Distance);
            continue;
        }
    }

    RarUtils.RarUpdateProgress();
}

function RarInsertLastMatch(length, distance) {
    lastDist = distance;
    lastLength = length;
}

function RarInsertOldDist(distance) {
    rOldDist.splice(3, 1);
    rOldDist.splice(0, 0, distance);
}

function RarReadVMCode(bstream) {
    var FirstByte = bstream.readBits(8);
    var Length = (FirstByte & 7) + 1;
    if (Length == 7) {
        Length = bstream.readBits(8) + 7;
    } else if (Length == 8) {
        Length = bstream.readBits(16);
    }
    var vmCode = [];
    for (var I = 0; I < Length; I++) {
        //do something here with cheking readbuf
        vmCode.push(bstream.readBits(8));
    }
    return RarAddVMCode(FirstByte, vmCode, Length);
}

function RarAddVMCode(firstByte, vmCode, length) {
    //console.log(vmCode);
    if (vmCode.length > 0) {
        RarEventMgr.emitInfo("Error! RarVM not supported yet!"); // we don't want to trigger an error for this one since it's not fatal
    }
    return true;
}

function RarReadEndOfBlock(bstream) {

    RarUtils.RarUpdateProgress();

    var NewTable = false,
        NewFile = false;
    if (bstream.readBits(1)) {
        NewTable = true;
    } else {
        NewFile = true;
        NewTable = !!bstream.readBits(1);
    }
    //tablesRead = !NewTable;
    return !(NewFile || NewTable && !RarReadTables(bstream));
}

// read in Huffman tables for RAR
function RarReadTables(bstream) {
    var BitLength = new Array(RarUtils.CONST.rBC),
        Table = new Array(RarUtils.CONST.rHUFF_TABLE_SIZE);

    // before we start anything we need to get byte-aligned
    bstream.readBits((8 - bstream.bitPtr) & 0x7);

    if (bstream.readBits(1)) {
        console.info("Error!  PPM not implemented yet");
        return;
    }

    if (!bstream.readBits(1)) { //discard old table
        for (var i = UnpOldTable.length; i--;) UnpOldTable[i] = 0;
    }

    // read in bit lengths
    for (var I = 0; I < RarUtils.CONST.rBC; ++I) {

        var Length = bstream.readBits(4);
        if (Length == 15) {
            var ZeroCount = bstream.readBits(4);
            if (ZeroCount == 0) {
                BitLength[I] = 15;
            } else {
                ZeroCount += 2;
                while (ZeroCount-- > 0 && I < RarUtils.CONST.rBC)
                    BitLength[I++] = 0;
                --I;
            }
        } else {
            BitLength[I] = Length;
        }
    }

    // now all 20 bit lengths are obtained, we construct the Huffman Table:

    RarUtils.RarMakeDecodeTables(BitLength, 0, RarUtils.CONST.BD, RarUtils.CONST.rBC);

    var TableSize = RarUtils.CONST.rHUFF_TABLE_SIZE;
    //console.log(DecodeLen, DecodePos, DecodeNum);
    for (var i = 0; i < TableSize;) {
        var num = RarUtils.RarDecodeNumber(bstream, RarUtils.CONST.BD);
        if (num < 16) {
            Table[i] = (num + UnpOldTable[i]) & 0xf;
            i++;
        } else if (num < 18) {
            var N = (num == 16) ? (bstream.readBits(3) + 3) : (bstream.readBits(7) + 11);

            while (N-- > 0 && i < TableSize) {
                Table[i] = Table[i - 1];
                i++;
            }
        } else {
            var N = (num == 18) ? (bstream.readBits(3) + 3) : (bstream.readBits(7) + 11);

            while (N-- > 0 && i < TableSize) {
                Table[i++] = 0;
            }
        }
    }

    RarUtils.RarMakeDecodeTables(Table, 0, RarUtils.CONST.LD, RarUtils.CONST.rNC);
    RarUtils.RarMakeDecodeTables(Table, RarUtils.CONST.rNC, RarUtils.CONST.DD, RarUtils.CONST.rDC);
    RarUtils.RarMakeDecodeTables(Table, RarUtils.CONST.rNC + RarUtils.CONST.rDC, RarUtils.CONST.LDD, RarUtils.CONST.rLDC);
    RarUtils.RarMakeDecodeTables(Table, RarUtils.CONST.rNC + RarUtils.CONST.rDC + RarUtils.CONST.rLDC, RarUtils.CONST.RD, RarUtils.CONST.rRC);

    for (var i = UnpOldTable.length; i--;) {
        UnpOldTable[i] = Table[i];
    }
    return true;
}

module.exports = Unpack29;
