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
var RarEventMgr = require("./RarEventMgr");

function RarUtils() {

    // shows a byte value as its hex representation
    var nibble = "0123456789ABCDEF";

    /*
     * Public Members
     */
    var rNC = 299,
        rDC = 60,
        rLDC = 17,
        rRC = 28,
        rBC = 20,
        rHUFF_TABLE_SIZE = (rNC + rDC + rRC + rLDC);

    // Volume Types
    this.VOLUME_TYPES = {
        MARK_HEAD: 0x72,
        MAIN_HEAD: 0x73,
        FILE_HEAD: 0x74,
        COMM_HEAD: 0x75,
        AV_HEAD: 0x76,
        SUB_HEAD: 0x77,
        PROTECT_HEAD: 0x78,
        SIGN_HEAD: 0x79,
        NEWSUB_HEAD: 0x7a,
        ENDARC_HEAD: 0x7b
    };

    this.BUFFERS = {
        unpack: null, // rBuffer for unpack / and update progress
        oldBuffers: [] // rOldBuffers
    };

    this.PROGRESS = {
        // Global Progress variables.
        currentFilename: "",
        currentFileNumber: 0,
        currentBytesUnarchivedInFile: 0,
        currentBytesUnarchived: 0,
        totalUncompressedBytesInArchive: 0,
        totalFilesInArchive: 0
    };


    this.CONST = {
        rLDecode: [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224],
        rLBits: [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5],
        rDBitLengthCounts: [4, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 14, 0, 12],
        rSDDecode: [0, 4, 8, 16, 32, 64, 128, 192],
        rSDBits: [2, 2, 3, 4, 5, 6, 6, 6],

        rDDecode: [0, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32,
            48, 64, 96, 128, 192, 256, 384, 512, 768, 1024, 1536, 2048, 3072,
            4096, 6144, 8192, 12288, 16384, 24576, 32768, 49152, 65536, 98304,
            131072, 196608, 262144, 327680, 393216, 458752, 524288, 589824,
            655360, 720896, 786432, 851968, 917504, 983040
        ],
        rDBits: [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5,
            5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14,
            15, 15, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16
        ],

        // copied from private variables
        rNC: rNC,
        rDC: rDC,
        rLDC: rLDC,
        rRC: rRC,
        rBC: rBC,
        rHUFF_TABLE_SIZE: rHUFF_TABLE_SIZE,

        BD: { //bitdecode
            DecodeLen: new Array(16),
            DecodePos: new Array(16),
            DecodeNum: new Array(rBC)
        },
        LD: { //litdecode
            DecodeLen: new Array(16),
            DecodePos: new Array(16),
            DecodeNum: new Array(rNC)
        },
        DD: { //distdecode
            DecodeLen: new Array(16),
            DecodePos: new Array(16),
            DecodeNum: new Array(rDC)
        },
        LDD: { //low dist decode
            DecodeLen: new Array(16),
            DecodePos: new Array(16),
            DecodeNum: new Array(rLDC)
        },
        RD: { //rep decode
            DecodeLen: new Array(16),
            DecodePos: new Array(16),
            DecodeNum: new Array(rRC)
        }
    };

    /*
     * Public Methods
     */

    //==========================================================================
    this.reset = function() {
        this.BUFFERS.unpack = null;
        this.BUFFERS.oldBuffers.length = 0;
        this.PROGRESS.currentFilename = "";
        this.PROGRESS.currentFileNumber = 0;
        this.PROGRESS.currentBytesUnarchivedInFile = 0;
        this.PROGRESS.currentBytesUnarchived = 0;
        this.PROGRESS.totalUncompressedBytesInArchive = 0;
        this.PROGRESS.totalFilesInArchive = 0;
    };

    //==========================================================================
    this.byteValueToHexString = function(num) {
        return nibble[num >> 4] + nibble[num & 0xF];
    };

    //==========================================================================
    this.twoByteValueToHexString = function(num) {
        return nibble[(num >> 12) & 0xF] + nibble[(num >> 8) & 0xF] + nibble[(num >> 4) & 0xF] + nibble[num & 0xF];
    };

    //==========================================================================
    this.RarUpdateProgress = function() {
        var change = this.BUFFERS.unpack.ptr - this.PROGRESS.currentBytesUnarchivedInFile;
        this.PROGRESS.currentBytesUnarchivedInFile = this.BUFFERS.unpack.ptr;
        this.PROGRESS.currentBytesUnarchived += change;
        RarEventMgr.emitProgress(this.PROGRESS);
    };

    // used in RarUnpack29 and RarUnpack20
    //==========================================================================
    this.RarDecodeNumber = function(bstream, dec) {
        var DecodeLen = dec.DecodeLen,
            DecodePos = dec.DecodePos,
            DecodeNum = dec.DecodeNum,
            bitField = bstream.getBits() & 0xfffe;

        //some sort of rolled out binary search
        var bits = ((bitField < DecodeLen[8]) ?
            ((bitField < DecodeLen[4]) ?
                ((bitField < DecodeLen[2]) ?
                    ((bitField < DecodeLen[1]) ? 1 : 2) : ((bitField < DecodeLen[3]) ? 3 : 4)) : (bitField < DecodeLen[6]) ?
                ((bitField < DecodeLen[5]) ? 5 : 6) : ((bitField < DecodeLen[7]) ? 7 : 8)) : ((bitField < DecodeLen[12]) ?
                ((bitField < DecodeLen[10]) ?
                    ((bitField < DecodeLen[9]) ? 9 : 10) : ((bitField < DecodeLen[11]) ? 11 : 12)) : (bitField < DecodeLen[14]) ?
                ((bitField < DecodeLen[13]) ? 13 : 14) : 15));
        bstream.readBits(bits);
        var N = DecodePos[bits] + ((bitField - DecodeLen[bits - 1]) >>> (16 - bits));

        return DecodeNum[N];
    };

    //==========================================================================
    // used in RarUnpack29 and RarUnpack20
    this.RarMakeDecodeTables = function(BitLength, offset, dec, size) {
        var DecodeLen = dec.DecodeLen,
            DecodePos = dec.DecodePos,
            DecodeNum = dec.DecodeNum,
            LenCount = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            TmpPos = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            N = 0,
            M = 0,
            i,
            I;

        for (i = DecodeNum.length; i--;) {
            DecodeNum[i] = 0;
        }

        for (i = 0; i < size; i++) {
            LenCount[BitLength[i + offset] & 0xF]++;
        }

        LenCount[0] = 0;
        TmpPos[0] = 0;
        DecodePos[0] = 0;
        DecodeLen[0] = 0;

        for (I = 1; I < 16; ++I) {
            N = 2 * (N + LenCount[I]);
            M = (N << (15 - I));
            if (M > 0xFFFF)
                M = 0xFFFF;
            DecodeLen[I] = M;
            DecodePos[I] = DecodePos[I - 1] + LenCount[I - 1];
            TmpPos[I] = DecodePos[I];
        }

        for (I = 0; I < size; ++I) {
            if (BitLength[I + offset] != 0) {
                DecodeNum[TmpPos[BitLength[offset + I] & 0xF]++] = I;
            }
        }
    };

    //==========================================================================
    //this is the real function, the other one is for debugging
    this.RarCopyString = function(length, distance) {
        var destPtr = this.BUFFERS.unpack.ptr - distance;
        if (destPtr < 0) {
            var l = this.BUFFERS.oldBuffers.length;
            while (destPtr < 0) {
                destPtr = this.BUFFERS.oldBuffers[--l].data.length + destPtr;
            }
            //TODO: lets hope that it never needs to read beyond file boundaries
            while (length--) this.BUFFERS.unpack.insertByte(this.BUFFERS.oldBuffers[l].data[destPtr++]);

        }
        if (length > distance) {
            while (length--) this.BUFFERS.unpack.insertByte(this.BUFFERS.unpack.data[destPtr++]);
        } else {
            this.BUFFERS.unpack.insertBytes(this.BUFFERS.unpack.data.subarray(destPtr, destPtr + length));
        }
    };
}

module.exports = new RarUtils();
