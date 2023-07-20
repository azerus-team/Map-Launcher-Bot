const Discord = require('discord.js');
const { GatewayIntentBits, Events, PermissionsBitField} = require('discord.js');
// const client = new Discord.Client({intents: ["GUILD_MESSAGE_REACTIONS", "GUILD_MESSAGES"]});
const client = new Discord.Client({intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildMessages]});
const ServerManager = require("./src/ServerManager");
const {MessageComponentInteraction, TextChannel} = require("discord.js");
const Logger = require('./src/Logger');
const path = require("path");
const { I18n } = require("i18n");
const i18n = new I18n({
    locales: ['en_US', 'ru_RU'],
    directory: path.join(__dirname, 'locales'),
    defaultLocale: "en_US",
    retryInDefaultLocale: true,
    updateFiles: false,

})

let sManager = new ServerManager(client, i18n);

client.on(Events.ClientReady, () => {
    Logger.log("Map Testing bot started");
    sManager = new ServerManager(client, i18n);
    setInterval(() => {
        sManager.onTick();
    }, 1000 / 20);
});

client.on(Events.MessageCreate, (message) => {
    const channel = sManager.config.channelId;
    if (message.channel.id !== channel) return;
    if (message.author.bot) return;
    sManager.onMessageReceive(message).catch(e => {
        Logger.warn("Something went wrong while handling Message Receive. " + e);
    });
});
client.on(Events.InteractionCreate, interation => {
    if (!(interation instanceof MessageComponentInteraction)) return;
    if (!(interation.channel instanceof TextChannel)) return;
    if (interation.channel.id !== sManager.config.channelId) {
        return;
    }
    if (interation.channel.permissionsFor(interation.member).has(PermissionsBitField.Flags.SendMessages)) {
        sManager.onInteraction(interation);
    }
});
if (sManager.config.botToken === "<Bot token is here or use process.env>") {
    Logger.fatal("Set bot token in config.json and restart app!");
}
console.log(sManager.config.botToken.slice(0, 10));
client.login(sManager.config.botToken).catch(e => {
    Logger.fatal("Bot token in invalid. Set token in config.json and restart app!" + e);
});