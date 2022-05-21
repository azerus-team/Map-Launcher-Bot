const Core = require("./Core");
const fs = require("fs");
const miniget = require("miniget");
const { spawn, spawnSync } = require("child_process");
const Logger = require("../Logger");
const SharedConstants = require("../SharedConstants");

class FabricCore extends Core {
    static FABRIC_LAUNCHER_MANIFEST = "https://meta.fabricmc.net/v2/versions/installer"
    static FABRIC_GAME_MANIFEST = "https://meta.fabricmc.net/v2/versions/game"

    constructor(serverManager) {
        super(serverManager);
    }
    /**
     * @override
     */

    async install() {
        return new Promise(async (resolve, reject) => {
            if (fs.existsSync("./jars/Fabric-Launcher-" + this.serverManager.vManager.selectedVersion["id"] + ".jar")) {
                resolve(false);
                return;
            }
            await this.serverManager.messageWorker.sendLogMessage(`Downloading ${this.serverManager.vManager.selectedVersion["type"]} ${this.serverManager.vManager.selectedVersion["id"]}`);
            let downloadingLink = await this.getFabricLauncherDownloadingLink();
            //let downloadingLink = await this.serverManager.vManager.getDownloadingLink();
            if (downloadingLink == null) {
                reject("Link is empty");
                return;
            }
            let fabricLauncher = fs.createWriteStream("./jars/Fabric-Launcher-" + this.serverManager.vManager.selectedVersion["id"] + ".jar");
            let minigetStream = miniget(downloadingLink);
            minigetStream.pipe(fabricLauncher);
            fabricLauncher.on("close", () => {
                this.runFabricInstaller();
                resolve(true);
            })
            fabricLauncher.on("error", (err) => {
                console.error(err);
                reject(err);
            })
        });
    }

    /**
     * @private
     * @returns {Promise<*>}
     */
    async getFabricLauncherDownloadingLink() {
        let manifest = await miniget(FabricCore.FABRIC_LAUNCHER_MANIFEST).text();
        let jsonManifest = JSON.parse(manifest);
        let stableLauncherId = jsonManifest.find(x => x["stable"]);
        return stableLauncherId?.["url"];
    }
    async runFabricInstaller() {
        //java -jar ../jars/Fabric-Launcher-1.17.1.jar server -mcversion 1.18.1 -downloadMinecraft
        let out = await spawnSync(this.serverManager.config.javaPath, ["-jar", '../jars/' + `Fabric-Launcher-${this.serverManager.vManager.selectedVersion["id"]}.jar`, "server", "-mcversion", this.serverManager.vManager.selectedVersion["id"], "-downloadMinecraft"]
            , {cwd: "./server/"}
        );
        process.stdout.write(out);
    }

    /**
     * @override
     * @returns {Promise<ChildProcessWithoutNullStreams>}
     */
    async createServerProcess() {
        let hasLog4JFixFile = await this.serverManager.vManager.hasLog4JFixFile();
        let args = ['-jar',
            '-Xmx' + this.serverManager.config.maxMemory,
            '-Xms' + this.serverManager.config.initialMemory,
            '-Dlog4j.formatMsgNoLookups=true',
            `fabric-server-launch.jar`,
            'nogui'];
        if (hasLog4JFixFile) args.push("-Dlog4j.configurationFile=log4j_conf.xml")
        Logger.log("Running with args: " + args.join(", "));
        return spawn(this.serverManager.config.javaPath, args, {cwd: SharedConstants.serverFolder});
    }
    /**
     *
     * @returns {Promise<unknown[]>}
     */
    async getReleases() {
        let data = await miniget(FabricCore.FABRIC_GAME_MANIFEST).text();
        let manifest = JSON.parse(data);
        let mainReleases = {};
        let versions = manifest;
        for (let i = 0; i < versions.length; i++) {
            const ver = versions[i];
            if (!ver["stable"]) continue;
            let matches = ver["version"].match(/^(\d\.\d*)(\.\d*|)$/m);
            let mainVersion = matches[1];
            if (!mainReleases.hasOwnProperty(mainVersion)) {
                mainReleases[mainVersion] = ver["version"];
            }
            if (Object.keys(mainReleases).length >= 11) {
                break;
            }
        }
        return Object.values(mainReleases);
    }
}
module.exports = FabricCore;