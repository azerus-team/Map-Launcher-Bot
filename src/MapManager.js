const Discord = require("discord.js");
const fs = require("fs");
const Map = require("./model/Map");
const {MessageSelectMenu} = require("discord.js");

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
            let mapsFile = fs.readFileSync("maps.json");
            maps = JSON.parse(mapsFile.toString());
        } catch (e) {
            console.error("Unable to parse maps.json!")
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
     * @returns {MessageSelectMenu}
     */
    buildMapSelector() {
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
                           "id": value.emojiId
                       }
                   }
                }));
    }
}
module.exports = MapManager;