const Core = require("./Core");
const fs = require("fs");
const https = require("https");
const miniget = require("miniget");
const { spawn, spawnSync } = require("child_process");
const config = require("../../Config");

class PaperCore extends Core {
    static PAPER_MANIFEST = "https://papermc.io/api/v2/projects/paper"
    static BUILDS_MANIFEST = (MINECRAFT_VERSION) => `https://papermc.io/api/v2/projects/paper/versions/${MINECRAFT_VERSION}`
    static DOWNLOAD_LINK = (MINECRAFT_VERSION, BUILD_NUMBER) => `https://papermc.io/api/v2/projects/paper/versions/${MINECRAFT_VERSION}/builds/${BUILD_NUMBER}/downloads/paper-${MINECRAFT_VERSION}-${BUILD_NUMBER}.jar`

    constructor(serverManager) {
        super(serverManager);
    }
    /**
     * @override
     */

    async install() {
        return new Promise(async (resolve, reject) => {
            if (fs.existsSync("./jars/Paper-" + this.serverManager.vManager.selectedVersion["id"] + ".jar")) {
                resolve(false);
                return;
            }
            await this.serverManager.messageWorker.sendLogMessage(`Downloading ${this.serverManager.vManager.selectedVersion["id"]}`);
            let downloadingLink = await this.getDownloadLink();
            console.log(downloadingLink);
            //let downloadingLink = await this.serverManager.vManager.getDownloadingLink();
            if (downloadingLink == null) {
                reject("Link is empty");
                return;
            }
            let paper = fs.createWriteStream("./jars/Paper-" + this.serverManager.vManager.selectedVersion["id"] + ".jar");
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
        let buildManifest = await miniget(PaperCore.BUILDS_MANIFEST(selectedVersion)).text();
        let buildManifestJson = JSON.parse(buildManifest);
        if (buildManifestJson["error"]) return null
        let builds = buildManifestJson["builds"];
        let latestBuildNumber = builds[builds.length - 1];
        if (selectedVersion || latestBuildNumber) return null;
        return PaperCore.DOWNLOAD_LINK(selectedVersion, latestBuildNumber);
    }

    /**
     * @override
     * @returns {Promise<ChildProcessWithoutNullStreams>}
     */
    async createServerProcess() {
        return spawn('java', ['-jar', '-Xmx' + config.maxMemory, '-Xms' + config.initialMemory, '../jars/' + `Paper-${this.serverManager.vManager.selectedVersion["id"]}.jar`, 'nogui', '-Dlog4j2.formatMsgNoLookups=true', `${hasLog4JFixFile?"-Dlog4j.configurationFile=log4j_conf.xml":""}`], {cwd: "./server/"});
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