const needle = require("needle");

function getInstances(config, connectedInstances){
	let fullinstances = {};

	return new Promise((resolve, reject) => {
		needle.get(config.masterIP+":"+config.masterPort+ '/api/slaves', { compressed: true }, (err, response) => {
			if(err || response.statusCode != 200) {
				console.log("Unable to get JSON master/api/slaves, master might be unaccessible");
			} else if (response && response.body) {
				if(Buffer.isBuffer(response.body)) {console.log(response.body.toString("utf-8")); throw new Error();}
				try {
					for (let index in response.body) {
						if (index && connectedInstances) {
							if (connectedInstances.indexOf(index) != -1) {
								fullinstances[index] = {
									publicIP: response.body[index].publicIP,
									serverPort: response.body[index].serverPort,
									instanceName: response.body[index].instanceName
								};
							}
						}
					}
				} catch (e){
					console.log(e);
					return null;
				}
				resolve(fullinstances);
			}
		});
	});
}


module.exports = {
	getInstances
};
