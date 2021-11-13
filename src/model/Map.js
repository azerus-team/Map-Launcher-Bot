const Repo = require("./Repo");

class Map {
    /**
     * @type {String}
     */
    title;
    /**
     * @Deprecated
     * @type {Repo}
     */
    repo;
    /**
     * {String}
     */
    url;
    alias;
    emojiId;
    version;
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
        this.discordEmoji = config["discordEmoji"];
        this.resourcePack = config["resourcePack"]
    }

}
module.exports = Map;