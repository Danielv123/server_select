"use strict";
const lib = require("@clusterio/lib");

class ControllerPlugin extends lib.BaseControllerPlugin {
	async init() {
		this.instances = new Map();
		if (this.controller.config.get("server_select.show_unknown_instances")) {
			for (let [instanceId, instance] of this.controller.instances) {
				if (instance.status === "unknown") {
					this.instances.set(instanceId, {
						"id": instanceId,
						"name": instance.config.get("instance.name"),
						"status": "unknown",
					});
				}
			}
		}

		// No controller config changed hook :(
		this.controller.config.on("fieldChanged", (group, field, prev) => {
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
		if (["unassigned", "deleted"].includes(instance.status)) {
			return false;
		}
		if (instance.status === "unknown") {
			return this.controller.config.get("server_select.show_unknown_instances");
		}
		if (instance.status === "running") {
			return true;
		}
		return this.controller.config.get("server_select.show_offline_instances");
	}

	async updateInstanceData(instance) {
		let instanceId = instance.config.get("instance.id");
		if (instance.status === "running") {
			let hostConnection = this.controller.wsServer.hostConnections.get(
				instance.config.get("instance.assigned_host")
			);
			if (!hostConnection) { // Should be impossible
				return;
			}

			let response = await this.info.messages.getInstance.send(hostConnection, { instance_id: instanceId });
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
			this.broadcastEventToHosts(this.info.messages.updateInstances, { instances: [instanceData], full: false });

		} else {
			this.instances.delete(instanceId);
			this.broadcastEventToHosts(this.info.messages.updateInstances, {
				instances: [{ id: instance.config.get("instance.id"), removed: true }],
				full: false,
			});
		}
	}

	async updateInstances() {
		for (let [instanceId, instance] of this.controller.instances) {
			if (this.shouldShowInstance(instance)) {
				if (!this.instances.has(instanceId)) {
					await this.updateInstanceData(instance);
				}
			} else {
				this.instances.delete(instanceId);
			}
		}

		this.broadcastEventToHosts(this.info.messages.updateInstances, {
			instances: [...this.instances.values()],
			full: true,
		});
	}
}

module.exports = {
	ControllerPlugin,
};
