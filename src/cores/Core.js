const ServerManager = require("../ServerManager");

class Core {
    /**
     * @type {ServerManager}
     */
    serverManager;

    /**
     *
     * @param {ServerManager} serverManager
     */
    constructor(serverManager) {
        this.serverManager = serverManager;
    }
    async install() {
    }
    async createServerProcess() {
    }
    /**
     *
     * @returns {Promise<String[]>}
     */
    async getReleases() {
        return [];
    }
}
module.exports = Core;