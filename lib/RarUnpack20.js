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
var RarUtils = require("./RarUtils");

/*****************************************************************
 * vars
 *****************************************************************/

function Unpack20(bstream, Solid) {
    var destUnpSize = RarUtils.BUFFERS.unpack.data.length;
    var oldDistPtr = 0;

    RarReadTables20(bstream);
    while (destUnpSize > RarUtils.BUFFERS.unpack.ptr) {
        var num = RarUtils.RarDecodeNumber(bstream, RarUtils.CONST.LD);
        if (num < 256) {
            RarUtils.BUFFERS.unpack.insertByte(num);
            continue;
        }
        if (num > 269) {
            var Length = RarUtils.CONST.rLDecode[num -= 270] + 3;
            if ((Bits = RarUtils.CONST.rLBits[num]) > 0) {
                Length += bstream.readBits(Bits);
            }
            var DistNumber = RarUtils.RarDecodeNumber(bstream, RarUtils.CONST.DD);
            var Distance = RarUtils.CONST.rDDecode[DistNumber] + 1;
            if ((Bits = RarUtils.CONST.rDBits[DistNumber]) > 0) {
                Distance += bstream.readBits(Bits);
            }
            if (Distance >= 0x2000) {
                Length++;
                if (Distance >= 0x40000) Length++;
            }
            lastLength = Length;
            lastDist = rOldDist[oldDistPtr++ & 3] = Distance;
            RarUtils.RarCopyString(Length, Distance);
            continue;
        }
        if (num == 269) {
            RarReadTables20(bstream);

            RarUtils.RarUpdateProgress();

            continue;
        }
        if (num == 256) {
            lastDist = rOldDist[oldDistPtr++ & 3] = lastDist;
            RarUtils.RarCopyString(lastLength, lastDist);
            continue;
        }
        if (num < 261) {
            var Distance = rOldDist[(oldDistPtr - (num - 256)) & 3];
            var LengthNumber = RarUtils.RarDecodeNumber(bstream, RarUtils.CONST.RD);
            var Length = RarUtils.CONST.rLDecode[LengthNumber] + 2;
            if ((Bits = RarUtils.CONST.rLBits[LengthNumber]) > 0) {
                Length += bstream.readBits(Bits);
            }
            if (Distance >= 0x101) {
                Length++;
                if (Distance >= 0x2000) {
                    Length++
                    if (Distance >= 0x40000) Length++;
                }
            }
            lastLength = Length;
            lastDist = rOldDist[oldDistPtr++ & 3] = Distance;
            RarUtils.RarCopyString(Length, Distance);
            continue;
        }
        if (num < 270) {
            var Distance = RarUtils.CONST.rSDDecode[num -= 261] + 1;
            if ((Bits = RarUtils.CONST.rSDBits[num]) > 0) {
                Distance += bstream.readBits(Bits);
            }
            lastLength = 2;
            lastDist = rOldDist[oldDistPtr++ & 3] = Distance;
            RarUtils.RarCopyString(2, Distance);
            continue;
        }

    }
    RarUtils.RarUpdateProgress();
}

var rNC20 = 298,
    rDC20 = 48,
    rRC20 = 28,
    rBC20 = 19,
    rMC20 = 257;

var UnpOldTable20 = new Array(rMC20 * 4);

function RarReadTables20(bstream) {
    var BitLength = new Array(rBC20);
    var Table = new Array(rMC20 * 4);
    var TableSize, N, I;
    var AudioBlock = bstream.readBits(1);
    if (!bstream.readBits(1))
        for (var i = UnpOldTable20.length; i--;) UnpOldTable20[i] = 0;
    TableSize = rNC20 + rDC20 + rRC20;
    for (var I = 0; I < rBC20; I++)
        BitLength[I] = bstream.readBits(4);
    RarUtils.RarMakeDecodeTables(BitLength, 0, RarUtils.CONST.BD, rBC20);
    I = 0;
    while (I < TableSize) {
        var num = RarUtils.RarDecodeNumber(bstream, RarUtils.CONST.BD);
        if (num < 16) {
            Table[I] = num + UnpOldTable20[I] & 0xf;
            I++;
        } else if (num == 16) {
            N = bstream.readBits(2) + 3;
            while (N-- > 0 && I < TableSize) {
                Table[I] = Table[I - 1];
                I++;
            }
        } else {
            if (num == 17) {
                N = bstream.readBits(3) + 3;
            } else {
                N = bstream.readBits(7) + 11;
            }
            while (N-- > 0 && I < TableSize) {
                Table[I++] = 0;
            }
        }
    }
    RarUtils.RarMakeDecodeTables(Table, 0, RarUtils.CONST.LD, rNC20);
    RarUtils.RarMakeDecodeTables(Table, rNC20, RarUtils.CONST.DD, rDC20);
    RarUtils.RarMakeDecodeTables(Table, rNC20 + rDC20, RarUtils.CONST.RD, rRC20);
    for (var i = UnpOldTable20.length; i--;) UnpOldTable20[i] = Table[i];
}

module.exports = Unpack20;
