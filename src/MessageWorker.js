const Discord = require('discord.js');
const fs = require("fs");
const {TextChannel, MessageEmbed, MessageActionRow, MessageButton, ButtonInteraction, ActionRowBuilder, EmbedBuilder,
    ButtonBuilder
} = require("discord.js");
const MapManager = require("./MapManager");
const ServerManager = require("./ServerManager");
const SharedConstants = require('./SharedConstants');
const Logger = require('./Logger');
const path = require("path");
const { I18n } = require("i18n");

class MessageWorker {
    /**
     * @type {Discord.TextChannel}
     */
    channel;
    /**
     * @type {Discord.Client}
     */
    client;
    /**
     * @type {Discord.Message}
     */
    mainMessage;
    /**
     * @type {Discord.Message}
     */
    logMessage;
    /**
     * @type {MapManager}
     */
    mapManager;
    /**
     * @type {ServerManager}
     */
    serverManager;
    /**
     *
     * @type {I18n}
     */
    i18n = new I18n({
        locales: ['en_US', 'ru_RU'],
        directory: path.join(__dirname, 'locales'),
        defaultLocale: "en_US",
        retryInDefaultLocale: true,
        updateFiles: false,
    });
    /**
     *
     * @param {Discord.Client} client
     * @param {MapManager} mapManager
     * @param {ServerManager} serverManager
     */
    constructor(client, mapManager, serverManager) {
        this.client = client;
        this.mapManager = mapManager;
        this.serverManager = serverManager;
        this.fetchMessages().catch(err => {
            console.log(err);
            Logger.fatal("Something went wrong while fetch messages! Check config.json and grant SendMessages, ManageMessages permissions.");
        });
    }
    /**
     *
     * @returns {Promise<void>}
     */
    async fetchMessages() {
        let msID = {};
        try {
            let msFile = fs.readFileSync(SharedConstants.MessageFile).toString();
            msID = JSON.parse(msFile);
        } catch (e) {
            console.error(e);
        }
        /**
         *
         * @type {TextChannel}
         */
        console.log(this.client.isReady());
        this.channel = await this.client.channels.fetch(this.serverManager.config.channelId);
        if (!(this.channel instanceof TextChannel)) return;
        try {
            this.mainMessage = await this.channel.messages.fetch(msID["MAIN"].toString());
            this.logMessage = await this.channel.messages.fetch(msID["LOG"].toString());
        } catch (e) {
            Logger.log("Unable to find messages in channel. Sending a new one.")
        }
        this.mainMessage = this.mainMessage ?? await this.channel.send(await this.buildMainMessage());
        this.logMessage = this.logMessage ?? await this.channel.send("> Bot is started!");
        await this.sendMainMessage();
        await this.sendLogMessage("Bot is started!");
        fs.writeFileSync(SharedConstants.MessageFile, JSON.stringify({"MAIN": this.mainMessage.id, "LOG": this.logMessage.id}));
    }

    /**
     * @deprecated
     * Use MessageWorker#setLocalizatedMessage
     * @param content
     */
    sendMainMessage(content = "Nothing") {
        this.buildMainMessage(content).then(_ => {
            this.mainMessage.edit(_)
                .catch(e => {
                Logger.warn("Unable to update main message: " + e);
            });
        })
    }
    setLocalizatedMessage(content = "error.noKey") {
        this.buildMainMessage(this.i18n.__(content)).then(message => {
            this.mainMessage.edit(message)
                .catch(e => {
                    Logger.warn("Unable to update main message: " + e);
                });
        })
    }
    /**
     *
     * @param {String} content
     * @returns {void}
     */
    sendLogMessage(content) {
        this.logMessage.edit("> " + content)
            .catch(e => {
                Logger.warn("Unable to update log message: " + e);
            });
    }
    async buildMainMessage(content = "Nothing") {
        return new Promise(async (resolve) => {
            let initiator = this.serverManager.initiator;
            let row = new ActionRowBuilder();
            //let secondayRow = new MessageActionRow();

            let addComponent = true;
            switch (this.serverManager.state) {
                case "WAITING":
                    let components = this.mapManager.buildMapSelector();
                    if (components == null) {
                        addComponent = false;
                        break;
                    }

                    row.addComponents(components);
                    break;
                case "V_SELECTION":
                    row.addComponents(await this.serverManager.getVersionManager().getMessageComponent());
                    break;
                case "W_DOWNLOADING":
                case "V_DOWNLOADING":
                    addComponent = false;
                    break;
                case "RP_SELECTION":
                    let noRpButton = new ButtonBuilder()
                        .setCustomId("no_rp")
                        .setEmoji("❌")
                        .setStyle("Primary")
                        .setLabel("No resourcepack");
                    row.addComponents(noRpButton)
                    break;
                case "STARTING":
                case "HOSTING":
                    let restartButton = new ButtonBuilder()
                        .setCustomId("restart")
                        .setEmoji("🔁")
                        .setStyle('Secondary')
                        .setLabel("Restart")
                    let stopServerButton = new ButtonBuilder()
                        .setCustomId("stop_server")
                        .setEmoji("🛑")
                        .setStyle("Danger")
                        .setLabel("Stop server");
                    row.addComponents(stopServerButton);
                    row.addComponents(restartButton);
                    break;
            }
            let messageConfig = this.serverManager.config.message;
            let embed = new EmbedBuilder()
                .setTitle(messageConfig.title)
                .setDescription(messageConfig.description)
                .setColor(messageConfig.sideColor)
                .setFooter({
                    "text": messageConfig.footer
                })
                .addFields(
                    {name: "Status", value: MessageWorker.resolveStatus(this.serverManager.state), inline: true},
                    {name: "Initiator", value: initiator ? `<@!${initiator.id}>` : "N/A", inline: true},
                    {name: "IP", value: messageConfig.ip, inline: true},
                    {name: "Version", value: `\`${(this?.serverManager?.vManager?.selectedVersion?.id ?? "N/A")}\``, inline: true},
                    {name: "Message", value: content, inline: false},

                )

            if (addComponent) {
                resolve({content: " ", embeds: [embed], components: [row]});
            } else {
                resolve({content: " ", embeds: [embed], components: []});
            }
        })
    }

    static resolveStatus(state) {
        switch (state) {
            case "WAITING":
                return "🟣 Waiting";
            case "V_DOWNLOADING":
            case "W_DOWNLOADING":
                return "🟣 Downloading"
            case "V_SELECTION":
                return "🔵 Selecting version";
            case "RP_SELECTION":
                return "🔵 Resource pack";
            case "STARTING":
                return "🟠 Starting";
            case "HOSTING":
                return "🟢 Online";
            default:
                return "Unknown";
        }
    }
}
module.exports = MessageWorker;