"use strict";
const libPlugin = require("@clusterio/lib/plugin");

class MasterPlugin extends libPlugin.BaseMasterPlugin {
	async init() {
		this.instances = new Map();
		if (this.master.config.get("server_select.show_unknown_instances")) {
			for (let [instanceId, instance] of this.master.instances) {
				if (instance.status === "unknown") {
					this.instances.set(instanceId, {
						"id": instanceId,
						"name": instance.config.get("instance.name"),
						"status": "unknown",
					});
				}
			}
		}

		// No master config changed hook :(
		this.master.config.on("fieldChanged", (group, field, prev) => {
			if (
				group.name === "server_select"
				&& ["show_unknown_instances", "show_offline_instances"].includes(field)
			) {
				this.updateInstances().catch(
					err => this.logger.error(`Unexpected error updating instances:\n${err.stack}`)
				)
			}
		});
	}

	async getInstancesRequestHandler(message) {
		return {
			instances: [...this.instances.values()],
		};
	}

	shouldShowInstance(instance) {
		if (instance.status === "unassigned") {
			return false;
		}
		if (instance.status === "unknown") {
			return this.master.config.get("server_select.show_unknown_instances");
		}
		if (instance.status === "running") {
			return true;
		}
		return this.master.config.get("server_select.show_offline_instances");
	}

	async updateInstanceData(instance) {
		let instanceId = instance.config.get("instance.id");
		if (instance.status === "running") {
			let slaveConnection = this.master.wsServer.slaveConnections.get(
				instance.config.get("instance.assigned_slave")
			);
			if (!slaveConnection) { // Should be impossible
				return;
			}

			let response = await this.info.messages.getInstance.send(slaveConnection, { instance_id: instanceId });
			this.instances.set(instanceId, response.instance);
		}

		let instanceData = this.instances.get(instanceId);
		if (!instanceData) {
			instanceData = {
				"id": instanceId,
				"name": instance.config.get("instance.name"),
			};
			this.instances.set(instanceId, instanceData);
		}
		instanceData["status"] = instance.status;
		return instanceData;
	}

	async onInstanceStatusChanged(instance, prev) {
		let instanceId = instance.config.get("instance.id");
		if (this.shouldShowInstance(instance)) {
			let instanceData = await this.updateInstanceData(instance);
			this.broadcastEventToSlaves(this.info.messages.updateInstances, { instances: [instanceData], full: false });

		} else {
			this.instances.delete(instanceId);
			this.broadcastEventToSlaves(this.info.messages.updateInstances, {
				instances: [{ id: instance.config.get("instance.id"), removed: true }],
				full: false,
			});
		}
	}

	async updateInstances() {
		for (let [instanceId, instance] of this.master.instances) {
			if (this.shouldShowInstance(instance)) {
				if (!this.instances.has(instanceId)) {
					await this.updateInstanceData(instance);
				}
			} else {
				this.instances.delete(instanceId);
			}
		}

		this.broadcastEventToSlaves(this.info.messages.updateInstances, {
			instances: [...this.instances.values()],
			full: true,
		});
	}
}

module.exports = {
	MasterPlugin,
};
