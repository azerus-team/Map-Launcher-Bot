exports.channelId = "573137370044694539";

//You can use DISCORD_TOKEN env variable!
exports.botToken = process.env.DISCORD_TOKEN || "YOUR_TOKEN_HERE";

//Avaliable platforms: VANILLA, (FABRIC, PAPER coming soon)
exports.core = "VANILLA"
exports.serverPort = 25565;
exports.initialMemory = "1G";
exports.maxMemory = "4G";
exports.onlineMode = true;
exports.maxPlayers = 50;
//  Upload map to transfer.sh and gives link after closing server.
exports.generateDownloadLink = false;
// Minecraft End User License Agreement available at https://account.mojang.com/documents/minecraft_eula.
exports.eula = true;

//Configure your main message
exports.title = "Map launcher bot";
exports.publicIP = "join.example.com";
exports.footerMessage = "Made with <3";
exports.description = "Using this bot you can launch your map. Just send your map using `.zip` archive.";
exports.sideColor = 43775;

exports.motd = (initiator) => {
    return `\\u00a76Your\\u00a77 map server\\u00a7r\\n\\u00a77Launched by \\u00a73${initiator}\\u00a7r!`
}
