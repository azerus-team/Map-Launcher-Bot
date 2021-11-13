const Config = require("./Config");
const Discord = require('discord.js');
const client = new Discord.Client({intents: ["GUILDS", "GUILD_MESSAGE_REACTIONS", "GUILD_MESSAGES"]});
const ServerManager = require("./src/ServerManager");
const VersionManager = require("./src/VersionManager");
const {MessageComponentInteraction} = require("discord.js");
const vManager = new VersionManager();
let sManager;


client.on("ready", () => {
    console.log("Map Testing bot is started");
    sManager = new ServerManager(client, vManager);
    setInterval(() => {
        // noinspection JSIgnoredPromiseFromCall
        sManager.onTick();
    }, 1000/20);
});
client.on("messageCreate", (message) => {
    const channel = Config.channelId;

    if (message.channel.id !== channel) return;
    if (message.author.bot) return;
    // noinspection JSIgnoredPromiseFromCall
    sManager.onMessageReceive(message);
});
client.on("interactionCreate", interation => {
    if (interation.type !== "MESSAGE_COMPONENT") {
        return;
    }
    if (!(interation instanceof MessageComponentInteraction)) return;
    if (interation.channel.id !== Config.channelId) {
        return;
    }
    if (interation.channel.permissionsFor(interation.member).has("SEND_MESSAGES")) {
        sManager.onInteraction(interation);
    }
})
client.login(Config.botToken);