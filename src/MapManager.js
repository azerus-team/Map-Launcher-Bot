const Discord = require("discord.js");
const fs = require("fs");
const Map = require("./model/Map");
const {MessageSelectMenu} = require("discord.js");
const Logger = require('./Logger');
const SharedConstants = require('./SharedConstants');

class MapManager {
    /**
     *
     * @type {Map[]}
     */
    maps = [];
    /**
     * @type {Map}
     */
    selectedMap;
    constructor() {
        let maps = [];
        try {
            let mapsFile = fs.readFileSync(SharedConstants.MapsFile);
            maps = JSON.parse(mapsFile.toString());
        } catch (e) {
            Logger.warn("Unable to parse maps.json!");
        }
        for (let map of maps) {
            let handledMap = Map.handle(map);
            if (handledMap == null) continue;
            this.maps.push(new Map(map));
        }
        this.maps.reverse();
    }
    getMapFromAlias(alias) {
        for (let i = 0; i < this.maps.length; i++) {
            if (this.maps[i].alias === alias) {
                this.selectedMap = this.maps[i];
                return this.selectedMap;
            }
        }
        return null;
    }
    /**
     *
     * @returns {MessageSelectMenu|null}
     */
    buildMapSelector() {
        if (this.maps.length === 0) return null
        return new MessageSelectMenu()
            .setMaxValues(1)
            .setMinValues(1)
            .setCustomId("map_select")
            .setPlaceholder("Select map")
            .addOptions(this.maps.map(value => {
                   return {
                       "label": value.title,
                       "value": value.alias,
                       "emoji": {
                           "id": value.emojiId,
                           "name": value.emojiName
                       }
                   }
                }));
    }
}
module.exports = MapManager;