
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
    version;
    /**
     * @deprecated
     */
    discordEmoji;
    resourcePack;

    
    constructor(config) {
        if (config == null) {
            console.error("config is null");
        }
        this.title = config["title"];
        this.alias = config["alias"];
        this.url = config["url"];
        this.emojiId = config["emojiId"];
        this.version = config["version"];
        this.resourcePack = config["resourcePack"]
    }
    static handle(config) {
        if (config == null) return;
        let title = config["title"];
        let alias = config["alias"];
        let url = config["url"];
        let emojiId = config["emojiId"];
        let version = config["version"];
        let resourcePack = config["resourcePack"]
        if (!(title && alias && url && emojiId && version && resourcePack)) return;
        return new Map(config);
    }

}
module.exports = Map;