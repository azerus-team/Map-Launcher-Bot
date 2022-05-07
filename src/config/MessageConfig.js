const Logger = require('../Logger');

class MessageConfig {
    /**
     * @type {String}
     */
    title;
    /**
     * @type {String}
     */
    ip;
    /**
     * @type {String}
     */
    footer;
    /**
     * @type {String}
     */
    description;
    /**
     * @type {number}
     */
    sideColor;

    constructor(title, ip, footer, description, sideColor) {
        this.title = title;
        this.ip = ip;
        this.footer = footer;
        this.description = description;
        this.sideColor = sideColor;
    }

    /**
     *
     * @param config
     * @returns {MessageConfig}
     */
    static handle(config) {
        let messageNode = config["message"];
        if (!messageNode) {
            Logger.fatal("Message node is not defined!")
        }
        let title = messageNode["title"] || "Map launcher bot";
        let ip = messageNode["ip"];
        let footer = messageNode["footer"] || "Made with <3";
        let description = messageNode["description"] || "Using this bot you can launch your map. Just send your map using `.zip` archive.";
        let sideColor = messageNode["sideColor"] || 43775;
        if (!ip || isNaN(sideColor)) {
            Logger.fatal("IP or SideColor is not defined in message node!")
        }
        return new MessageConfig(title, ip, footer, description, sideColor);
    }
}
module.exports = MessageConfig;