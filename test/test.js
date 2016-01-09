var fs = require("fs");
var unrar = require("./unrar")
var buff = fs.readFileSync(__dirname + '/' + "test.cbr");
// var abuff = new ArrayBuffer(buff);
var abuff = new Uint8Array(buff).buffer;
console.log("Got Buff: ", buff.length);
console.log("Got ArrayBuff: ", abuff);

console.log("Calling unrar: ");
var l_nST = new Date().getTime();
var unpackedFiles = unrar(buff);
var l_nET = new Date().getTime();
console.log("Unpacking took: ", (l_nET - l_nST), "ms");

console.log("Unpacked Files: ", unpackedFiles.length);
// unpacked data in files should be in fileData member
//
if (unpackedFiles && unpackedFiles.length > 0) {
    var file = unpackedFiles[0];
    console.log("Filedata for first file : ", file.filename, typeof(file.fileData), file.header.unpackedSize );
    console.log("Saving content of file ");
    var unpackedBuffer = new Buffer(file.fileData);
    fs.writeFile(file.filename, unpackedBuffer, function() {
        console.log("File written to disk...");
    });
}
