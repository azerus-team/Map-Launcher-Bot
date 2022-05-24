const Logger = require('./../Logger');

class Map {
    /**
     * @type {String}
     */
    title;
    /**
     * {String}
     */
    url;
    alias;
    emojiId;
    emojiName;
    version;
    resourcePack;
    serverConfig;

    constructor(config) {
        if (config == null) {
            console.error("config is null");
        }
        this.title = config["title"];
        this.alias = config["alias"];
        this.url = config["url"];
        this.emojiId = config["emojiId"];
        this.emojiName = config["emojiName"];
        this.version = config["version"];
        this.resourcePack = config["resourcePack"]
        this.serverConfig = config["serverConfig"];
    }
    static handle(config) {
        if (config == null) return;
        let title = config["title"];
        let alias = config["alias"];
        let url = config["url"];
        let emojiId = config["emojiId"];
        let emojiName = config["emojiName"];
        let version = config["version"];
        if (!(title && alias && url && (emojiId || emojiName) && version)) {
            if (!title) return;
            if (!alias) Logger.warn(`Alias is not provided for "${title}" in maps.json`);
            if (!url) Logger.warn(`Url is not provided for "${title}" in maps.json`);
            if (!emojiId && !emojiName) Logger.warn(`EmojiId or EmojiName is not provided for "${title}" in maps.json`);
            if (!version) Logger.warn(`Version is not provided for "${title}" in maps.json`);
            return null;
        }
        return new Map(config);
    }

}
module.exports = Map;