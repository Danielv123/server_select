/*
	Clusterio plugin for teleporting trains between servers
*/
module.exports = {
	// Name of package. For display somewhere I guess.
	name: "serverSelect",
	version: "1.0.0",
	binary: "nodePackage",
	description: "Clusterio plugin for selecing servers to connect to",
	scriptOutputFileSubscription: "serverSelect.txt",
	masterPlugin: "masterPlugin.js",
    fileReadDelay: 0
};
