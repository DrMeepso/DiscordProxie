const WebSocketServer = require("ws").Server
const Discordjs = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
var http = require('http');

var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.write('C3 Discord Interfece By Meepso!')
    response.writeHead(404);
    response.end();
});
server.listen(process.env.PORT || 3000, function() {
    console.log("Binded HTTP server")
});

const wss = new WebSocketServer({ server: server });

wss.on('connection', function connection(ws) {

    var isloggedin = false
    var bot = null

    ws.on('message', function message(data) {
        req = JSON.parse(data.toString())

        if (req.message == "login") {
            if (req.auth == '0F6myoD0vRd*FQ') {

                ws.send('{"message": "loggedin"}')
                isloggedin = true

                var bot = new Discordjs.Client({ intents: [Discordjs.Intents.FLAGS.GUILDS, Discordjs.Intents.FLAGS.GUILD_MESSAGES] })

                bot.login(req.botToken).catch(err => ws.send('{"message": "error", "error": "Invalid bot token"}'))


                bot.on("error", err => {

                    console.log(err)

                })

                bot.on("ready", () => {

                    ws.send('{"message": "botUpdate", "update": "startupfinished"}')
                    console.log("Bot ready")

                })

                bot.on("messageCreate", (umsg) => {

                    ws.send(`{"message": "guildMessage", "msgContent": "${umsg.content}", "msgAuthor": "${umsg.author.username}", "msgAuthorID": "${umsg.author.id}", "msgServerID": "${umsg.guild.id}", "msgServerName": "${umsg.guild.name}", "msgChannelID": "${umsg.channel.id}", "msgChannelName": "${umsg.channel.name}"}`)

                })


                bot.on('interactionCreate', async interaction => {
                    if (!interaction.isCommand()) return;

                    ws.send(`{"message": "interaction", "type": "command", "name": "${interaction.commandName}", "id": "${interaction.id}", "token": "${interaction.token}", "authorID": "${interaction.user.id}", "options": ${JSON.stringify(interaction.options.data)}}`)


                });

                ws.on('close', (number, reson) => {

                    bot.user.setActivity("Meepso's content", {
                        type: "STREAMING",
                        url: "https://www.twitch.tv/drmeepso"
                      });

                    setTimeout(() => {

                        bot.user.setStatus('Invisible')

                        bot.destroy()
                        console.log("Bot destroyed")

                    }, 10000);

                })


                ws.on('message', function message(data) {
                    req = JSON.parse(data.toString())

                    switch (req.message) {

                        case 'send':


                            var { guilds } = bot
                            var targetGuild = guilds.cache.get(req.ServerID)
                            var channel = targetGuild.channels.cache.get(req.ChannelID)

                            channel.send(req.Message)

                            break;

                        case 'status':

                            bot.user.setActivity(req.ActivatyText, { type: req.ActivityType })

                            break;

                        case 'rolecheck':

                            var { guilds } = bot;
                            var targetGuild = guilds.cache.get(req.ServerID)
                            var member = targetGuild.members.cache.find(user => user.id === req.UserID);
                            var role = targetGuild.roles.cache.find(role => role.name === req.RoleName);

                            if (!role) {
                                ws.send('{"message": "error", "error": "unable to find role"}')
                            } else {
                                if (member.roles.cache.get(role.id)) {
                                    ws.send(`{"message": "rolecheck", "callBack": "${req.CallBack}", "hasRole": "true"}`)
                                } else {
                                    ws.send(`{"message": "rolecheck", "callBack": "${req.CallBack}", "hasRole": "false"}`)
                                }
                            }

                            break;

                        case 'rolegive':

                            var { guilds } = bot;
                            var targetGuild = guilds.cache.get(req.ServerID)
                            var member = targetGuild.members.cache.find(user => user.id === req.UserID);
                            var role = targetGuild.roles.cache.find(role => role.name === req.RoleName);

                            if (!role) { ws.send('{"message": "error", "error": "unable to find role"}') }

                            member.roles.add(role)

                            break;

                        case 'roleremove':

                            var { guilds } = bot;
                            var targetGuild = guilds.cache.get(req.ServerID)
                            var member = targetGuild.members.cache.find(user => user.id === req.UserID);
                            var role = targetGuild.roles.cache.find(role => role.name === req.RoleName);

                            if (!role) { ws.send('{"message": "error", "error": "unable to find role"}') }

                            member.roles.remove(role)

                            break;

                        case 'getusername':

                            var { guilds } = bot;
                            var targetGuild = guilds.cache.get(req.ServerID);
                            var member = targetGuild.members.cache.find(user => user.id === req.UserID);

                            ws.send(`{"message": "getusername", "name": "${member.user.username}", callBack: "${req.CallBack}"}`)

                            break;

                        case 'getallusers':

                            var { guilds } = bot;
                            var targetGuild = guilds.cache.get(req.ServerID);

                            ws.send(`{"message": "getallusers", "users": "${Array.from(targetGuild.members.cache.values())}", "callBack": "${req.CallBack}"}`)

                            break;

                        case 'getallchannels':

                            var { guilds } = bot;
                            var targetGuild = guilds.cache.get(req.ServerID);

                            ws.send(`{"message": "getallchannels", "channels": "${Array.from(targetGuild.channels.cache.values())}", "callBack": "${req.CallBack}"}`)

                            break;

                        case 'getnick':

                            var { guilds } = bot;
                            var targetGuild = guilds.cache.get(req.ServerID);
                            var member = targetGuild.members.cache.find(user => user.id === req.UserID);

                            if (member.nickname) {
                                ws.send(`{"message": "getnick", "name": "${member.nickname}", "callBack": "${req.CallBack}"}`)
                            } else {
                                ws.send(`{"message": "getnick", "name": "${member.user.username}", "callBack": "${req.CallBack}"}`)
                            }

                            break;

                        case 'createcommand':

                            command = new SlashCommandBuilder()
                                .setName(req.commandName.toLowerCase())
                                .setDescription(req.commandDescription)

                            Object.values(JSON.parse(req.commandPrams)).forEach((value, index) => {

                                if (value.pramType == "string") {

                                    var req
                                    if (value.pramRequired == 'true') { req = true } else { req = false }
                                    command.addStringOption(option => {
                                        return option
                                            .setName(value.pramName)
                                            .setDescription(value.pramDesc)
                                            .setRequired(req)
                                    })
                                }
                            })

                            setTimeout(() => {

                                const commands = [
                                    command,
                                ].map(command => command.toJSON());

                                var rest = new REST({ version: '9' }).setToken(bot.token);

                                rest.put(Routes.applicationGuildCommands(bot.user.id, '691458137261342760'), { body: commands })
                                    .then(() => ws.send('{"message": "botUpdate", "update": "slashcommandsregisterd"}'))
                                    .catch((err) => ws.send(`{"message": "error", "error": ${JSON.stringify(err.rawError)} }`));

                            }, 200);

                            break;

                        case 'interactionCallback':

                            bot.api.interactions(req.id, req.token).callback.post({
                                data: {
                                    "type": 4,
                                    "data": {
                                        "tts": false,
                                        "content": req.content,
                                        "embeds": [],
                                        "allowed_mentions": { "parse": [] }
                                    }
                                },
                                auth: false
                            })

                            break;

                    }

                })

            } else {

                ws.send('{"message": "error", "error": "wrong password!"}')

            }
        }
    });

    ws.send('{"message": "ready", "fingerPrint": "Meepso was here"}');
});