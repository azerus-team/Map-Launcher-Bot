const SharedConstants = require('./../SharedConstants');
const fs = require("fs");
const MessageConfig = require('./MessageConfig');
const ServerConfig = require('./ServerConfig');
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
    language;
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
    /**
     * @type {ServerConfig}
     */
    serverConfig;
    constructor(channelId,
                botToken,
                language,
                javaPath,
                core,
                port,
                initialMemory,
                maxMemory,
                generateDownloadLink,
                eula,
                idleTime,
                motd,
                message,
                serverConfig
    ) {
        this.channelId = channelId;
        this.botToken = botToken;
        this.language = language;
        this.javaPath = javaPath;
        this.core = core;
        this.port = port;
        this.initialMemory = initialMemory;
        this.maxMemory = maxMemory;
        this.generateDownloadLink = generateDownloadLink;
        this.eula = eula;
        this.idleTime = idleTime;
        this.motd = motd;
        this.message = message;
        this.serverConfig = serverConfig;
    }

    /**
     *
     * @returns {ConfigProperties}
     */
    static handle() {
        let jsonConfig = {};
        let file;
        try {
            file = fs.readFileSync(SharedConstants.ConfigFile, "utf8");
        } catch (e) {
            Logger.warn("Config file not found creating a new one");
            file = "{}";
        }
        try {
            jsonConfig = JSON.parse(file);
        } catch (e) {
            Logger.warn("Config file have syntax error. " + e);
            return;
        }

        let channelId = ConfigProperties.setDefaultAndGet(jsonConfig, "channelId", "<SET HERE CHANNEL ID>")
        let botToken = process.env["DISCORD_TOKEN"] || jsonConfig["botToken"];
        ConfigProperties.setDefaultAndGet(jsonConfig, "botToken", "<SET HERE BOT TOKEN>")
        let language = ConfigProperties.setDefaultAndGet(jsonConfig, "language", "en_US");
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
        let generateDownloadLink = ConfigProperties.setDefaultAndGet(jsonConfig, "generateDownloadLink", false);
        if (typeof generateDownloadLink != "boolean") {
            Logger.fatal("Unable to parse Generate Download Link. It should be boolean")
        }
        let eula = ConfigProperties.setDefaultAndGet(jsonConfig, "eula", false);

        let motd = ConfigProperties.setDefaultAndGet(jsonConfig, "motd", "\\u00a76Your\\u00a77 map server\\u00a7r\\n\\u00a77Launched by\\u00a73 $INITIATOR\\u00a7r!");
        let f_motd = (initiator) => {
            let motdSplited = motd.split("$INITIATOR");
            return motdSplited[0] + initiator + (motdSplited[1] ?? "");
        }
        let idleTime = ConfigProperties.setDefaultAndGet(jsonConfig, "idleTime", 15);
        let message = MessageConfig.handle(jsonConfig);
        let msg = ConfigProperties.setDefaultAndGet(jsonConfig, "message", message);
        let serverConfig = ServerConfig.handle(jsonConfig);
        let srvConfig = ConfigProperties.setDefaultAndGet(jsonConfig, "serverConfig", serverConfig);
        fs.writeFileSync(SharedConstants.ConfigFile, JSON.stringify(jsonConfig, null, '\t'));
        if (!eula) {
            Logger.fatal("You should accept Minecraft EULA to use this bot, change option in config.json. More info: https://www.minecraft.net/eula")
        }
        return new ConfigProperties(channelId,
            botToken,
            language,
            javaPath,
            core,
            port,
            initialMemory,
            maxMemory,
            generateDownloadLink,
            eula,
            idleTime,
            f_motd,
            msg,
            srvConfig);
    }
    static setDefaultAndGet(config, key, defaultValue) {
        let tmp = config[key];
        delete config[key];
        config[key] = tmp ?? defaultValue;
        fs.writeFileSync(SharedConstants.ConfigFile, JSON.stringify(config, null, '\t')); //TODO tmp fix for empty config
        return config[key];
    }
}
module.exports = ConfigProperties;