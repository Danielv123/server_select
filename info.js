"use strict";
const lib = require("@clusterio/lib");

class ControllerConfigGroup extends lib.PluginConfigGroup {}
ControllerConfigGroup.defaultAccess = ["controller", "host", "control"];
ControllerConfigGroup.groupName = "server_select";
ControllerConfigGroup.define({
	name: "show_offline_instances",
	title: "Show Offline Instances",
	description: "Show instances that are not running in the server list.",
	type: "boolean",
	initial_value: true,
});
ControllerConfigGroup.define({
	name: "show_unknown_instances",
	title: "Show Unknown Instances",
	description: "Show instances with an unknown status in the server list.",
	type: "boolean",
	initial_value: true,
});
ControllerConfigGroup.finalize();


let instanceProperties = {
	"id": { type: "integer" },
	"name": { type: "string" },
	"status": { type: "string" },
	"game_port": { type: "integer" },
	"game_version": { type: "string" },
	"public_address": { type: "string" },
};

module.exports = {
	name: "server_select",
	title: "Server Select",
	description: "In-game GUI for connecting to other server in the cluster.",
	controllerEntrypoint: "controller",
	instanceEntrypoint: "instance",
	ControllerConfigGroup,

	messages: {
		getInstance: new lib.Request({
			type: "server_select:get_instance",
			links: ["controller-host", "host-instance"],
			forwardTo: "instance",
			responseProperties: {
				"instance": {
					type: "object",
					additionalProperties: false,
					required: Object.keys(instanceProperties),
					properties: instanceProperties,
				}
			}
		}),
		getInstances: new lib.Request({
			type: "server_select:get_instances",
			links: ["instance-host", "host-controller"],
			forwardTo: "controller",
			responseProperties: {
				"instances": {
					type: "array",
					items: {
						type: "object",
						additionalProperties: false,
						required: ["id", "name", "status"],
						properties: instanceProperties,
					},
				},
			},
		}),
		updateInstances: new lib.Event({
			type: "server_select:update_instances",
			links: ["controller-host", "host-instance"],
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
				"full": { type: "boolean" },
			},
		}),
	},
};
