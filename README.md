# Map-Launcher-Bot
Launches your Minecraft: Java Edition map directly from Discord.




### How to Run
Required NodeJS LTS version 

To install packages run
```
npm install
```

To run bot run
```
node index.js
```

After first run you need to configure `config.json` file and run again


###CONFIG
  - useNativeTransport - Use Epoll channel for Linux
  - onlineMode - enables online mode
	- maxPlayers - Maximum amount of player that can join to server
	- channelId - Put Here channelId from Discord (Tip: Use Developer mode)
  - botToken - Put here bot token from Discord Applications
	- language - en_US currently supported
	- javaPath - java launch command
	- core - Can be PAPER, FARBIC, VANILLA
	- port - Server Port 
	- initialMemory - Initial Heam Java memory or Xms param
  - maxMemory - Max Java Heap size or Xmx param
	- generateDownloadLink - After closing server it give Download link of map
	- eula - Should be true if you agree EULA of Minecraft
	- motd - Message of The Day that shows in Server list (Use $INITIATOR - to put Discord username that launched map)
	- idleTime - time in minutes when server close if there no players during that time 
	- message - Discord Embed Message parameters (only for visual message in Discord)
	- serverConfig - Minecraft `server.properties` file in JSON format
