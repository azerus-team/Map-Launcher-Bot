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
            this.maps.push(new Map(map));
        }
    }

    /**
     *
     * @param {GuildEmoji | ReactionEmoji} emoji
     * @returns {Map|null}
     */
    getMapFromEmoji(emoji) {
        for (let i = 0; i < this.maps.length; i++) {
            console.log(emoji.id);
            console.log(this.maps[i].emoji);
            if (this.maps[i].emojiId === emoji.id) {
                this.selectedMap = this.maps[i];
                return this.selectedMap;
            }
        }
        return null;
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
            .addOptions(this.maps.reverse().map(value => {
                   return {
                       "label": value.title,
                       "value": value.alias,
                       "emoji": {
                           "id": value.emojiId
                       }
                   }
                }));
    }
    /**
     *
     * @returns {Discord.MessageActionRow}
     */
    getMapComponents() {

        return [
            {
                "type": 1,
                "components": [
                    {
                        "type": 3,
                        "custom_id": "map_select",
                        "options":[
                            {
                                "label": "Feed the Ravager",
                                "value": "fr",
                                "emoji": {
                                    "name": "ftr",
                                    "id": "905308184711929857"
                                }
                            },
                            {
                                "label": "Dodgearrow",
                                "value": "da",
                                "emoji": {
                                    "name": "da",
                                    "id": "841655094331703376"
                                }
                            },
                            {
                                "label": "Wings Wars",
                                "value": "ww",
                                "emoji": {
                                    "name": "ww",
                                    "id": "818159624267104266"
                                }
                            },
                            {
                                "label": "Block Combat",
                                "value": "bc",
                                "emoji": {
                                    "name": "bc",
                                    "id": "818159524468883466"
                                }
                            },
                            {
                                "label": "Math Fractals",
                                "value": "mf",
                                "emoji": {
                                    "name": "mf",
                                    "id": "818159235245277194"
                                }
                            },
                            {
                                "label": "Maze Wars",
                                "value": "mw",
                                "emoji": {
                                    "name": "mw",
                                    "id": "595267046049185822"
                                }
                            },
                            {
                                "label": "Puzzle Wars",
                                "value": "pw",
                                "emoji": {
                                    "name": "pw",
                                    "id": "529361621022277635"
                                }
                            }
                        ],
                        "placeholder": "Select map",
                        "min_values": 1,
                        "max_values": 1
                    }
                ]
            }
        ];
    }
}
module.exports = MapManager;