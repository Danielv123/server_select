const pluginConfig = require("./config");
const clusterUtil = require("./cluster.js");
const fs = require("fs");

const COMPRESS_LUA = false;

module.exports = class remoteCommands {
	constructor(mergedConfig, messageInterface, extras){
		this.messageInterface = messageInterface;
		this.config = mergedConfig;
		this.socket = extras.socket;

		this.registeredInstances = {};

		this.upsInterval = null;

		let socketRegister = () => {
			this.socket.emit("registerServer", {
				instanceID: this.config.unique,
			});

			this.messageInterface('/silent-command remote.call("serverSelect", "setWorldId","' + this.config.unique + '")');
			if(!this.upsInterval) {
				this.upsInterval = setInterval(async () => {
					this.messageInterface('/silent-command remote.call("serverSelect", "reportPassedSecond")');
				}, 1000);
			}
		};
		this.socket.on("hello", () => socketRegister());

		this.socket.on("disconnect", async () => {
			console.log("LOST MASTER");
			this.messageInterface('/silent-command remote.call("serverSelect", "setWorldId","0") game.print("Lost connection to cluster master!")');
		});

		// initialize mod with Hotpatch
		(async () => {
			let startTime = Date.now();
			let hotpatchInstallStatus = await this.checkHotpatchInstallation();
			this.messageInterface("Hotpach installation status: "+hotpatchInstallStatus);
			if(hotpatchInstallStatus){
				var returnValue;
				var mainCode = await this.getSafeLua("sharedPlugins/serverSelect/lua/control.lua");
				if(mainCode) returnValue = await messageInterface("/silent-command remote.call('hotpatch', 'update', '"+pluginConfig.name+"', '"+pluginConfig.version+"', '"+mainCode+"')");
				if(returnValue) console.log(returnValue);


				this.messageInterface("serverSelect installed in "+(Date.now() - startTime)+"ms");
			} else {
				this.messageInterface("Hotpatch isn't installed! Please generate a new map with the hotpatch scenario to use trainTeleports.");
			}
		})().catch(e => console.error(e));

		this.socket.on("instancesUpdate", async data => {
			console.log("Got instance update!");
			this.registeredInstances = data.instances;
			this.messageInterface('/silent-command remote.call("serverSelect","json","' + this.singleEscape(JSON.stringify({event: "instances", data: await clusterUtil.getInstances(this.config, this.registeredInstances)})) + '")');
		});
	}

	singleEscape(stop) {
		stop = stop.replace(/\\/g, "\\\\");
		stop = stop.replace(/"/g, '\\"');
		stop = stop.replace(/'/g, "\\'");

		return stop
	}

	async scriptOutput(data){
		if(data !== null){
			//console.log(data);
			this.socket.emit("serverselect_json", JSON.parse(data));
		}
	}
	async getSafeLua(filePath){
		return new Promise((resolve, reject) => {
			fs.readFile(filePath, "utf8", (err, contents) => {
				if(err){
					reject(err);
				} else {
					// split content into lines
					contents = contents.split(/\r?\n/);

					// join those lines after making them save again
					contents = contents.reduce((acc, val) => {
						val = val.replace(/\\/g ,'\\\\');
						// remove leading and trailing spaces
						val = val.trim();
						// escape single quotes
						val = val.replace(/'/g ,'\\\'');

						// remove single line comments
						let singleLineCommentPosition = val.indexOf("--");
						let multiLineCommentPosition = val.indexOf("--[[");

						if(multiLineCommentPosition === -1 && singleLineCommentPosition !== -1) {
							val = val.substr(0, singleLineCommentPosition);
						}

						return acc + val + '\\n';
					}, ""); // need the "" or it will not process the first row, potentially leaving a single line comment in that disables the whole code

					// console.log(contents);

					// this takes about 46 ms to minify train_stop_tracking.lua in my tests on an i3
					if(COMPRESS_LUA) contents = require("luamin").minify(contents);

					resolve(contents);
				}
			});
		});
	}
	async checkHotpatchInstallation(){
		let yn = await this.messageInterface("/silent-command if remote.interfaces['hotpatch'] then rcon.print('true') else rcon.print('false') end");
		yn = yn.replace(/(\r\n\t|\n|\r\t)/gm, "");
		if(yn == "true"){
			return true;
		} else if(yn == "false"){
			return false;
		}
	}
};
