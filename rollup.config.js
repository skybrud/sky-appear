const SkyBuildSetup = require('sky-build-setup');
const PackageJson = require('./package.json');
const path = require('path');

module.exports = SkyBuildSetup(
	PackageJson,
	path.resolve(__dirname)
);