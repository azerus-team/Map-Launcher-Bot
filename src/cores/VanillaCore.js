const fs = require("fs");
const Core = require('./Core');
const https = require("https");
const ServerManager = require("../ServerManager");
const {spawn} = require("child_process");
const miniget = require('miniget');
const Logger = require('./../Logger');
const SharedConstants = require("./../SharedConstants");

class VanillaCore extends Core {
    static VANILLA_VERSION_MANIFEST = "https://launchermeta.mojang.com/mc/game/version_manifest_v2.json";

    /**
     *
     * @param {ServerManager} serverManager
     */
    constructor(serverManager) {
        super(serverManager);
    }

    /**
     * @override
     * @returns {Promise<unknown>}
     */
    async install() {
        return new Promise(async (resolve, reject) => {
            if (fs.existsSync("./jars/Minecraft-" + this.serverManager.vManager.selectedVersion["id"] + ".jar")) {
                resolve(false);
                return;
            }
            await this.serverManager.messageWorker.sendLogMessage(`Downloading ${this.serverManager.vManager.selectedVersion["type"]} ${this.serverManager.vManager.selectedVersion["id"]}`);
            let downloadingLink = await this.serverManager.vManager.getDownloadingLink();
            if (downloadingLink == null) {
                reject("Link is empty");
                return;
            }
            https.get(downloadingLink, res => {
                let writeStream = fs.createWriteStream("./jars/Minecraft-" + this.serverManager.vManager.selectedVersion["id"] + ".jar");
                res.pipe(writeStream);
                res.on("close", () => {
                    resolve(true);
                })
                res.on("error", (err) => {
                    Logger.warn("Something went wrong while downloading Minecraft Vanilla: " + err);
                    reject(err);
                })
            });
        });
    }

    /**
     * @override
     * @returns {Promise<ChildProcessWithoutNullStreams>}
     */
    async createServerProcess() {
        let hasLog4JFixFile = await this.serverManager.vManager.hasLog4JFixFile();
        let args = [
            '-jar',
            '-Xmx' + this.serverManager.config.maxMemory,
            '-Xms' + this.serverManager.config.initialMemory,
            '-Dlog4j.formatMsgNoLookups=true'
        ];
        if (hasLog4JFixFile) args.push("-Dlog4j.configurationFile=log4j_conf.xml");
        args.push(`../jars/Minecraft-${this.serverManager.vManager.selectedVersion["id"]}.jar`);
        args.push('nogui');
        Logger.log("Running with args: " + args.join(", "));
        return spawn(this.serverManager.config.javaPath, args, {cwd: SharedConstants.serverFolder});
    }

    /**
     * @override
     * @returns {Promise<String[]>}
     */
    async getReleases() {
        let data = await miniget(VanillaCore.VANILLA_VERSION_MANIFEST).text();
        let manifest = JSON.parse(data);
        let mainReleases = {};
        let versions = manifest["versions"];
        for (let i = 0; i < versions.length; i++) {
            const ver = versions[i];
            if (ver["type"] !== "release") continue;
            let matches = ver["id"].match(/^(\d\.\d*)(\.\d*|)$/m);
            let mainVersion = matches[1];
            if (!mainReleases.hasOwnProperty(mainVersion)) {
                mainReleases[mainVersion] = ver["id"];
            }
            if (Object.keys(mainReleases).length >= 11) {
                break;
            }
        }
        return Object.values(mainReleases);
    }
}
module.exports = VanillaCore;