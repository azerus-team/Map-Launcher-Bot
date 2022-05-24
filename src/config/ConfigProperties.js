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
    maxPlayers;
    /**
     * @type {boolean}
     */
    useNativeTransport;
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
                useNativeTransport,
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
        this.useNativeTransport = useNativeTransport;
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
        let channelId = ConfigProperties.setDefaultAndGet(jsonConfig, "channelId", "<SET HERE CHANNEL ID>")
        let botToken = process.env["DISCORD_TOKEN"] || jsonConfig["botToken"];
        ConfigProperties.setDefaultAndGet(jsonConfig, "botToken", "<SET HERE CHANNEL ID>")
        let javaPath = ConfigProperties.setDefaultAndGet(jsonConfig, "javaPath", "java")
        let core = ConfigProperties.setDefaultAndGet(jsonConfig, "core", "VANILLA | PAPER | FABRIC");
        if (core !== "VANILLA" && core !== "PAPER" && core !== "FABRIC") {
            core = "VANILLA";
        }
        let port = parseInt(ConfigProperties.setDefaultAndGet(jsonConfig, "port", 25565));
        if (isNaN(port)) {
            port = 25565;
            Logger.warn("Port is not number. Using default port 25565!")
        }
        if (port < 0 && port > 65535) {
            Logger.warn("Port should be in 0-65535 range. Using default port 25565!");
            port = 25565;
        }
        let initialMemory = ConfigProperties.setDefaultAndGet(jsonConfig, "initialMemory", "1G");
        let maxMemory = ConfigProperties.setDefaultAndGet(jsonConfig, "maxMemory", "4G");
        let useNativeTransport = ConfigProperties.setDefaultAndGet(jsonConfig, "useNativeTransport", true);
        let onlineMode = ConfigProperties.setDefaultAndGet(jsonConfig, "onlineMode", true);
        if (typeof onlineMode != "boolean") {
            Logger.fatal("Unable to parse Online Mode. It should be boolean")
        }
        let maxPlayers = parseInt(ConfigProperties.setDefaultAndGet(jsonConfig, "maxPlayers", 50));
        if (isNaN(maxPlayers)) maxPlayers = 50;
        let generateDownloadLink = ConfigProperties.setDefaultAndGet(jsonConfig, "generateDownloadLink", false);
        if (typeof generateDownloadLink != "boolean") {
            Logger.fatal("Unable to parse Generate Download Link. It should be boolean")
        }
        let eula = ConfigProperties.setDefaultAndGet(jsonConfig, "eula", false);
        if (!eula) {
            Logger.fatal("You should accept Minecraft EULA to use this bot, change option in config.json. https://www.minecraft.net/eula")
        }
        let motd = ConfigProperties.setDefaultAndGet(jsonConfig, "motd", "\\u00a76Your\\u00a77 map server\\u00a7r\\n\\u00a77Launched by\\u00a73 $INITIATOR\\u00a7r!");
        let f_motd = (initiator) => {
            let motdSplited = motd.split("$INITIATOR");
            return motdSplited[0] + initiator + (motdSplited[1] ?? "");
        }
        let idleTime = ConfigProperties.setDefaultAndGet(jsonConfig, "idleTime", 15);
        let message = MessageConfig.handle(jsonConfig);
        fs.writeFileSync(SharedConstants.ConfigFile, JSON.stringify(jsonConfig, null, '\t'));
        return new ConfigProperties(channelId, botToken, javaPath, core, port, initialMemory, maxMemory, onlineMode, maxPlayers, useNativeTransport, generateDownloadLink, eula, idleTime, f_motd, message);
    }
    static setDefaultAndGet(config, key, defaultValue) {
        let tmp = config[key];
        delete config[key];
        config[key] = tmp ?? defaultValue;
        // config = Object.keys(config).sort().reduce(
        //     (obj, key) => {
        //         obj[key] = config[key];
        //         return obj;
        //     },
        //     {}
        // );

        return config[key];
    }
}
module.exports = ConfigProperties;