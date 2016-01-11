const EventEmitter = require('events');
const util = require('util');

function RarEventMgr() {
    EventEmitter.call(this); // constructor

    this.TYPES = {
        START: 'start',
        PROGRESS: 'progress',
        EXTRACT: 'extract',
        FINISH: 'finish',
        INFO: 'info',
        ERROR: 'error'
    };

    this.emitStart = function() {
        this.emit(this.TYPES.START);
    };

    this.emitProgress = function(data) {
        this.emit(this.TYPES.PROGRESS, data);
    };

    this.emitExtract = function(file) {
        this.emit(this.TYPES.EXTRACT, file);
    };

    this.emitFinish = function(fileList) {
        this.emit(this.TYPES.FINISH, fileList);
    };

    this.emitInfo = function(str) {
        this.emit(this.TYPES.INFO, str);
    };

    this.emitError = function(err) {
        this.emit(this.TYPES.ERROR, err);
    };

}
util.inherits(RarEventMgr, EventEmitter);

module.exports = new RarEventMgr();
