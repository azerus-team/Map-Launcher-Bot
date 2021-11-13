const https = require("https");
const {MessageSelectMenu} = require("discord.js");

class VersionManager {
    static VERSION_MANIFEST = "https://launchermeta.mojang.com/mc/game/version_manifest.json";
    /**
     *
     * @type {String}
     */
    manifest = null;
    /**
     *
     * @type {JSON}
     */
    jsonManifest = null;
    selectedVersion = null;
    constructor() {
        this.loadManifest();
    }

    async loadManifest() {
        return new Promise((resolve, reject) => {
            https.get(VersionManager.VERSION_MANIFEST, res => {
                /**
                 * @type {String}
                 */
                let data = "";
                res.on("data", chunk => data += chunk.toString());
                res.on("close", () => {
                    this.manifest = data;
                    try {
                        this.jsonManifest = JSON.parse(this.manifest);
                        resolve(this.jsonManifest)
                    } catch (e) {
                        console.error("Bad Manifest");
                        reject("Bad Manifest");
                    }
                });
                res.on("error", err => {
                    reject(err);
                })
            });
        })

    }

    findVersion(version) {
        if (this.jsonManifest == null) {
            return null;
        }

        let versions = this.jsonManifest["versions"];
        for (let i = 0; i < versions.length; i++) {
            const ver = versions[i];
            if (ver["id"] === version) {
                return ver;
            }
        }
        return null;
    }
    selectVersion(versionId) {
        const selectedVersion = this.findVersion(versionId);
        this.selectedVersion = selectedVersion;
        return selectedVersion;
    }
    getReleases() {
        if (this.jsonManifest == null) {
            return null;
        }
        /**
         *
         * @type {Object}
         */
        let mainReleases = {};
        let versions = this.jsonManifest["versions"];
        for (let i = 0; i < versions.length; i++) {
            const ver = versions[i];
            if (ver["type"] !== "release") continue;
            let matches = ver["id"].match(/^(\d\.\d*)(\.\d*|)$/m);
            let mainVersion = matches[1];
            if (!mainReleases.hasOwnProperty(mainVersion)) {
                mainReleases[mainVersion] = ver;
            }
            if (Object.keys(mainReleases).length >= 11) {
                break;
            }
        }
        this.loadManifest()
            .then(r => console.log("Version Manifest is updated"))
            .catch(e => console.error("Version Manifest is not updated!"));
        return mainReleases;
    }

    /**
     * @private
     * @param {String}versionUrl
     */
    static async getVersionManifest(versionUrl) {
        return new Promise((resolve, reject) => {
            https.get(versionUrl, res => {
                /**
                 * @type {String}
                 */
                let data = "";
                res.on("data", chunk => data += chunk.toString());
                res.on("close", () => {
                    try {
                        const parsedJsonManifest = JSON.parse(data);
                        resolve(parsedJsonManifest);
                    } catch (e) {
                        reject("Bad Manifest");
                    }
                });
                res.on("error", err => {
                    reject(err);
                })
            });
        })

    }

    /**
     *
     * @param {String} versionUrl
     * @returns {String|null}
     */
    async getDownloadingLink() {
        const versionUrl = this.selectedVersion["url"];
        const versionManifest = await VersionManager.getVersionManifest(versionUrl);
        if (versionManifest == null) {
            return null;
        }
        return versionManifest["downloads"]["server"]["url"];
    }

    /**
     *
     * @returns {MessageSelectMenu}
     */
    getMessageComponent() {
        const releases = this.getReleases();
        const versions = Object.values(releases);
        let versionSelection = new MessageSelectMenu()
            .setMinValues(1)
            .setMaxValues(1)
            .setPlaceholder("Select version")
            .setCustomId("v_select")
        for (let i = 0; i < versions.length; i++) {
            versionSelection.addOptions({
                "label": versions[i]['id'],
                "description": versions[i]['type'],
                "value": versions[i]['id']
            });
        }
        return versionSelection;
    }
}

module.exports = VersionManager;