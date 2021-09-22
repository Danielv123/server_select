"use strict";
const libPlugin = require("@clusterio/lib/plugin");
const libLuaTools = require("@clusterio/lib/lua_tools");


class InstancePlugin extends libPlugin.BaseInstancePlugin {
	async init() {
		if (!this.instance.config.get("factorio.enable_save_patching")) {
			throw new Error("server_select plugin requires save patching.");
		}
	}

	async getInstanceRequestHandler() {
		let instance = {
			id: this.instance.config.get("instance.id"),
			name: this.instance.name,
			status: this.instance.status,
			game_port: this.instance.server.gamePort,
			game_version: this.instance.server.version,
			public_address: this.slave.config.get("slave.public_address"),
		};
		return { instance };
	}

	async updateList() {
		let response = await this.info.messages.getInstances.send(this.instance);
		let instancesJson = libLuaTools.escapeString(JSON.stringify(response.instances));
		await this.sendRcon(`/sc server_select.update_instances("${instancesJson}", true)`, true);
	}

	onMasterConnectionEvent(event) {
		if (event === "connect" && this.instance.status === "running") {
			this.updateList().catch(err => this.logger.error(`Unexpected error updating server list:\n${err.stack}`));
		}
	}

	async onStart() {
		await this.updateList();
	}

	async updateInstancesEventHandler(message) {
		let instancesJson = libLuaTools.escapeString(JSON.stringify(message.data.instances));
		await this.sendRcon(`/sc server_select.update_instances("${instancesJson}", ${message.data.full})`, true);
	}
}

module.exports = {
	InstancePlugin,
};
