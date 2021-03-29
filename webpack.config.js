"use strict";
const path = require("path");
const webpack = require("webpack");
const { merge } = require("webpack-merge");

const common = require("@clusterio/web_ui/webpack.common");

module.exports = (env = {}) => merge(common(env), {
	context: __dirname,
	entry: "./web/index.jsx",
	output: {
		filename: "bundle.js",
		path: path.resolve(__dirname, "dist", "web"),
	},
	plugins: [
		new webpack.container.ModuleFederationPlugin({
			name: "server_select",
			library: { type: "var", name: "plugin_server_select" },
			filename: "remoteEntry.js",
			exposes: {
				"./info": "./info.js",
				"./package.json": "./package.json",
			},
			shared: {
				"@clusterio/lib/link": { import: false },
				"@clusterio/lib/config": { import: false },
				"@clusterio/web_ui": { import: false },
				"ajv": { import: false },
			},
		}),
	],
});
