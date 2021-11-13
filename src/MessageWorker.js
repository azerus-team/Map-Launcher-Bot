const Discord = require('discord.js');
const config = require("./../Config");
const fs = require("fs");
const {TextChannel, MessagePayload, RichPresenceAssets, MessageEmbed, MessageComponentInteraction, MessageSelectMenu,
    InteractionCollector, MessageActionRow, MessageButton
} = require("discord.js");
const MapManager = require("./MapManager");
const ServerManager = require("./ServerManager");

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

    async fetchMessages() {
        let msFile = fs.readFileSync("./messages.json").toString();
        let msID = {};
        try {
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
        }
        if (this.mainMessage == null) {
            this.mainMessage = await this.channel.send(this.buildMainMessage());
        }

        if (this.logMessage == null) {
            this.logMessage = await this.channel.send("> Bot is started...");
        }

        await this.mainMessage.edit(this.buildMainMessage());
        await this.mainMessage.reactions.removeAll();
        fs.writeFileSync("./messages.json", JSON.stringify({"MAIN": this.mainMessage.id, "LOG": this.logMessage.id}));
    }

    async sendMainMessage(content = "Nothing") {
        await this.mainMessage.edit(this.buildMainMessage(content));
    }

    async sendLogMessage(content) {
        await this.logMessage.edit("> " + content);
    }

    /**
     *
     * @returns {Discord.MessageEditOptions}
     */
    buildMainMessage(content = "Nothing") {
        let initiator = this.serverManager.initiator;
        let row = new MessageActionRow();
        switch (this.serverManager.state) {
            case "WAITING":
                row.addComponents(this.mapManager.buildMapSelector());
                break;
            case "V_SELECTION":
                row.addComponents(this.serverManager.getVersionManager().getMessageComponent());
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

            .addField("Status", this.resolveStatus(), true)
            .addField("Initiator", initiator ? `<@!${initiator.id}>` : "N/A", true)
            .addField("IP", "`" + config.publicIP + "`", true)
            .addField("Message", content, true)
        return {content: " ", embeds: [embed], components: [row]};
    }

    resolveStatus() {
        switch (this.serverManager.state) {
            case "WAITING":
                return "🟣 Waiting";
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