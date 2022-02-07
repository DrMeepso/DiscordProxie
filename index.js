const WebSocketServer = require("ws").Server
const Discordjs = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
var http = require('http');

var server = http.createServer(function (request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});

server.listen(process.env.PORT || 3000, function () {
    console.log("Binded HTTP server")
});

const wss = new WebSocketServer({ server: server });

function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

wss.on('connection', function connection(ws) {

    var isloggedin = false
    var bot = null

    ws.on('message', function message(data) {

        if (IsJsonString(data.toString()) == false) return

        req = JSON.parse(data.toString())

        if (req.message == "login") {
            if (isloggedin) {

                ws.send('{"message": "error", "error": "cant signin twice"}')
                return

            }
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

                    ws.send(`{"message": "guildMessage", "msgContent": "${umsg.content}", "msgAuthor": ${ JSON.stringify( umsg.author )}, "msgServer": ${  JSON.stringify( umsg.guild )}, "msgChannel": ${ JSON.stringify(umsg.channel)}}`)

                })


                bot.on('interactionCreate', async interaction => {
                    if (!interaction.isCommand()) return;

                    ws.send(`{"message": "interaction", "type": "command", "name": "${interaction.commandName}", "id": "${interaction.id}", "token": "${interaction.token}", "author": ${JSON.stringify(interaction.member.user)}, "channel": ${JSON.stringify(interaction.channel)}, "guild": ${JSON.stringify(interaction.guild)}, "options": ${JSON.stringify(interaction.options.data)}}`)

                });

                ws.on('close', (number, reson) => {

                    bot.user.setStatus('Invisible')
                    bot.destroy()
                    console.log("Bot destroyed")

                })


                ws.on('message', function message(data) {

                    if (IsJsonString(data.toString()) == false) return

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

                            ws.send(`{"message": "getusername", "name": "${member.user.username}", "callBack": "${req.CallBack}"}`)

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

                            commandList = []

                            Object.values(req).forEach((currentcommand, index) => {

                                if (!currentcommand.commandName) return

                                command = new SlashCommandBuilder()
                                    .setName(currentcommand.commandName.toLowerCase())
                                    .setDescription(currentcommand.commandDescription)

                                currentcommand.commandPrams.forEach((value, index) => {

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
                                commandList.push(command)
                            })
                            

                            setTimeout(() => {

                                var rest = new REST({ version: '9' }).setToken(bot.token);

                                rest.put(Routes.applicationGuildCommands(bot.user.id, '691458137261342760'), { body: commandList })
                                    .then(() => ws.send('{"message": "botUpdate", "update": "slashcommandsregistered"}'))
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
                            }).catch(err => ws.send(`{"message": "error", "error": "${err.message}" }`))

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