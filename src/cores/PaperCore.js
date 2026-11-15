const Core = require("./Core");
const fs = require("fs");
const https = require("https");
const miniget = require("miniget");
const { spawn, spawnSync } = require("child_process");
const Logger = require("../Logger");
const SharedConstants = require("../SharedConstants");

class PaperCore extends Core {
    static PAPER_MANIFEST = "https://fill.papermc.io/v3/projects/paper"
    static BUILDS_MANIFEST = (MINECRAFT_VERSION) => `https://fill.papermc.io/v3/projects/paper/versions/${MINECRAFT_VERSION}/builds`
    static DOWNLOAD_LINK = (MINECRAFT_VERSION, BUILD_NUMBER) => `https://fill.papermc.io/v3/projects/paper/versions/${MINECRAFT_VERSION}/builds/${BUILD_NUMBER}/downloads/paper-${MINECRAFT_VERSION}-${BUILD_NUMBER}.jar`

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
        let build = buildManifestJson[0];
        let latestBuildNumber = build['id'];

        if (!selectedVersion || !latestBuildNumber) return null;
        this.build = latestBuildNumber;
        return build['downloads']['server:default']['url']
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
        const data = await miniget(PaperCore.PAPER_MANIFEST).text();
        const manifest = JSON.parse(data);

        const mainReleases = {};

        for (const [mainVersion, releases] of Object.entries(manifest.versions)) {
            if (!releases.length) continue;

            // Skip pre-releases and release candidates
            const latest = releases.find(ver => /^\d+\.\d+(?:\.\d+)?$/.test(ver));
            if (!latest) continue;

            mainReleases[mainVersion] = latest;

            if (Object.keys(mainReleases).length >= 11) {
                break;
            }
        }

        return Object.values(mainReleases);
    }
}
module.exports = PaperCore;