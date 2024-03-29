const VersionManager = require("./VersionManager.js");
const Discord = require("discord.js");
const miniget = require("miniget");
const path = require("path");
const { zip } = require("zip-a-folder");
const { spawn } = require("child_process");
const unzipper = require("unzipper");
const YAML = require("yaml");

const MapManager = require("./MapManager");
const MessageWorker = require("./MessageWorker");

const VanillaCore = require("./cores/VanillaCore");
const PaperCore = require("./cores/PaperCore");
const FabricCore = require("./cores/FabricCore");

const SharedConstants = require('./SharedConstants');
const config = require("./config/ConfigProperties");
const fs = require("fs");
const {SelectMenuInteraction, ButtonInteraction, StringSelectMenuInteraction, PermissionsBitField} = require("discord.js");
const { parse } = require('prismarine-nbt')
const Logger = require('./Logger');
const { I18n } = require("i18n");


class ServerManager {
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
    /**
     *
     * @type {ConfigProperties}
     */
    config = config.handle();
    /**
     * @type {I18n}
     */
    constructor(client) {
        if (!client.isReady()) return;
        this.messageWorker = new MessageWorker(client, this.mapManager, this);
        console.log(this.messageWorker.i18n.__("test.key"));
        this.createFolder(SharedConstants.jarsFolder);
        this.createFolder(SharedConstants.serverFolder);
        this.createFolder(SharedConstants.mapsFolder);
        this.createFolder(SharedConstants.logsFolder);
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

    createFolder(path) {
        if (!fs.existsSync(path)) fs.mkdirSync(path);
    }

    stopServer() {
        this.state = ServerManager.States.WAITING;
        this.players = [];
        if (this.resourcePackMessage != null) {
            this.resourcePackMessage.delete().catch(e => {
                Logger.warn("Unable to delete Message with Resourcepack attachment. Missing permission? " + e);
            });
        }
        this.resourcePackMessage = null;
        this.vManager.selectedVersion = null;
        this.messageWorker.sendMainMessage();
    }
    onTick() {
        if (this.state === "HOSTING" && this.players.length === 0) {
            this.idleTime++;
            if (this.idleTime > 20 * 60 * this.config.idleTime) { //10 minutes by Default
                this.serverProcess.kill("SIGKILL");
            }
        } else if (this.state === "V_SELECTION") {
            this.idleTime++;
            if (this.idleTime > 20 * 60 * 3) { // 3 minutes
                this.stopServer()
            }
        } else if (this.state === "RP_SELECTION") {
            this.idleTime++;
            if (this.idleTime > 20 * 60 * 3) { // 3 minutes
                this.stopServer()
            }
        } else {
            this.idleTime = 0;
        }
    }
    async downloadJarIfNotExist() {
        await this.core.install()
            .catch(err => {
                this.messageWorker.sendMainMessage(this.i18n.__("error.unableDownloadVersion")); //fixme
                Logger.warn("Unable to download server with provided version. Err: " + err);
            });
    }
    setResourcePack(link) {
        this.resourcePackLink = link;
    }
    createServerProperties() {
        let defaultServerProperties = this.config.serverConfig.serverProperties || {};
        let mapServerProperties = {};
        let paperJson = {};
        let spigotJson = {};
        let bukkitJson = {};
        if (!this.isCustomMap) {
            mapServerProperties = this.mapManager.selectedMap["serverConfig"]?.["server.properties"] ?? {};
            paperJson = this.mapManager.selectedMap["serverConfig"]?.["paper.yml"] ?? {};
            spigotJson = this.mapManager.selectedMap["serverConfig"]?.["spigot.yml"] ?? {};
            bukkitJson = this.mapManager.selectedMap["serverConfig"]?.["bukkit.yml"] ?? {};
        }
        let serverProps = this.combineProps(defaultServerProperties, mapServerProperties);
        let props = "";
        for (let key in serverProps) {
            props += key + "=" + serverProps[key] + "\n";
        }
        let paperYml = new YAML.Document();
        paperYml.contents = paperJson;
        let spigotYml = new YAML.Document();
        spigotYml.contents = spigotJson;
        let bukkitYml = new YAML.Document();
        bukkitYml.contents = bukkitJson;
        fs.writeFileSync(SharedConstants.serverFolder + "/paper.yml", paperYml.toString(), "utf8");
        fs.writeFileSync(SharedConstants.serverFolder + "/spigot.yml", spigotYml.toString(), "utf8");
        fs.writeFileSync(SharedConstants.serverFolder + "/bukkit.yml", bukkitYml.toString(), "utf8");
        fs.writeFileSync(SharedConstants.serverFolder + "/server.properties", props , "utf8");
        fs.writeFileSync(SharedConstants.serverFolder + "/eula.txt", "eula=" + this.config.eula);
    }

    /**
     *
     * @param {Object} defaultProps
     * @param {Object} mapProps
     */
    combineProps(defaultProps, mapProps) {
        let hardProps = {
            "motd": `${this.config.motd(this.initiator.username)}`,
            "resource-pack": this.resourcePackLink ?? "",
            "level-name": "world",
            "server-port": this.config.port,
        }
        return {...defaultProps, ...mapProps, ...hardProps};
    }
    /**
     *
     * @param {URL} link
     * @returns {Promise<null>}
     */
    downloadWorldZip(link) {
        fs.rmSync(SharedConstants.serverFolder + "/world",{recursive:true, force: true});
        fs.rmSync(SharedConstants.serverFolder + "/world_nether",{recursive:true, force: true});
        fs.rmSync(SharedConstants.serverFolder + "/world_the_end",{recursive:true, force: true});
        fs.rmSync(SharedConstants.serverFolder + "/tempWorld",{recursive:true, force: true});
        fs.rmSync(SharedConstants.serverFolder + "/tempWorld.zip",{recursive:true, force: true});
        fs.rmSync(SharedConstants.serverFolder + "/cache",{recursive:true, force: true});
        return new Promise(async (resolve, reject) => {
            if (link.protocol === "https:" || link.protocol === "http:") {
                let writeStream = fs.createWriteStream(SharedConstants.serverFolder + "/tempWorld.zip");
                miniget(link).pipe(writeStream);
                writeStream.on("close", () => {
                    resolve();
                });
                writeStream.on("error", async (err) => {
                    this.messageWorker.sendLogMessage("I can't download map using this link!")
                    Logger.warn("Unable to download world: " + err);
                });
            }
            if (link.protocol === "file:" && link.pathname === "/") {
                if (this.isCustomMap) {
                    reject();
                    this.messageWorker.sendLogMessage("File is not safety!");
                }
                let src = path.join(SharedConstants.mapsFolder, link.hostname);
                fs.copyFile(
                    src,
                    SharedConstants.serverFolder + "/tempWorld.zip",
                    (err) => {
                        if (err) return reject();
                        resolve();
                });
            }

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
                .on("close", async () => {
                    let files = fs.readdirSync("./server/tempWorld/");
                    Logger.debug("Files inside Archive: " + files.join(", "))
                    if (files.indexOf("level.dat") !== -1) {
                        fs.renameSync("./server/tempWorld/","./server/world");
                        resolve();
                        return;
                    }
                    if (files.length > 1){
                        this.messageWorker.sendLogMessage("Archive have more than one folder inside or doesn't have level.dat in root!");
                        reject("Archive have more than one folder inside or doesn't have level.dat in root!");
                        return;
                    }
                    let file = files[0];
                    fs.renameSync("./server/tempWorld/" + file,"./server/world");
                    resolve();
                })
                .on("error", async (err) => {
                    this.messageWorker.sendLogMessage("The archive is corrupted or not available!");
                    this.stopServer();
                    reject(err);
                });
        });
    }
    async selectVersion(version) {
        this.version = version;
        this.state = ServerManager.States.DOWNLOADING_VERSION;
        let versionData = await this.vManager.selectVersion(version);
        if (versionData == null) {
            this.messageWorker.sendLogMessage(`Version "${version}" does not exist or invalid version id!`);
            return;
        }
        //console.log(`Download JAR file for ${this.vManager.selectedVersion["type"]} ${this.version}`);
        if (this.isCustomMap) {
            this.messageWorker.sendMainMessage("Select one of version below OR write special version");
        }
        let isDownloaded = await this.downloadJarIfNotExist();
        this.state = "RP_SELECTION";
        if (isDownloaded) {
            this.messageWorker.sendLogMessage("Server is downloaded!")
        }
        if (!this.isCustomMap) {
            let resourcePack = this.mapManager.selectedMap.resourcePack;
            this.setResourcePack(resourcePack);
            await this.startServer()
        } else {
            this.messageWorker.sendMainMessage("Send resource pack or click ❌ reaction");
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
                let url;
                this.state = ServerManager.States.DOWNLOADING_WORLD;

                if (message.attachments == null || message.attachments.size !== 1) {
                    let writeUrl = message.content;
                    await message.delete();
                    try {
                        url = new URL(writeUrl);
                    } catch (e) {
                        this.messageWorker.sendLogMessage("Link is not valid!");
                        this.stopServer()
                        return;
                    }
                } else {
                    let attachments = message.attachments.first();
                    url = new URL(attachments.url);
                }
                if ((url.protocol === "https:" || url.protocol === "http:")) {
                    this.messageWorker.sendLogMessage("Please wait your world is downloading!");
                    this.messageWorker.sendMainMessage("Downloading...")
                    await this.downloadWorldZip(url);
                    message.delete().catch(e => {
                        Logger.warn("Unable to delete user Message. Missing permission? " + e);
                    });
                    try {
                        await this.unpackWorld();
                    } catch (e) {
                        this.stopServer()
                        Logger.warn("Unable to unpack world: " + e);
                        this.messageWorker.sendLogMessage("Something went wrong while unpacking the world! Check console for more information");
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
                    if (version === (await this.getVersionManager().getLatestRelease()) ||
                        version === this.getVersionManager().getLatestSnapshot()) {
                        this.messageWorker.sendLogMessage(`Latest version ${version} auto detected from level.dat file!`);
                        await this.selectVersion(version);
                    } else {
                        this.state = "V_SELECTION";
                        this.messageWorker.sendMainMessage(`Map is loaded in ${version} which is not latest or unusual. Select version or write that you need!`);
                    }
                } else {
                    message.delete().catch(e => {
                        Logger.warn("Unable to delete message: " + e);
                    });
                    this.messageWorker.sendLogMessage("You need send a map in ZIP format");
                    return;
                }
                break;
            case "V_SELECTION":
                let version = message.content;
                message.delete().catch(e => {
                    Logger.warn("Unable to delete message: " + e);
                });
                await this.selectVersion(version);
                break;
            case "RP_SELECTION":
                if (message.attachments == null || message.attachments.size !== 1) {
                    this.messageWorker.sendLogMessage("You need send message with Attachment in ZIP format");
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
                if (!(interaction instanceof StringSelectMenuInteraction)) return;
                Logger.log(`${interaction.user.username} (${interaction.user.id}) starting predefined map!`)
                let alias = interaction.values[0];
                this.state = ServerManager.States.DOWNLOADING_WORLD;
                interaction.update({fetchReply: false,
                    ...(await this.messageWorker.buildMainMessage("Preparing map..."))}
                ).catch(e => {
                    Logger.warn("Unable to update interaction message!" + e);
                });
                let mapFromEmoji = this.mapManager.getMapFromAlias(alias);
                if (mapFromEmoji == null) {
                    Logger.warn("Map from emoji is null!")
                    return;
                }
                this.initiator = interaction.member.user;
                this.isCustomMap = false;
                await this.downloadWorldZip(new URL(mapFromEmoji.url));
                try {
                    await this.unpackWorld();
                } catch (e) {
                    this.stopServer()
                    Logger.warn("Unable to unpack world: " + e);
                    this.messageWorker.sendLogMessage("Something went wrong while unpacking the world! Check console for more information");
                    return;
                }
                if (mapFromEmoji.resourcePack) {
                    await this.setResourcePack(mapFromEmoji.resourcePack)
                } else {
                    await this.setResourcePack(null);
                }
                await this.selectVersion(mapFromEmoji.version)
                break;
            case "V_SELECTION":
                if (!(interaction instanceof StringSelectMenuInteraction)) return;
                if (interaction.member.user !== this.initiator) return;
                interaction.update({fetchReply: true}).then(async _ => {
                    await this.selectVersion(interaction.values[0])
                }).catch(async err => {
                    Logger.warn("Something went wrong while update interaction. " + err);
                    await this.selectVersion(interaction.values[0])
                });
                break;
            case "RP_SELECTION":
                if (!(interaction instanceof ButtonInteraction)) return;
                if (interaction.member.user !== this.initiator) return;
                if (interaction.customId === "no_rp") {
                    await interaction.update({fetchReply: true}).then(async _ => {
                        this.setResourcePack(null);
                        await this.startServer();
                    }).catch(async err => {
                        Logger.warn("Something went wrong while update interaction. " + err);
                        this.setResourcePack(null);
                        await this.startServer();
                    });
                }
                break;
            case "STARTING":
            case "HOSTING":
                if (!(interaction instanceof ButtonInteraction)) return;
                if (interaction.channel.permissionsFor(interaction.member).has(PermissionsBitField.Flags.ManageChannels)) {
                    Logger.log(`${interaction.user.username} (${interaction.user.id}) force stopped server!`);
                }
                if (interaction.member.user !== this.initiator &&                                   //check that initiator made action
                    !interaction.channel.permissionsFor(interaction.member).has(PermissionsBitField.Flags.ManageChannels)  //check that user have manage channel perms
                ) return;
                if (interaction.customId === "stop_server") {
                    try {
                        await interaction.update({fetchReply: false});
                    } catch (e) {
                        Logger.warn("Something went wrong while update interaction. " + e);
                    }
                    this.serverProcess.stdin.write(`kick @a ${this.initiator.username} closed the server!\n`);
                    setTimeout(() => {
                        this.serverProcess.kill("SIGKILL");
                    }, 50);
                }
                break;
            default:
                break;
        }
    }
    async onConsoleMessage(chunk) {
        process.stdout.write(chunk);
        let lines = chunk.toString().replace(/\n$/g,"");
        let line = lines.split("\n");
        for (let i = 0; i < line.length; i++) {
            let oneLine = line[i];
            let started = oneLine.match(/\[\d\d:\d\d:\d\d] \[.*\/.*]: Done \((.*)\)! For help, type "help"/);
            started = started ?? oneLine.match(/\[\d\d:\d\d:\d\d INFO]: Done \((.*)\)! For help, type "help"/);
            if (started) {
                this.state = "HOSTING";
                this.messageWorker.sendLogMessage(`Server is started in ${started[1]}`);
                this.messageWorker.sendMainMessage("To close server click 🛑");
            }
            let joined = oneLine.match(/\[\d\d:\d\d:\d\d] \[.*\/.*]: (\w*)\[\/.*] logged in with entity id \d* at \(.*,.*,.*\)/);
            joined = joined ?? oneLine.match(/\[\d\d:\d\d:\d\d INFO]: (\w*)\[\/.*] logged in with entity id \d* at \(.*,.*,.*\)/);
            if (joined) {
                let username = joined[1];
                this.players.push(username);
                console.log(this.players);
                this.messageWorker.sendLogMessage(`${username} joined the game!`);
            }
            let left = oneLine.match(/\[\d\d:\d\d:\d\d] \[.*\/.*]: (\w*) lost connection: .*/);
            left = left ?? oneLine.match(/\[\d\d:\d\d:\d\d INFO]: (\w*) lost connection: .*/);
            if (left) {
                let username = left[1];
                this.players.splice(this.players.indexOf(username), 1);
                console.log(this.players);
                this.messageWorker.sendLogMessage(`${username} left the game!`);
            }
        }
    }
    async startServer() {
        this.state = "STARTING";
        this.messageWorker.sendMainMessage()
        //this.messageWorker.sendLogMessage("Starting server...");
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
            Logger.log("Server is stopped! " + signal + " (" + code + ")");
            this.messageWorker.sendLogMessage("Server is closed!")
            this.initiator = null;
            if (this.config.generateDownloadLink) {
                await zip("./server/world/", "./world.zip");
                await spawn('curl', ["--upload-file", "./world.zip", "https://transfer.sh/world.zip"], {cwd: "./"}).stdout.on("data", chunk => {
                    this.state = ServerManager.States.WAITING;
                    this.messageWorker.sendMainMessage("[Download link](" + chunk.toString() + ")");
                    setTimeout(() => {
                        if (this.state === "WAITING") {
                            this.messageWorker.sendMainMessage();
                        }
                    }, 20000);
                });
            }
            this.stopServer()
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