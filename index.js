"use strict"
var stdin = process.openStdin();
var fs = require('fs');
var handler = require('./function/handler.js');

const IN_BODY_DATA = -1;

let resetRequest = function(req) {
    req.received = new Buffer(0);
    req.contentLength = -1;
    req.header = undefined;
}

stdin.addListener("data", function(data) {
    currentRequest.received = Buffer.concat([currentRequest.received, data]);

    let key = "\r\n\r\n"; // marks the start of a "HTTP header"
    let keyBuffer = new Buffer(key);
    let index = currentRequest.received.indexOf(key);

    if (index == IN_BODY_DATA) {
        console.log("In body data, not finished request yet.");

        process.exit(1);
    } else {
        let headerLength = index + keyBuffer.byteLength; // received.length - (index + keyBuffer.byteLength);

        let header = new Buffer(headerLength);
        currentRequest.received.copy(header, 0, 0, headerLength);

        let parsedHeader = parseHeader(header.toString());
        let bodyLength = parseInt(parsedHeader["Content-Length"]);

        currentRequest.contentLength =  bodyLength;
        currentRequest.header = parsedHeader;

        if (bodyLength + headerLength < currentRequest.received.length) {
            console.log(currentRequest.received.length, headerLength, bodyLength)
            process.exit(1)
        }

        console.log("Body (expected): " + bodyLength);
        console.log("Header (actual): " + headerLength);
        console.log("Body (actual): " + (currentRequest.received.length - headerLength));

        // console.log(currentRequest.received.toString());
        let body = new Buffer(bodyLength);
        //buffer.copy(target, targetStart, sourceStart, sourceEnd);
        currentRequest.received.copy(body, 0, index, bodyLength);
        console.log(body.toString());

        handler(body.toString(), (err, output) => {
            let result = addHttp(output);
            process.stdout.write(result);

            resetRequest(currentRequest);
        });
    }
});

function addHttp(content) {
    return new Buffer("HTTP/1.1 200 OK\r\n" +
        "Content-Length: " + content.length + "\r\n" +
        "\r\n" +
        content);
}

function parseHeader(raw) {
    let map = {};

    raw.split("\r\n").reduce((m, obj) => {
        if (obj.length) {
            map[obj.substring(0, obj.indexOf(" ") - 1)] = obj.substring(obj.indexOf(" ") + 1)
        }
    });
    return map;
}

var currentRequest = {};
resetRequest(currentRequest);