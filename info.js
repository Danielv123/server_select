"use strict";
const libLink = require("@clusterio/lib/link");
const libConfig = require("@clusterio/lib/config");

class MasterConfigGroup extends libConfig.PluginConfigGroup {}
MasterConfigGroup.defaultAccess = ["master", "slave", "control"];
MasterConfigGroup.groupName = "server_select";
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
	masterEntrypoint: "master",
	instanceEntrypoint: "instance",
	MasterConfigGroup,

	messages: {
		instanceStarted: new libLink.Event({
			type: "server_select:instance_started",
			links: ["instance-slave", "slave-master"],
			forwardTo: "master",
			eventProperties: instanceProperties,
		}),
		instanceStopped: new libLink.Event({
			type: "server_select:instance_stopped",
			links: ["instance-slave", "slave-master"],
			forwardTo: "master",
			eventProperties: {
				"id": { type: "integer" },
			},
		}),
		getInstances: new libLink.Request({
			type: "server_select:get_instances",
			links: ["instance-slave", "slave-master"],
			forwardTo: "master",
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
		updateInstances: new libLink.Event({
			type: "server_select:update_instances",
			links: ["master-slave", "slave-instance"],
			broadcastTo: "instance",
			eventProperties: {
				"instances": {
					type: "array",
					items: {
						type: "object",
						additionalProperties: false,
						required: ["id"],
						properties: { "removed": { type: "boolean" }, ...instanceProperties },
					},
				},
			},
		}),
	},
};
