'use strict';

const drc = require('docker-registry-client');
const rc2 = require('docker-registry-client/lib/registry-client-v2');
const bunyan = require('bunyan');
const http = require('http');

// TODO lint

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
            //console.log('request(requestBody)=', requestBody.toString());
            request.write(requestBody);
        }

        request.end();
    });
    return promise;
}

function setAuthHeaderFromAuthInfo(headers, authInfo) {
    // https://github.com/joyent/node-docker-registry-client/blob/master/lib/registry-client-v2.js#L77
    if (authInfo.token) {
        headers.authorization = 'Bearer ' + authInfo.token;
    } else if (authInfo.username) {
        headers.authorization = _basicAuthHeader(authInfo.username,
            authInfo.password);
    } else if (headers.authorization) {
        delete headers.authorization;
    }
}

function run() {

    var rar = drc.parseRepoAndRef('node:6.9');
    console.error('# rar');
    console.error(JSON.stringify(rar,null,4));

    var log = bunyan.createLogger({name: 'flurp'});
    var scope = `repository:${rar.remoteName}:pull`;
    rc2.login({index: rar.index, scope: scope, log: log}, function(err, result) {
        if (err) {
            throw err;
        }
        next(rar, result.authInfo);
    });
}

function next(rar, authInfo) {

    const DEFAULT_V2_REGISTRY = 'https://registry-1.docker.io';
    // https://github.com/joyent/node-docker-registry-client/blob/master/lib/registry-client-v2.js#L39

    var registryUrl = DEFAULT_V2_REGISTRY;
    if (!rar.index.official) {
        // from https://github.com/joyent/node-docker-registry-client/blob/master/lib/common.js#L313
        registryUrl = [rar.index.scheme || 'https', rar.index.name].join('');
    }

    var client = drc.createClientV2({
        repo: rar,
        maxSchemaVersion: 2,
        //log: log,
        //insecure: opts.insecure,
        //username: opts.username,
        //password: opts.password,
    });

    var tagOrDigest = rar.tag || rar.digest;
    client.getManifest({ref: tagOrDigest}, function (err, manifest, res) {
        client.close();
        if (err) {
            throw err;
        }
        //console.error('# response headers');
        //console.error(JSON.stringify(res.headers, null, 4));
        //console.error('# manifest');
        //console.log(JSON.stringify(manifest, null, 4));
        var parentLayer = undefined;
        var layers = manifest.layers;
        layers = [layers[0]]; // TESTING
        layers.forEach(function (layer) {
            //console.error(layer.digest);
            var layerUrl = [
                registryUrl,
                '/v2/',
                encodeURI(rar.remoteName),
                '/blobs/',
                encodeURI(layer.digest),
            ].join('');
            console.error(layerUrl);

            var layerHeaders = {};
            setAuthHeaderFromAuthInfo(layerHeaders, authInfo);
            var layerParameters = {
                Layer: {
                    Name: layer.digest, // is this sufficient?
                    Path: layerUrl,
                    Headers: {
                        Authorization: layerHeaders.authorization,
                    },
                    ParentName: parentLayer ? parentLayer.digest : undefined,
                    Format: 'Docker',
                }
            };
            console.error('# layerParameters');
            console.error(layerParameters);

            var requestBody = new Buffer(JSON.stringify(layerParameters), 'utf8');

            var httpOptions = {
                hostname: '192.168.99.100',
                port: 30060,
                method: 'POST',
                path: '/v1/layers',
                headers: {
                    'Content-Length': requestBody.length,
                },
            };

            request(httpOptions, requestBody)
                .then(function (incomingMessage) {
                    console.error('# incomingMessage');
                    console.error(incomingMessage.statusCode);
                    console.error(incomingMessage.statusMessage);
                    console.error(incomingMessage.headers);
                    //console.error(JSON.stringify(incomingMessage, 4, null));
                    console.error(JSON.parse(incomingMessage.body.toString('utf8')));
                });

            parentLayer = layer;
        });
    });

}

run();
