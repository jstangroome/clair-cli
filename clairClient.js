'use strict';

const querystring = require('querystring');
const mRequest = require('./minimalRequest');

function ClairClient(options) {

    function addHostHttpOptions(httpOptions) {
         // TODO options.protocol
        httpOptions.hostname = options.hostname;
        httpOptions.port = options.port;
        return httpOptions;
    }

    function postLayer(layer, layerAccess, parentLayer) {

        var layerName = layer.digest; // is this sufficient?

        var layerParameters = {
            Layer: {
                Name: layerName,
                Path: layerAccess.url,
                Headers: {
                    Authorization: layerAccess.authorizationHeader,
                },
                ParentName: parentLayer ? parentLayer.digest : undefined,
                Format: 'Docker',
            }
        };

        var requestBody = new Buffer(JSON.stringify(layerParameters), 'utf8');

        var httpOptions = addHostHttpOptions({
            method: 'POST',
            path: '/v1/layers',
            headers: {
                'Content-Length': requestBody.length,
            },
        });

        return mRequest(httpOptions, requestBody)
            .then(function (incomingMessage) {
                if (incomingMessage.statusCode >= 400) {
                    var body = incomingMessage.body.toString('utf8');
                    throw new Error(`Clair POST Layer failed: ${incomingMessage.statusMessage}; ${body}`);
                }
                return {
                    name: layerName,
                };
            });

    }


    this.postLayers = function postLayers(imageIdentifier, manifest) {

        var parentLayer;
        var layer;

        return options.registry.getImagePullAuthorizationHeader(imageIdentifier)
            .then(function (authorizationHeader) {

                layer = manifest.layers[0];

                var layerAccess = {
                    url: options.registry.getLayerUrl(imageIdentifier, layer),
                    authorizationHeader: authorizationHeader,
                };
                return postLayer(layer, layerAccess, parentLayer)
            })
            .then(function (postResult) {
                parentLayer = layer;
                // TODO loop through remaining layers
                return postResult;
            });

    }

    this.getVulnerabilities = function getVulnerabilities(layerName) {

        var qs = {
            vulnerabilities: true
        };

        var httpOptions = addHostHttpOptions({
            method: 'GET',
            path: '/v1/layers/' + encodeURI(layerName) + '?' + querystring.stringify(qs),
        });

        return mRequest(httpOptions)
            .then(function (incomingMessage) {
                var body = incomingMessage.body.toString('utf8');
                if (incomingMessage.statusCode >= 400) {
                    throw new Error(`Clair GET Layer failed: ${incomingMessage.statusMessage}; ${body}`);
                }
                return JSON.parse(body);
            });

    }

}


module.exports = ClairClient;
