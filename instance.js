"use strict";
const libPlugin = require("@clusterio/lib/plugin");
const libLuaTools = require("@clusterio/lib/lua_tools");


class InstancePlugin extends libPlugin.BaseInstancePlugin {
	async init() {
		if (!this.instance.config.get("factorio.enable_save_patching")) {
			throw new Error("server_select plugin requires save patching.");
		}
	}

	async onStart() {
		this.info.messages.instanceStarted.send(this.instance, {
			id: this.instance.config.get("instance.id"),
			name: this.instance.name,
			game_port: this.instance.server.gamePort,
			game_version: this.instance.server.version,
			public_address: this.slave.config.get("slave.public_address"),
		});

		let response = await this.info.messages.getInstances.send(this.instance);
		let instancesJson = libLuaTools.escapeString(JSON.stringify(response.instances));
		await this.sendRcon(`/sc server_select.update_instances("${instancesJson}", true)`, true);
	}

	onExit() {
		this.info.messages.instanceStopped.send(this.instance, {
			id: this.instance.config.get("instance.id"),
		});
	}

	async updateInstancesEventHandler(message) {
		let instancesJson = libLuaTools.escapeString(JSON.stringify(message.data.instances));
		await this.sendRcon(`/sc server_select.update_instances("${instancesJson}")`, true);
	}
}

module.exports = {
	InstancePlugin,
};
