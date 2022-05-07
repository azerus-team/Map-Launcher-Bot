const Discord = require('discord.js');
const client = new Discord.Client({intents: ["GUILDS", "GUILD_MESSAGE_REACTIONS", "GUILD_MESSAGES"]});
const ServerManager = require("./src/ServerManager");
const {MessageComponentInteraction, TextChannel} = require("discord.js");
const Logger = require('./src/Logger');
let sManager = new ServerManager(client);


client.on("ready", () => {
    Logger.log("Map Testing bot started");
    sManager = new ServerManager(client);
    setInterval(() => {
        // noinspection JSIgnoredPromiseFromCall
        sManager.onTick();
    }, 1000 / 20);
});
client.on("messageCreate", (message) => {
    const channel = sManager.config.channelId;
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
    if (!(interation.channel instanceof TextChannel)) return;
    if (interation.channel.id !== sManager.config.channelId) {
        return;
    }
    if (interation.channel.permissionsFor(interation.member).has("SEND_MESSAGES")) {
        sManager.onInteraction(interation);
    }
});
if (sManager.config.botToken === "<Bot token is here or use process.env>") {
    Logger.fatal("Set bot token in config.json and restart app!");
}
client.login(sManager.config.botToken).catch(e => {
    Logger.fatal("Bot token in invalid. Set token in config.json and restart app!");
});