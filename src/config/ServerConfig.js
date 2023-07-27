const Logger = require('../Logger');

class ServerConfig {
    serverProperties;
    constructor(serverProperties) {
        this.serverProperties = serverProperties;
    }
    /**
     *
     * @param config
     * @returns {ServerConfig}
     */
    static handle(config) {
        config = config["serverConfig"] || {};
        let serverProperties = config["serverProperties"] || {};
        let maxPlayers = parseInt(ServerConfig.setDefaultAndGet(serverProperties, "max-players", 50));
        if (isNaN(maxPlayers) || maxPlayers < 1) {
            maxPlayers = 50;
            Logger.warn("config.json configured wrongly config.json -> serverConfig -> max-players should be positive integer. Set default value 50");
        }
        let onlineMode = ServerConfig.setDefaultAndGet(serverProperties, "online-mode", true)
        if (typeof onlineMode !== "boolean") {
            onlineMode = true;
            Logger.warn("config.json configured wrongly config.json -> serverConfig -> online-mode should be boolean. Set default value 'true'");
        }
        let enableCommandBlock = ServerConfig.setDefaultAndGet(serverProperties, "enable-command-block", true)
        if (typeof onlineMode !== "boolean") {
            enableCommandBlock = true;
            Logger.warn("config.json configured wrongly config.json -> serverConfig -> enable-command-block should be boolean. Set default value 'true'");
        }
        let spawnProtection = parseInt(ServerConfig.setDefaultAndGet(serverProperties, "spawn-protection", 0));
        if (isNaN(spawnProtection) || spawnProtection < 0) {
            spawnProtection = 0;
            Logger.warn("config.json configured wrongly config.json -> serverConfig -> spawn-protection should be non positive int. Set default value 0");
        }
        serverProperties["max-players"] = maxPlayers; //TODO: find more elegant way to set default value
        serverProperties["online-mode"] = onlineMode;
        serverProperties["enable-command-block"] = enableCommandBlock;
        serverProperties["spawn-protection"] = spawnProtection;
        return new ServerConfig(serverProperties);
    }
    static setDefaultAndGet(config, key, defaultValue) {
        let tmp = config[key];
        delete config[key];
        config[key] = tmp ?? defaultValue;
        return config[key];
    }
}
module.exports = ServerConfig;