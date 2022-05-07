const Core = require("./Core");
const fs = require("fs");
const https = require("https");
const miniget = require("miniget");
const { spawn, spawnSync } = require("child_process");
const Logger = require("../Logger");
const SharedConstants = require("../SharedConstants");

class PaperCore extends Core {
    static PAPER_MANIFEST = "https://papermc.io/api/v2/projects/paper"
    static BUILDS_MANIFEST = (MINECRAFT_VERSION) => `https://papermc.io/api/v2/projects/paper/versions/${MINECRAFT_VERSION}`
    static DOWNLOAD_LINK = (MINECRAFT_VERSION, BUILD_NUMBER) => `https://papermc.io/api/v2/projects/paper/versions/${MINECRAFT_VERSION}/builds/${BUILD_NUMBER}/downloads/paper-${MINECRAFT_VERSION}-${BUILD_NUMBER}.jar`

    build;

    constructor(serverManager) {
        super(serverManager);
    }
    /**
     * @override
     */

    async install() {
        return new Promise(async (resolve, reject) => {
            let downloadingLink = await this.getDownloadLink();
            if (downloadingLink == null) {
                reject("Link is empty");
                return;
            }
            if (fs.existsSync("./jars/Paper-" + this.serverManager.vManager.selectedVersion["id"] + "-" + this.build + ".jar")) {
                resolve(false);
                return;
            }
            await this.serverManager.messageWorker.sendLogMessage(`Downloading ${this.serverManager.vManager.selectedVersion["id"]}`);
            let paper = fs.createWriteStream("./jars/Paper-" + this.serverManager.vManager.selectedVersion["id"] + "-" + this.build + ".jar");
            let minigetStream = miniget(downloadingLink);
            minigetStream.pipe(paper);
            paper.on("close", () => {
                resolve(true);
            })
            paper.on("error", (err) => {
                console.error(err);
                reject(err);
            })
        });
    }

    /**
     * @private
     * @returns {Promise<*>}
     */
    async getDownloadLink() {
        let selectedVersion = this.serverManager.vManager.selectedVersion["id"];
        let buildManifest = await (miniget(PaperCore.BUILDS_MANIFEST(selectedVersion)).text());
        let buildManifestJson = JSON.parse(buildManifest);
        if (buildManifestJson["error"]) {
            Logger.warn("Something went wrong while earning download link! Err: " + buildManifestJson["error"])
            return;
        }
        let builds = buildManifestJson["builds"];
        let latestBuildNumber = builds[builds.length - 1];
        if (!selectedVersion || !latestBuildNumber) return null;
        this.build = latestBuildNumber;
        return PaperCore.DOWNLOAD_LINK(selectedVersion, latestBuildNumber);
    }

    /**
     * @override
     * @returns {Promise<ChildProcessWithoutNullStreams>}
     */
    async createServerProcess() {
        let args = ['-jar',
            '-Xmx' + this.serverManager.config.maxMemory,
            '-Xms' + this.serverManager.config.initialMemory,
            `.${SharedConstants.jarsFolder}/Paper-${this.serverManager.vManager.selectedVersion["id"]}-${this.build}.jar`,
            "nogui"
        ];
        Logger.log("Running with args: " + args.join(", "));
        return spawn(this.serverManager.config.javaPath, args, {cwd: SharedConstants.serverFolder + '/'});
    }
    async getReleases() {
        //https://papermc.io/api/v2/projects/paper
        let data = await miniget(PaperCore.PAPER_MANIFEST).text();
        let manifest = JSON.parse(data);
        let mainReleases = {};
        let versions = manifest["versions"].reverse();
        for (let i = 0; i < versions.length; i++) {
            const ver = versions[i];
            let matches = ver.match(/^(\d\.\d*)(\.\d*|)$/m);
            if (!matches) continue;
            let mainVersion = matches[1];
            if (!mainReleases.hasOwnProperty(mainVersion)) {
                mainReleases[mainVersion] = ver;
            }
            if (Object.keys(mainReleases).length >= 11) {
                break;
            }
        }
        return Object.values(mainReleases);
    }
}
module.exports = PaperCore;