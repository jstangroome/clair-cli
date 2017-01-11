'use strict';

const ClairClient = require('./clairClient');
const registry = require('./registry');

function run() {

    var clairOptions = {
        hostname: process.env.CLAIR_HOSTNAME || 'localhost',
        port: process.env.CLAIR_PORT || 6060,
        registry: registry,
    };

    var imageIdentifier = 'node:6.9';

    var clair = new ClairClient(clairOptions);

    registry.getV2ImageManifest(imageIdentifier)
        .then(function (manifest) {

            return clair.postLayers(imageIdentifier, manifest);

        })
        .then(function (posted) {

            return clair.getVulnerabilities(posted.name);

        })
        .then(function (layerWithVulns) {
            console.error(layerWithVulns.Layer.NamespaceName);
            console.error(layerWithVulns.Layer.Features);
        });

}

run();
