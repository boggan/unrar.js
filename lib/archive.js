/**
 * archive.js
 *
 * Provides base functionality for unarchiving.
 *
 * Licensed under the MIT License
 *
 * Copyright(c) 2011 Google Inc.
 */

var bitjs = bitjs || {};
bitjs.archive = bitjs.archive || {};

(function() {

    // ===========================================================================
    // Stolen from Closure because it's the best way to do Java-like inheritance.
    bitjs.base = function(me, opt_methodName, var_args) {
        var caller = arguments.callee.caller;
        if (caller.superClass_) {
            // This is a constructor. Call the superclass constructor.
            return caller.superClass_.constructor.apply(me, Array.prototype.slice.call(arguments, 1));
        }

        var args = Array.prototype.slice.call(arguments, 2);
        var foundCaller = false;
        for (var ctor = me.constructor; ctor; ctor = ctor.superClass_ && ctor.superClass_.constructor) {
            if (ctor.prototype[opt_methodName] === caller) {
                foundCaller = true;
            } else if (foundCaller) {
                return ctor.prototype[opt_methodName].apply(me, args);
            }
        }

        // If we did not find the caller in the prototype chain,
        // then one of two things happened:
        // 1) The caller is an instance method.
        // 2) This method was not called by the right caller.
        if (me[opt_methodName] === caller) {
            return me.constructor.prototype[opt_methodName].apply(me, args);
        } else {
            throw Error(
                'goog.base called from a method of one name ' +
                'to a method of a different name');
        }
    };
    bitjs.inherits = function(childCtor, parentCtor) {
        /** @constructor */
        function tempCtor() {};
        tempCtor.prototype = parentCtor.prototype;
        childCtor.superClass_ = parentCtor.prototype;
        childCtor.prototype = new tempCtor();
        childCtor.prototype.constructor = childCtor;
    };
    // ===========================================================================

    /**
     * An unarchive event.
     *
     * @param {string} type The event type.
     * @constructor
     */
    bitjs.archive.UnarchiveEvent = function(type) {
        /**
         * The event type.
         *
         * @type {string}
         */
        this.type = type;
    };

    /**
     * The UnarchiveEvent types.
     */
    bitjs.archive.UnarchiveEvent.Type = {
        START: 'start',
        PROGRESS: 'progress',
        EXTRACT: 'extract',
        FINISH: 'finish',
        INFO: 'info',
        ERROR: 'error'
    };


    // ===========================================================================
    /**
     * Useful for passing info up to the client (for debugging).
     *
     * @param {string} msg The info message.
     */
    bitjs.archive.UnarchiveInfoEvent = function(msg) {
        bitjs.base(this, bitjs.archive.UnarchiveEvent.Type.INFO);

        /**
         * The information message.
         *
         * @type {string}
         */
        this.msg = msg;
    };
    bitjs.inherits(bitjs.archive.UnarchiveInfoEvent, bitjs.archive.UnarchiveEvent);


    // ===========================================================================
    /**
     * An unrecoverable error has occured.
     *
     * @param {string} msg The error message.
     */
    bitjs.archive.UnarchiveErrorEvent = function(msg) {
        bitjs.base(this, bitjs.archive.UnarchiveEvent.Type.ERROR);

        /**
         * The information message.
         *
         * @type {string}
         */
        this.msg = msg;
    };
    bitjs.inherits(bitjs.archive.UnarchiveErrorEvent, bitjs.archive.UnarchiveEvent);


    // ===========================================================================
    /**
     * Start event.
     *
     * @param {string} msg The info message.
     */
    bitjs.archive.UnarchiveStartEvent = function() {
        bitjs.base(this, bitjs.archive.UnarchiveEvent.Type.START);
    };
    bitjs.inherits(bitjs.archive.UnarchiveStartEvent, bitjs.archive.UnarchiveEvent);

    // ===========================================================================
    /**
     * Finish event.
     *
     * @param {string} msg The info message.
     */
    bitjs.archive.UnarchiveFinishEvent = function() {
        bitjs.base(this, bitjs.archive.UnarchiveEvent.Type.FINISH);
    };
    bitjs.inherits(bitjs.archive.UnarchiveFinishEvent, bitjs.archive.UnarchiveEvent);

    // ===========================================================================
    /**
     * Progress event.
     */
    bitjs.archive.UnarchiveProgressEvent = function(
        currentFilename,
        currentFileNumber,
        currentBytesUnarchivedInFile,
        currentBytesUnarchived,
        totalUncompressedBytesInArchive,
        totalFilesInArchive) {
        bitjs.base(this, bitjs.archive.UnarchiveEvent.Type.PROGRESS);

        this.currentFilename = currentFilename;
        this.currentFileNumber = currentFileNumber;
        this.currentBytesUnarchivedInFile = currentBytesUnarchivedInFile;
        this.totalFilesInArchive = totalFilesInArchive;
        this.currentBytesUnarchived = currentBytesUnarchived;
        this.totalUncompressedBytesInArchive = totalUncompressedBytesInArchive;
    };
    bitjs.inherits(bitjs.archive.UnarchiveProgressEvent, bitjs.archive.UnarchiveEvent);

    // ===========================================================================
    /**
     * All extracted files returned by an Unarchiver will implement
     * the following interface:
     *
     * interface UnarchivedFile {
     *   string filename
     *   TypedArray fileData
     * }
     *
     */

    /**
     * Extract event.
     */
    bitjs.archive.UnarchiveExtractEvent = function(unarchivedFile) {
        bitjs.base(this, bitjs.archive.UnarchiveEvent.Type.EXTRACT);

        /**
         * @type {UnarchivedFile}
         */
        this.unarchivedFile = unarchivedFile;
    };
    bitjs.inherits(bitjs.archive.UnarchiveExtractEvent, bitjs.archive.UnarchiveEvent);



    // ===========================================================================
    /**
     * Unzipper
     * @extends {bitjs.archive.Unarchiver}
     * @constructor
     */
    bitjs.archive.Unzipper = function(arrayBuffer, opt_pathToBitJS) {
        bitjs.base(this, arrayBuffer, opt_pathToBitJS);
    };
    bitjs.inherits(bitjs.archive.Unzipper, bitjs.archive.Unarchiver);
    bitjs.archive.Unzipper.prototype.getScriptFileName = function() {
        return 'unzip.js'
    };

    // ===========================================================================
    /**
     * Unrarrer
     * @extends {bitjs.archive.Unarchiver}
     * @constructor
     */
    bitjs.archive.Unrarrer = function(arrayBuffer, opt_pathToBitJS) {
        bitjs.base(this, arrayBuffer, opt_pathToBitJS);
    };
    bitjs.inherits(bitjs.archive.Unrarrer, bitjs.archive.Unarchiver);
    bitjs.archive.Unrarrer.prototype.getScriptFileName = function() {
        return 'unrar.js'
    };

    // ===========================================================================
    /**
     * Untarrer
     * @extends {bitjs.archive.Unarchiver}
     * @constructor
     */
    bitjs.archive.Untarrer = function(arrayBuffer, opt_pathToBitJS) {
        bitjs.base(this, arrayBuffer, opt_pathToBitJS);
    };
    bitjs.inherits(bitjs.archive.Untarrer, bitjs.archive.Unarchiver);
    bitjs.archive.Untarrer.prototype.getScriptFileName = function() {
        return 'untar.js'
    };

})();
