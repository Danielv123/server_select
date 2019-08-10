class masterPlugin {
	constructor({config, pluginConfig, path, socketio, express}){
		this.io = socketio;
		this.clients = {};
		this.socket = null;

		this.io.on("connection", socket => {
			this.socket = socket;

			socket.on("registerServer", data => {
				console.log("Registered server "+data.instanceID);
				this.clients[data.instanceID] = {
					master:this,
					instanceID: data.instanceID,
					socket,
				};

				this.io.sockets.emit("instancesUpdate", {instances:Object.keys(this.clients)});
			});

			socket.on("disconnect", data => {
				for(let id in this.clients) {
					if(this.clients[id].socket.id == socket.id) {
						console.log("Lost connection to instance: " + id);
						delete this.clients[id]
					}
				}
				this.io.sockets.emit("instancesUpdate", {instances:Object.keys(this.clients)});
			});
		});
	}
}
module.exports = masterPlugin;
