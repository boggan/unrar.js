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

// TODO: implement
function Unpack15(bstream, Solid) {
    RarEventMgr.emitError("ERROR!  RAR 1.5 compression not supported");
}

module.exports = Unpack15;
