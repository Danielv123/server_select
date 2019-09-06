const plugin = require("lib/plugin");
const luaTools = require("lib/luaTools");


class InstancePlugin extends plugin.BaseInstancePlugin {
	async onStart() {
		this.info.messages.instanceStarted.send(this.instance, {
			id: this.instance.config.get("instance.id"),
			name: this.instance.name,
			game_port: this.instance.server.gamePort,
			public_address: this.slave.config.get("slave.public_address"),
		});

		let response = await this.info.messages.getInstances.send(this.instance);
		let instancesJson = luaTools.escapeString(JSON.stringify(response.instances));
		await this.instance.server.sendRcon(`/sc server_select.update_instances("${instancesJson}", true)`, true);
	}

	onExit() {
		this.info.messages.instanceStopped.send(this.instance, {
			id: this.instance.config.get("instance.id"),
		});
	}

	async updateInstancesEventHandler(message) {
		let instancesJson = luaTools.escapeString(JSON.stringify(message.data.instances));
		await this.instance.server.sendRcon(`/sc server_select.update_instances("${instancesJson}")`, true);
	}
}

module.exports = {
	InstancePlugin,
};
