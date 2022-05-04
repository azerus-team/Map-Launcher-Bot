const VersionManager = require("./VersionManager.js");
const https = require("https");
const http = require("http");
const Discord = require("discord.js");

const MapManager = require("./MapManager");
const { zip } = require("zip-a-folder");
const { spawn, spawnSync } = require("child_process");
const unzipper = require("unzipper");
const githubManager = require("./GitHubReleaseDownloader");
const MessageWorker = require("./MessageWorker");

const VanillaCore = require("./cores/VanillaCore");
const PaperCore = require("./cores/PaperCore");
const FabricCore = require("./cores/FabricCore");

const SharedConstants = require('./SharedConstants');
const config = require("./config/ConfigProperties");
const fs = require("fs");
const {TextChannel, Snowflake, SelectMenuInteraction, ButtonInteraction} = require("discord.js");
const zlib = require("zlib");
const { parse } = require('prismarine-nbt')
const Logger = require('./Logger');

class ServerManager {
    static numericEmojis = ["0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"]
    resourcePackLink = null;
    /**
     * @type {Discord.Message}
     */
    resourcePackMessage;
    version = null;
    /**
     *
     * @type {number}
     */
    idleTime = 0;
    /**
     *
     * @type {String[]}
     */
    players = [];
    /**
     * @type {import("child_process").ChildProcessWithoutNullStreams}
     */
    serverProcess;
    state = "WAITING"
    /**
     *
     * @type {boolean}
     */
    isCustomMap = true
    /**
     * @type {MapManager}
     */
    mapManager = new MapManager();
    /**
     * @type {VersionManager}
     */
    vManager = new VersionManager(this);
    /**
     * @type {Discord.Message}
     */
    //mainMessage;
    /**
     * @type {Discord.Message}
     */
    //logMessage;
    /**
     *
     * @type {Discord.User}
     */
    initiator;
    /**
     * @type {MessageWorker}
     */
    messageWorker;
    /**
     * @type {Core}
     */
    core;
    config = config.handle();
    /**
     *
     * @param {Discord.Client} client
     * @param {VersionManager} vManager
     */

