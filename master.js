"use strict";
const libPlugin = require("@clusterio/lib/plugin");

class MasterPlugin extends libPlugin.BaseMasterPlugin {
	async init() {
		this.instances = new Map();
	}

	async getInstancesRequestHandler(message) {
		return {
			instances: [...this.instances.values()],
		};
	}

	async instanceStartedEventHandler(message) {
		this.instances.set(message.data.id, message.data);
		this.broadcastEventToSlaves(this.info.messages.updateInstances, { instances: [message.data] });
	}

	async instanceStoppedEventHandler(message) {
		this.instances.delete(message.data.id);
		this.broadcastEventToSlaves(this.info.messages.updateInstances,
			{ instances: [{ id: message.data.id, removed: true }] }
		);
	}
}

module.exports = {
	MasterPlugin,
};
