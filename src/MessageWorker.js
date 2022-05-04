const Discord = require('discord.js');
const config = require("./../Config");
const fs = require("fs");
const {TextChannel, MessagePayload, RichPresenceAssets, MessageEmbed, MessageComponentInteraction, MessageSelectMenu,
    InteractionCollector, MessageActionRow, MessageButton, Message
} = require("discord.js");
const MapManager = require("./MapManager");
const ServerManager = require("./ServerManager");
const SharedConstants = require('./SharedConstants');

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
     * @param {Discord.Client} client
     * @param {MapManager} mapManager
     * @param {ServerManager} serverManager
     */
    constructor(client, mapManager, serverManager) {
        this.client = client;
        this.mapManager = mapManager;
        this.serverManager = serverManager;
        this.fetchMessages();
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
        }
        /**
         *
         * @type {TextChannel}
         */
        this.channel = await this.client.channels.fetch(config.channelId);
        if (!(this.channel instanceof TextChannel)) return;
        try {
            this.mainMessage = await this.channel.messages.fetch(msID["MAIN"].toString());
            this.logMessage = await this.channel.messages.fetch(msID["LOG"].toString());
        } catch (e) {
            console.log("Unable to find messages in channel!");
        }
        this.mainMessage = this.mainMessage ?? await this.channel.send(await this.buildMainMessage());
        this.logMessage = this.logMessage ?? await this.channel.send("> Bot is started...");
        await this.sendMainMessage();
        await this.sendLogMessage("Bot is started!");
        fs.writeFileSync(SharedConstants.MessageFile, JSON.stringify({"MAIN": this.mainMessage.id, "LOG": this.logMessage.id}));
    }
    async sendMainMessage(content = "Nothing") {
        await this.mainMessage.edit(await this.buildMainMessage(content));
    }
    /**
     *
     * @param {String} content
     * @returns {Promise<void>}
     */
    async sendLogMessage(content) {
        await this.logMessage.edit("> " + content);
    }
    /**
     *
     * @returns {Discord.MessageEditOptions}
     */
    async buildMainMessage(content = "Nothing") {
        let initiator = this.serverManager.initiator;
        let row = new MessageActionRow();
        let addComponent = true;
        switch (this.serverManager.state) {
            case "WAITING":
                row.addComponents(this.mapManager.buildMapSelector());
                break;
            case "V_SELECTION":
                row.addComponents(await this.serverManager.getVersionManager().getMessageComponent());
                break;
            case "W_DOWNLOADING":
            case "V_DOWNLOADING":
                addComponent = false;
                break;
            case "RP_SELECTION":
                let noRpButton = new MessageButton()
                    .setCustomId("no_rp")
                    .setEmoji("❌")
                    .setStyle("PRIMARY")
                    .setLabel("No resourcepack");
                row.addComponents(noRpButton)
                break;
            case "STARTING":
            case "HOSTING":
                let stopServerButton = new MessageButton()
                    .setCustomId("stop_server")
                    .setEmoji("🛑")
                    .setStyle("DANGER")
                    .setLabel("Stop server");
                row.addComponents(stopServerButton)
                break;
        }
        let embed = new MessageEmbed()
            .setTitle(config.title)
            .setDescription(config.description)
            .setColor(config.sideColor)
            .setFooter(config.footerMessage)

            .addField("Status", MessageWorker.resolveStatus(this.serverManager.state), true)
            .addField("Initiator", initiator ? `<@!${initiator.id}>` : "N/A", true)
            .addField("IP", "`" + config.publicIP + "`", true)
            //.addField("Version", (this?.serverManager?.vManager?.selectedVersion ?? "N/A"), true)
            .addField("Message", content, false)

        if (addComponent) {
            return {content: " ", embeds: [embed], components: [row]};
        } else {
            return {content: " ", embeds: [embed], components: []};
        }

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