    constructor(client) {
        this.messageWorker = new MessageWorker(client, this.mapManager, this);
        if (!fs.existsSync(SharedConstants.jarsFolder)) {
            fs.mkdirSync(SharedConstants.jarsFolder);
        }
        if (!fs.existsSync(SharedConstants.serverFolder)) {
            fs.mkdirSync(SharedConstants.serverFolder);
        }
        switch (this.config.core) {
            case "PAPER":
                this.core = new PaperCore(this);
                break;
            case "FABRIC":
                this.core = new FabricCore(this);
                break;
            default:
                this.core = new VanillaCore(this);
                break;
        }
    }
    async stopServer() {
        this.state = "WAITING";
        this.players = [];
        if (this.resourcePackMessage != null) {
            await this.resourcePackMessage.delete();
        }
        this.resourcePackMessage = null;
        await this.messageWorker.sendMainMessage();
    }
    async onTick() {
        if (this.state === "HOSTING" && this.players.length === 0) {
            this.idleTime++;
            if (this.idleTime > 20 * 60 * 10) { //10 minutes
                this.serverProcess.kill("SIGKILL");
            }
        } else if (this.state === "V_SELECTION") {
            this.idleTime++;
            if (this.idleTime > 20 * 60 * 3) { // 3 minutes
                await this.stopServer();
            }
        } else if (this.state === "RP_SELECTION") {
            this.idleTime++;
            if (this.idleTime > 20 * 60 * 3) { // 3 minutes
                await this.stopServer()
            }
        } else {
            this.idleTime = 0;
        }
    }
    async downloadJarIfNotExist() {
        this.core.install()
            .then(_ => {

            })
            .catch(err => {
                this.messageWorker.sendMainMessage("Unable to download server with provided version.");
            });
    }
    setResourcePack(link) {
        this.resourcePackLink = link;
    }
    createServerProperties() {
        fs.writeFileSync(SharedConstants.serverFolder + "/server.properties",
            `server-port=${this.config.serverPort}\n` +
            `spawn-protection=0\n` +
            `gamemode=survival\n` +
            `resource-pack=${this.resourcePackLink ?? ""}\n` +
            `enable-command-block=true\n` +
            `max-players=${this.config.maxPlayers}\n` +
            `online-mode=${this.config.onlineMode}\n` +
            `op-permission-level=2\n` +
            `allow-flight=true\n` +
            `player-idle-timeout=15\n` +
            `motd=${this.config.motd(this.initiator.username)}` , "utf8");
        fs.writeFileSync(SharedConstants.serverFolder + "/eula.txt", "eula=" + this.config.eula);
    }
    /**
     *
     * @param {String} link
     * @returns {Promise<null>}
     */
    downloadWorldZip(link) {
        fs.rmSync("./server/world",{recursive:true, force: true});
        fs.rmSync("./server/logs",{recursive:true, force: true});
        fs.rmSync("./server/tempWorld",{recursive:true, force: true});
        fs.rmSync("./server/tempWorld.zip",{recursive:true, force: true})
        return new Promise((resolve, reject) => {
            https.get(link, res => {
                let writeStream = fs.createWriteStream("./server/tempWorld.zip");
                res.pipe(writeStream);
                res.on("end",  resolve);
                res.on("error", async err => {
                    console.error(err);
                    await this.messageWorker.sendLogMessage("I can't download map using this link!");
                    reject();
                });
            });
        });
    }
    /**
     *
     * @returns {VersionManager}
     */
    getVersionManager() {
        return this.vManager;
    }
    unpackWorld() {
        return new Promise((resolve, reject) => {
            fs.createReadStream('./server/tempWorld.zip')
                .pipe(unzipper.Extract({ path: './server/tempWorld' }))
                .on("close", () => {
                    let files = fs.readdirSync("./server/tempWorld/");
                    if (files.length > 1){
                        reject("Archive have more than one folder inside!");
                    }
                    let file = files[0];
                    fs.renameSync("./server/tempWorld/" + file,"./server/world");
                    resolve();
                })
                .on("error", async (err) => {
                    await this.messageWorker.sendLogMessage("The archive is corrupted or not available!");
                    reject("Bad Archive");
                });
        });
    }
    async selectVersion(version) {
        this.version = version;
        this.state = ServerManager.States.DOWNLOADING_VERSION;
        let versionData = this.vManager.selectVersion(version);
        if (versionData == null) {
            await this.messageWorker.sendLogMessage(`Version "${version}" does not exist or invalid version id!`);
            return;
        }
        //console.log(`Download JAR file for ${this.vManager.selectedVersion["type"]} ${this.version}`);
        if (this.isCustomMap) {
            await this.messageWorker.sendMainMessage("Select one of version below OR write special version");
        }
        let isDownloaded = await this.downloadJarIfNotExist();
        this.state = "RP_SELECTION";
        if (isDownloaded) {
            await this.messageWorker.sendLogMessage("Server is downloaded!");
        } else {
            await this.messageWorker.sendLogMessage("Server already downloaded!");
        }
        if (!this.isCustomMap) {
            let resourcePack = this.mapManager.selectedMap.resourcePack;
            this.setResourcePack(resourcePack)
            await this.startServer()
            return;
        }
        if (this.isCustomMap) {
            await this.messageWorker.sendMainMessage("Send resource pack or click ❌ reaction");
        }
    }
    /**
     *
     * @param {Discord.Message} message
     */
    async onMessageReceive(message) {
        if (this.initiator != null && message.author !== this.initiator) {
            await message.delete();
            return;
        }
        switch (this.state) {
            case "WAITING":
                let url = "";
                this.state = ServerManager.States.DOWNLOADING_WORLD;
                if (message.attachments == null || message.attachments.size !== 1) {
                    let writeUrl = message.content;
                    url = new URL(writeUrl);

                    let matchUrl = writeUrl.match(/^https:\/\/.*$/);
                    if (!matchUrl) {
                        await this.messageWorker.sendLogMessage("Send your zip map file, or link for downloading map using https protocol!")
                        return;
                    }
                    url = writeUrl;
                    await message.delete();
                } else {
                    let attachments = message.attachments.first();
                    url = attachments.url;
                }
                if (url.match(/^https:\/\/.*\.zip.*$/)) {
                    await this.messageWorker.sendLogMessage("Please wait your world is downloading!");
                    await this.messageWorker.sendMainMessage("Downloading...")
                    await this.downloadWorldZip(url);
                    if (!message.deleted) {
                        await message.delete();
                    }
                    try {
                        await this.unpackWorld();
                    } catch (e) {
                        await this.stopServer();
                        return;
                    }
                    let data;
                    let version = null;
                    try {
                        data = fs.readFileSync("./server/world/level.dat");
                        const { parsed } = await parse(data)
                        version = parsed?.value?.["Data"]?.value["Version"]?.value["Name"]?.value;
                    } catch (e) {
                    }
                    this.isCustomMap = true;
                    this.initiator = message.author;
                    if (version === this.getVersionManager().getLatestRelease() ||
                        version === this.getVersionManager().getLatestSnapshot()) {
                        await this.messageWorker.sendLogMessage(`Latest version ${version} auto detected from level.dat file!`);
                        await this.selectVersion(version);
                    } else {
                        this.state = "V_SELECTION";
                        await this.messageWorker.sendMainMessage(`Map is loaded in ${version} which is not latest or unusual. Select version or write that you need!`);
                    }
                } else {
                    try {
                        await message.delete();
                    } catch (e) {

                    }
                    await this.messageWorker.sendLogMessage("You need send a map in ZIP format");
                    return;
                }
                break;
            case "V_SELECTION":
                let version = message.content;
                await message.delete();
                await this.selectVersion(version);
                break;
            case "RP_SELECTION":
                if (message.attachments == null || message.attachments.size !== 1) {
                    await this.messageWorker.sendLogMessage("You need send message with Attachment in ZIP format");
                    this.resourcePackMessage = message;
                    this.setResourcePack(message.content);
                    await this.startServer()
                    return;
                }
                this.resourcePackMessage = message;
                let resPack = message.attachments.first();
                let rpUrl = resPack.url;
                this.setResourcePack(rpUrl);
                await this.startServer();
                break;
        }
    }
    /**
     *
     * @param {Discord.MessageComponentInteraction}interaction
     * @returns {Promise<void>}
     */
    async onInteraction(interaction) {
        switch (this.state) {
            case "WAITING":
                if (!(interaction instanceof SelectMenuInteraction)) return;
                let alias = interaction.values[0];
                try {
                    await interaction.update({fetchReply: false, ...this.messageWorker.buildMainMessage()});
                } catch (e) {}

                this.state = ServerManager.States.DOWNLOADING_WORLD;
                await this.messageWorker.sendMainMessage("Preparing map...");
                let mapFromEmoji = this.mapManager.getMapFromAlias(alias);
                if (mapFromEmoji == null) {
                    console.error("Map from emoji is null!");
                    return;
                }
                this.initiator = interaction.member.user;
                this.isCustomMap = false;
                await this.downloadWorldZip(mapFromEmoji.url);
                try {
                    await this.unpackWorld();
                } catch (e) {
                    await this.stopServer();
                    return;
                }
                if (mapFromEmoji.resourcePack) {
                    await this.setResourcePack(mapFromEmoji.resourcePack)
                } else {
                    await this.setResourcePack(null);
                }
                await this.selectVersion(mapFromEmoji.version)
                // await this.messageWorker.sendMainMessage();
                // this.state = "STARTING";
                // await this.mainMessage.edit(ServerManager.basicMessageCreator("🔵 Selecting version", mes, this.initiator, messageComponent));
                break;
            case "V_SELECTION":
                if (!(interaction instanceof SelectMenuInteraction)) return;
                if (interaction.member.user !== this.initiator) return;
                interaction.update({fetchReply: true});
                await this.selectVersion(interaction.values[0])
                break;
            case "RP_SELECTION":
                if (!(interaction instanceof ButtonInteraction)) return;
                if (interaction.member.user !== this.initiator) return;
                if (interaction.customId === "no_rp") {
                    interaction.update({fetchReply: true});
                    this.setResourcePack(null);
                    await this.startServer();
                }
                break;
            case "STARTING":
                if (!(interaction instanceof ButtonInteraction)) return;
                if (interaction.member.user !== this.initiator) return;
                if (interaction.customId === "stop_server") {
                    interaction.update({fetchReply: false});
                    this.serverProcess.kill("SIGKILL");
                }
                break;
            case "HOSTING":
                if (!(interaction instanceof ButtonInteraction)) return;
                if (interaction.member.user !== this.initiator) return;
                if (interaction.customId === "stop_server") {
                    this.serverProcess.stdin.write(`kick @a ${this.initiator.username} closed the server!\n`);
                    setTimeout(() => {
                        this.serverProcess.kill("SIGKILL");
                    }, 50);
                    interaction.update({fetchReply: false});
                }
                break;
            default:
                break;
        }
    }
    async onConsoleMessage(chunk) {
        process.stdout.write(chunk.toString());
        let lines = chunk.toString().replace(/\n$/g,"");
        let line = lines.split("\n");
        for (let i = 0; i < line.length; i++) {
            let oneLine = line[i];
            let started = oneLine.match(/\[\d\d:\d\d:\d\d] \[.*\/.*]: Done \((.*)\)! For help, type "help"/);
            started = started ?? oneLine.match(/\[\d\d:\d\d:\d\d INFO]: Done \((.*)\)! For help, type "help"/);
            if (started) {
                this.state = "HOSTING";
                await this.messageWorker.sendLogMessage(`Server is started in ${started[1]}`);
                await this.messageWorker.sendMainMessage("To close server click 🛑");
            }
            let joined = oneLine.match(/\[\d\d:\d\d:\d\d] \[.*\/.*]: ([a-zA-Z_0-9]*)\[\/.*] logged in with entity id \d* at \(.*,.*,.*\)/);
            joined = joined ?? oneLine.match(/\[\d\d:\d\d:\d\d INFO]: ([a-zA-Z_0-9]*)\[\/.*] logged in with entity id \d* at \(.*,.*,.*\)/);
            if (joined) {
                let username = joined[1];
                this.players.push(username);
                console.log(this.players);
                await this.messageWorker.sendLogMessage(`${username} joined the game!`);
            }
            let left = oneLine.match(/\[\d\d:\d\d:\d\d] \[.*\/.*]: ([a-zA-Z_0-9]*) lost connection: .*/);
            left = left ?? oneLine.match(/\[\d\d:\d\d:\d\d INFO]: ([a-zA-Z_0-9]*) lost connection: .*/);
            if (left) {
                let username = left[1];
                this.players.splice(this.players.indexOf(username), 1);
                console.log(this.players);
                await this.messageWorker.sendLogMessage(`${username} left the game!`);
            }
        }
    }
    async startServer() {
        this.state = "STARTING";
        await this.messageWorker.sendMainMessage();
        await this.messageWorker.sendLogMessage("Starting server...");
        Logger.log("Server is about to start!");
        await this.createServerProperties();
        this.serverProcess = await this.core.createServerProcess();
        this.serverProcess.stdout.on("data", chunk => {
            this.onConsoleMessage(chunk);
        });
        process.stdin.pipe(this.serverProcess.stdin);
        this.serverProcess.stderr.on("data", (chunk => {
            process.stderr.write(chunk);
        }));
        this.serverProcess.on("error", console.error);
        this.serverProcess.on("exit",async (code, signal) => {
            //PROCESS CRASHED OR STOPPED;
            console.log("Server is stopped! " + signal + " (" + code + ")");
            await zip("./server/world/", "./world.zip");
            this.initiator = null;
            if (config.generateDownloadLink) {
                await spawn('curl', ["--upload-file", "./world.zip", "https://transfer.sh/world.zip"], {cwd: "./"}).stdout.on("data", chunk => {
                    this.messageWorker.sendLogMessage("Server is closed!");
                    this.state = ServerManager.States.WAITING;
                    this.messageWorker.sendMainMessage("[Download link](" + chunk.toString() + ")");
                    setTimeout(() => {
                        if (this.state === "WAITING") {
                            this.messageWorker.sendMainMessage();
                        }
                    }, 20000);
                });
            }
            await this.stopServer();
        })
    }
    static States = {
        "WAITING": "WAITING",
        "DOWNLOADING_WORLD":"W_DOWNLOADING",
        "VERSION_SELECTION": "V_SELECTION",
        "DOWNLOADING_VERSION": "V_DOWNLOADING",
        "RP_SELECTION": "RP_SELECTION",
        "STARTING": "STARTING",
        "HOSTING": "HOSTING"
    }
}
module.exports = ServerManager;