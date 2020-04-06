const link = require("lib/link");
const config = require("lib/config");

class MasterConfigGroup extends config.PluginConfigGroup {}
MasterConfigGroup.groupName = "server_select"
/*MasterConfigGroup.define({
	name: 'disable_shout',
	title: "Disable Shout Command",
	description: "Disable the /shout command globally",
	type: 'boolean',
	initial_value: false,
});
MasterConfigGroup.define({
	name: 'global_chat',
	title: "Enable Global chat",
	description: "Mirrors all chat between all instance",
	type: 'boolean',
	initial_value: false,
});*/
MasterConfigGroup.finalize();


let instanceProperties = {
	"id": { type: "integer" },
	"name": { type: "string" },
	"game_port": { type: "integer" },
	"game_version": { type: "string" },
	"public_address": { type: "string" },
};

module.exports = {
	name: "server_select",
	title: "Server Select",
	description: "In-game GUI for connecting to other server in the cluster.",
	version: "2.0.0-alpha",
	masterEntrypoint: "master",
	instanceEntrypoint: "instance",
	MasterConfigGroup,

	messages: {
		instanceStarted: new link.Event({
			type: 'server_select:instance_started',
			links: ['instance-slave', 'slave-master'],
			forwardTo: 'master',
			eventProperties: instanceProperties,
		}),
		instanceStopped: new link.Event({
			type: 'server_select:instance_stopped',
			links: ['instance-slave', 'slave-master'],
			forwardTo: 'master',
			eventProperties: {
				"id": { type: "integer" },
			},
		}),
		getInstances: new link.Request({
			type: 'server_select:get_instances',
			links: ['instance-slave', 'slave-master'],
			forwardTo: 'master',
			responseProperties: {
				"instances": {
					type: "array",
					items: {
						type: "object",
						additionalProperties: false,
						required: ["id", "name", "game_port", "game_version", "public_address"],
						properties: instanceProperties,
					},
				},
			},
		}),
		updateInstances: new link.Event({
			type: 'server_select:update_instances',
			links: ['master-slave', 'slave-instance'],
			broadcastTo: 'instance',
			eventProperties: {
				"instances": {
					type: "array",
					items: {
						type: "object",
						additionalProperties: false,
						required: ["id"],
						properties: Object.assign({ "removed": { type: "boolean" }}, instanceProperties),
					},
				},
			},
		}),
	},
}
