const https = require("https");
const {MessageSelectMenu} = require("discord.js");
const ServerManager = require("./ServerManager");

class VersionManager {

    static VANILLA_VERSION_MANIFEST = "https://launchermeta.mojang.com/mc/game/version_manifest_v2.json";
    static FABRIC_INSTALLER_MANIFEST = "https://meta.fabricmc.net/v2/versions/installer";

    static ManifestList = [VersionManager.VANILLA_VERSION_MANIFEST, VersionManager.FABRIC_INSTALLER_MANIFEST];
    /**
     *
     * @type {String}
     */
    vaniila_manifest = null;
    /**
     * @type {ServerManager}
     */
    serverManager;
    /**
     *
     * @type {JSON}
     */
    jsonVanillaManifest = null;
    selectedVersion = null;
    constructor(serverManager) {
        this.serverManager = serverManager;
        this.loadManifest(VersionManager.VANILLA_VERSION_MANIFEST);
    }

    async loadManifest(link) {
        return new Promise((resolve, reject) => {
            https.get(link, res => {
                /**
                 * @type {String}
                 */
                let data = "";
                res.on("data", chunk => data += chunk.toString());
                res.on("close", () => {
                    this.vaniila_manifest = data;
                    try {
                        this.jsonVanillaManifest = JSON.parse(this.vaniila_manifest);
                        resolve(this.jsonVanillaManifest)
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
        if (this.jsonVanillaManifest == null) {
            return null;
        }

        let versions = this.jsonVanillaManifest["versions"];
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
        if (this.jsonVanillaManifest == null) {
            return null;
        }
        /**
         *
         * @type {Object}
         */
        let mainReleases = {};
        let versions = this.jsonVanillaManifest["versions"];
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
    getLatestRelease() {
        return this?.jsonVanillaManifest?.["latest"]?.["release"];
    }
    getLatestSnapshot() {
        return this?.jsonVanillaManifest?.["latest"]?.["snapshot"];
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
    async getMessageComponent() {
        const versions = await this.serverManager.core.getReleases();
        let versionSelection = new MessageSelectMenu()
            .setMinValues(1)
            .setMaxValues(1)
            .setPlaceholder("Select version")
            .setCustomId("v_select")
        for (let i = 0; i < versions.length; i++) {
            versionSelection.addOptions({
                "label": versions[i],
                "description": "release",
                "value": versions[i]
            });
        }
        return versionSelection;
    }


}

module.exports = VersionManager;