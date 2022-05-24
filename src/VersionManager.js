const https = require("https");
const {MessageSelectMenu} = require("discord.js");
const ServerManager = require("./ServerManager");
const miniget = require('miniget');
const fs = require('fs');
const SharedConstants = require("./SharedConstants");
const Logger = require("./Logger");

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
        this.loadManifest(VersionManager.VANILLA_VERSION_MANIFEST).catch(e => {
            Logger.fatal("Something went wrong while load version manifest (Mojang servers is down?): " + e)
        });
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
    async selectVersion(versionId) {
        if (versionId === "latest") {
            versionId = await this.getLatestRelease();
        }
        this.selectedVersion = this.findVersion(versionId);
        return this.selectedVersion;
    }
    async getLatestRelease() {
        return (await this.serverManager.core.getReleases())[0];
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
    async hasLog4JFixFile() {
        let versionType = this.selectedVersion["type"];
        let version = this.selectedVersion["id"];
        if (versionType === "snapshot") {
            let releaseTime = new Date(this.selectedVersion["releaseTime"]);
            if (releaseTime <= new Date("2021-12-10T08:23:00+00:00")) {
                await this.serverManager.stopServer();
                await this.serverManager.messageWorker.sendLogMessage("This version have Vulnerability see https://help.minecraft.net/hc/en-us/articles/4416199399693-Security-Vulnerability-in-Minecraft-Java-Edition");
            }//Before Release 1.18.1;
            return false;
        } else if (versionType === "release") {
            let versionSplit = version.split(".");
            let minor = versionSplit[1];
            let file;
            if (parseInt(minor) >= 7 && parseInt(minor) <= 11) {
                file = await miniget("https://launcher.mojang.com/v1/objects/4bb89a97a66f350bc9f73b3ca8509632682aea2e/log4j2_17-111.xml").text();
            }
            if (parseInt(minor) >= 12 && parseInt(minor) <= 16) {
                file = await miniget("https://launcher.mojang.com/v1/objects/02937d122c86ce73319ef9975b58896fc1b491d1/log4j2_112-116.xml").text();
            }
            if (file) fs.writeFileSync(SharedConstants.serverFolder + "/log4j_conf.xml", file);
            return !!file;
        }
        return false;
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