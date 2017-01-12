'use strict';

const ClairClient = require('./clairClient');
const registry = require('./registry');

function run(imageIdentifier) {

    if (!imageIdentifier) {
        console.error('imageIdentifier argument required.');
        return process.exit(1);
    }

    var clairOptions = {
        hostname: process.env.CLAIR_HOSTNAME || 'localhost',
        port: process.env.CLAIR_PORT || 6060,
        registry: registry,
    };

    var clair = new ClairClient(clairOptions);

    registry.getV2ImageManifest(imageIdentifier)
        .then(function (manifest) {

            return clair.postLayers(imageIdentifier, manifest);

        })
        .then(function (postedLayers) {

            console.error(postedLayers);
            return Promise.all(postedLayers.map(function (layer) {
                return clair.getVulnerabilities(layer.name);
            }));
        })
        .then(function (layersWithVulns) {
            console.error('# layersWithVulns', layersWithVulns);
            layersWithVulns.forEach(function (layerWithVulns) {
                console.error('\n\n');
                console.error(layerWithVulns.Layer.Name);
                if (layerWithVulns.Layer.Features) {
                    layerWithVulns.Layer.Features.forEach(function (feature) {
                        if (feature.Vulnerabilities) {
                            console.error(feature.NamespaceName);
                            console.error(feature.Name);
                            console.error(feature.Version);
                            console.error(feature.Vulnerabilities.slice(0, 3));
                            // .Name, Severity, Link
                        }
                    });
                }
            });
        });

}

run(process.argv[2]);
