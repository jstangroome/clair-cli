'use strict';

const bunyan = require('bunyan');
const log = bunyan.createLogger({name: 'clair-cli/registry'});

const drc = require('docker-registry-client');

const rc2 = require('docker-registry-client/lib/registry-client-v2');
// HACK to access rc2.login() because drc.login() insists upon basic auth

const DEFAULT_V2_REGISTRY = 'https://registry-1.docker.io';
// https://github.com/joyent/node-docker-registry-client/blob/3.2.6/lib/registry-client-v2.js#L39


function _basicAuthHeader(username, password) {
    // https://github.com/joyent/node-docker-registry-client/blob/3.2.6/lib/registry-client-v2.js#L64
    var buffer = new Buffer(username + ':' + password, 'utf8');
    return 'Basic ' + buffer.toString('base64');
}


function _setAuthHeaderFromAuthInfo(headers, authInfo) {
    // https://github.com/joyent/node-docker-registry-client/blob/3.2.6/lib/registry-client-v2.js#L77
    if (authInfo.token) {
        headers.authorization = 'Bearer ' + authInfo.token;
    } else if (authInfo.username) {
        headers.authorization = _basicAuthHeader(authInfo.username,
            authInfo.password);
    } else if (headers.authorization) {
        delete headers.authorization;
    }
}


function getAuthorizationHeader(authInfo) {
    var headers = {};
    _setAuthHeaderFromAuthInfo(headers, authInfo);
    return headers.authorization;
}


function getImagePullAuthInfo(rar) {

    var scope = `repository:${rar.remoteName}:pull`;

    var loginOptions = {
        index: rar.index,
        scope: scope,
        log: log,
    };

    return new Promise(function (resolve, reject) {
        rc2.login(loginOptions, function(err, result) {
            if (err) {
                return reject(err);
            }
            //console.error('# login result', result);
            return resolve(result.authInfo);
        });
    });
}


function getRegistryUrl (rar) {
    // https://github.com/joyent/node-docker-registry-client/blob/3.2.6/lib/common.js#L313
    if (rar.index.official) {
        return DEFAULT_V2_REGISTRY;
    }
    return [rar.index.scheme || 'https', '://', rar.index.name].join('');
}


function getV2ImageManifest (imageIdentifier) {

    var rar = drc.parseRepoAndRef(imageIdentifier);
    var tagOrDigest = rar.tag || rar.digest;

    var client = drc.createClientV2({
        repo: rar,
        maxSchemaVersion: 2,
        //log: log,
        //insecure: opts.insecure,
        //username: opts.username,
        //password: opts.password,
    });

    return new Promise(function (resolve, reject) {
        client.getManifest({ref: tagOrDigest}, function (err, manifest, res) {
            client.close();
            if (err) {
                return reject(err);
            }
            return resolve(manifest);
        });
    });

}

function getLayerUrl (imageIdentifier, layer) {

    var rar = drc.parseRepoAndRef(imageIdentifier);

    var url = [
        getRegistryUrl(rar),
        '/v2/',
        encodeURI(rar.remoteName),
        '/blobs/',
        encodeURI(layer.digest),
    ].join('');

    return url;
}


function getImagePullAuthorizationHeader (imageIdentifier) {

    var rar = drc.parseRepoAndRef(imageIdentifier);

    return getImagePullAuthInfo(rar)
        .then(function (authInfo) {
            //console.error('# authInfo', authInfo);
            return getAuthorizationHeader(authInfo);
        });

}


module.exports = {
    getV2ImageManifest: getV2ImageManifest,
    getLayerUrl: getLayerUrl,
    getImagePullAuthorizationHeader: getImagePullAuthorizationHeader,
};
