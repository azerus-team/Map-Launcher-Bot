const SharedConstants = require('./../SharedConstants');
const fs = require("fs");
const MessageConfig = require('./MessageConfig');
const Logger = require('../Logger');

class ConfigProperties {
    /**
     * @type {String}
     */
    channelId;
    /**
     * @type {String}
     */
    botToken;
    /**
     * @type {String}
     */
    core;
    /**
     * @type {number}
     */
    port;
    /**
     * @type {String}
     */
    initialMemory;
    /**
     * @type {maxMemory}
     */
    maxMemory;
    /**
     * @type {boolean}
     */
    onlineMode;
    /**
     * @type {number}
     */
    maxPlayers
    /**
     * @type {boolean}
     */
    generateDownloadLink;
    /**
     * @type {boolean}
     */
    eula;
    /**
     * @type {number}
     */
    idleTime;
    /**
     * @type {function}
     */
    motd;
    /**
     * @type {MessageConfig}
     */
    message;
    constructor(channelId,
                botToken,
                javaPath,
                core,
                port,
                initialMemory,
                maxMemory,
                onlineMode,
                maxPlayers,
                generateDownloadLink,
                eula,
                idleTime,
                motd,
                message
    ) {
        this.channelId = channelId;
        this.botToken = botToken;
        this.javaPath = javaPath;
        this.core = core;
        this.port = port;
        this.initialMemory = initialMemory;
        this.maxMemory = maxMemory;
        this.onlineMode = onlineMode;
        this.maxPlayers = maxPlayers;
        this.generateDownloadLink = generateDownloadLink;
        this.eula = eula;
        this.idleTime = idleTime;
        this.motd = motd;
        this.message = message;
    }

    /**
     *
     * @returns {ConfigProperties}
     */
    static handle() {
        let jsonConfig = {};
        try {
            let file = fs.readFileSync(SharedConstants.ConfigFile);
            jsonConfig = JSON.parse(file);
        } catch (e) {
            Logger.fatal("Unable to parse config file")
        }
        let channelId = jsonConfig["channelId"];
        let botToken = process.env["DISCORD_TOKEN"] || jsonConfig["botToken"];
        let javaPath = jsonConfig["javaPath"] || "java";
        let core = jsonConfig["core"];
        if (core !== "VANILLA" && core !== "PAPER" && core !== "FABRIC") {
            core = "VANILLA";
        }
        let port = parseInt(jsonConfig["port"]);
        if (isNaN(port)) {
            port = 25565;
            Logger.warn("Port is not number. Using default port 25565!")
        }
        if (port < 0 && port > 65535) {
            Logger.warn("Port should be in 0-65535 range. Using default port 25565!");
            port = 25565;
        }
        let initialMemory = jsonConfig["initialMemory"];
        let maxMemory = jsonConfig["maxMemory"];
        let onlineMode = jsonConfig["onlineMode"];
        if (typeof onlineMode != "boolean") {
            Logger.fatal("Unable to parse Online Mode. It should be boolean")
        }
        let maxPlayers = parseInt(jsonConfig["maxPlayers"]);
        if (isNaN(maxPlayers)) maxPlayers = 50;
        let generateDownloadLink = jsonConfig["generateDownloadLink"];
        if (typeof generateDownloadLink != "boolean") {
            Logger.fatal("Unable to parse Generate Download Link. It should be boolean")
        }
        let eula = jsonConfig["eula"];
        if (!eula) {
            Logger.fatal("You should accept Minecraft EULA to use this bot, change option in config.json. https://www.minecraft.net/eula")
        }
        let motd = jsonConfig["motd"];
        let f_motd = (initiator) => {
            let motdSplited = motd.split("$INITIATOR");
            return motdSplited[0] + initiator + (motdSplited[1] ?? "");
        }
        let idleTime = jsonConfig["idleTime"] || 15;
        let message = MessageConfig.handle(jsonConfig);
        return new ConfigProperties(channelId, botToken, javaPath, core, port, initialMemory, maxMemory, onlineMode, maxPlayers, generateDownloadLink, eula, idleTime, f_motd, message);
    }
}
module.exports = ConfigProperties;