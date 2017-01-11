'use strict';

const http = require('http');
// TODO https

function request(options, requestBody) {
    var promise = new Promise(function (resolve, reject) {
        var request;
        try {
            request = http.request(options);
        } catch (err) {
            return reject(err);
        }

        request.on('response', function (incomingMessage) {
            var allChunks = [];
            incomingMessage.on('data', function (chunk) {
                allChunks.push(chunk);
            });
            incomingMessage.on('end', function () {
                incomingMessage.body = Buffer.concat(allChunks);
                return resolve(incomingMessage);
            });
        });

        request.on('error', function (err) {
            return reject(err);
        });

        if (requestBody) {
            if (!Buffer.isBuffer(requestBody)) {
                return reject(new Error('requestBody must be a Buffer'));
            }
            request.write(requestBody);
        }

        request.end();
    });
    return promise;
}


module.exports = request;
