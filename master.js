const plugin = require("lib/plugin");

class MasterPlugin extends plugin.BaseMasterPlugin{
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
		for (let slaveConnection of this.master.slaveConnections.values()) {
			this.info.messages.updateInstances.send(slaveConnection, { instances: [message.data] });
		}
	}

	async instanceStoppedEventHandler(message) {
		this.instances.delete(message.data.id);
		for (let slaveConnection of this.master.slaveConnections.values()) {
			this.info.messages.updateInstances.send(slaveConnection,
				{ instances: [{ id: message.data.id, removed: true }] }
			);
		}
	}
}

module.exports = {
	MasterPlugin,
};
