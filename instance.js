"use strict";
const libPlugin = require("@clusterio/lib/plugin");
const libLuaTools = require("@clusterio/lib/lua_tools");


class InstancePlugin extends libPlugin.BaseInstancePlugin {
	async init() {
		if (!this.instance.config.get("factorio.enable_save_patching")) {
			throw new Error("server_select plugin requires save patching.");
		}

		this.pendingCommands = [];
		this.currentlySending = false;
	}

	async sendPendingRcon() {
		this.currentlySending = true;
		while (this.pendingCommands.length) {
			let task = this.pendingCommands.shift();
			try {
				let result = await this.sendRcon(task.command, task.expectEmpty);
				task.resolve(result);
			} catch (err) {
				task.reject(err);
			}
		}
		this.currentlySending = false;
	}

	async serialRcon(command, expectEmpty = false) {
		let promise = new Promise((resolve, reject) => {
			this.pendingCommands.push({resolve, reject, command, expectEmpty});
		});
		if (!this.currentlySending) {
			this.sendPendingRcon();
		}
		return await promise;
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
		await this.serialRcon(`/sc server_select.update_instances("${instancesJson}", true)`, true);
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
		if (this.instance.status !== "running") {
			return;
		}
		let instancesJson = libLuaTools.escapeString(JSON.stringify(message.data.instances));
		await this.serialRcon(`/sc server_select.update_instances("${instancesJson}", ${message.data.full})`, true);
	}
}

module.exports = {
	InstancePlugin,
};
