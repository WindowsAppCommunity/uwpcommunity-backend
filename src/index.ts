import 'source-map-support/register.js'
import { Request, Response, NextFunction } from "express";
import { InitBot, bot } from "./common/discord.js";
import * as helpers from './common/generic.js';
import cors from "cors";
import { IBotCommandArgument } from "./models/types.js";
import { TextChannel } from "discord.js";
import { CreateLibp2pKey, Dag, InitAsync as InitHeliaAsync, Ipns } from "./api/sdk/helia.js";
import express, { Express } from 'express';
import bodyParser from 'body-parser';
import glob from 'glob';

import * as Projects from './api/sdk/projects.js'

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { CID } from "multiformats/cid";
import { SaveUserAsync } from './api/sdk/users.js';
import { SavePublisherAsync } from './api/sdk/publishers.js';
import { SaveProjectAsync } from './api/sdk/projects.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let HttpMethodsRegex = /((?:post|get|put|patch|delete|ws)+)(?:.js)/;

/**
 * This file sets up API endpoints based on the current folder tree in Heroku.
 * 
 * Here's how it works:
 * Consumable JS files named with an HTTP method (all lowercase) are handed the Request and Response parameters from ExpressJS
 * The path of the file is set up as the endpoint on the server, and is set up with the HTTP method indicated by the filename 
 * 
 * Example: 
 * The file `./src/myapp/bugreport/post.js` is set up at `POST https://example.com/myapp/bugreport/`
 */

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use((req: Request, res: Response, next: NextFunction) => {
    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,authorization');

    // Pass to next layer of middleware
    next();
});

//await InitDb();
await InitHeliaAsync();

await InitBot();
console.log("Server Companion is online");

await SetupBotCommands();
console.log("Server companion ready to receive commands");

await SetupBotEvents();
console.log("Server companion ready to handle events");

await SetupAPI();
await app.listen(PORT);
console.log(`HTTP API listening on port ${PORT}`);

await Projects.LoadAllAsync();
console.log("Projects loaded, testing creation");

await CreateTestProject();

async function CreateTestProject() {
    if (Ipns == undefined || Dag == undefined)
        throw new Error("Helia not initialized");

    var userPeerId = await CreateLibp2pKey();
    var projectPeerId = await CreateLibp2pKey();
    var publisherPeerId = await CreateLibp2pKey();

    var savedUserCid = await SaveUserAsync(userPeerId.toCID(), {
        name: "Alice",
        projects: [projectPeerId.toCID()],
        markdownAboutMe: "",
        links: [],
        publishers: [publisherPeerId.toCID()],
        connections: []
    });

    var savedPublisherCid = await SavePublisherAsync(publisherPeerId.toCID(), {
        name: "Contoso",
        description: "Contoso is a test publisher.",
        projects: [projectPeerId.toCID()],
        icon: CID.parse("QmYqnT3PLBHbY3XVcEwbYiatNLCNyVfKffvzkuqxJ1hBqa"),
        accentColor: "#FF0000",
        links: [],
        contactEmail: "",
        isPrivate: false,
    });

    var savedProjectCid = await SaveProjectAsync(projectPeerId.toCID(), {
        name: "Hello World",
        description: "The first test project.",
        publisher: publisherPeerId.toCID(),
        collaborators: [{
            user: userPeerId.toCID(),
            role: {
                name: "Owner",
                description: "The owner of the project.",
            },
        }],
        icon: CID.parse("QmYqnT3PLBHbY3XVcEwbYiatNLCNyVfKffvzkuqxJ1hBqa"),
        links: [],
        isPrivate: false,
        forgetMe: false,
        images: [],
        heroImage: CID.parse("QmYqnT3PLBHbY3XVcEwbYiatNLCNyVfKffvzkuqxJ1hBqa"),
        accentColor: "#FF0000",
        category: "Test",
        createdAtUnixTime: new Date().getTime(),
        dependencies: [],
        features: [],
        needsManualReview: false,
    });

    console.log(`Test project created:\n- json-dag cid ${savedProjectCid.toString()}\n- saved under ipns cid: ${publisherPeerId.toCID()}`);
}

//#region Setup 

function initModuleOnBotReady(module: any) {
    if (module.Initialize)
        bot.once('ready', module.Initialize);
}

async function SetupAPI() {
    return new Promise<void>(async (resolve, reject) => {

        glob(__dirname + '/api/**/*.js', async function (err: Error | null, result: string[]) {
            if (err) reject(err);

            for (let filePath of result) {

                if (!filePath.includes("node_modules") && helpers.match(filePath, HttpMethodsRegex)) {
                    let serverPath = filePath.replace(HttpMethodsRegex, "").replace("/app", "").replace("/api", "").replace("/build", "");

                    if (helpers.match(serverPath, /{(.+)}\/?$/)) {
                        // Check paths with route params for sibling folders  
                        const folderPath = filePath.replace(/{.+}(.+)$/, "\/\*\/");
                        glob(folderPath, (err: Error | null, siblingDir: string[]) => {
                            if (siblingDir.length > 1) throw new Error("Folder representing a route parameter cannot have sibling folders: " + folderPath);
                        });
                    }

                    // Reformat route params from folder-friendly to express spec
                    serverPath = serverPath.replace(/{([^\/]+)}/g, ":$1");

                    if (helpers.DEVENV) serverPath = serverPath.replace(__dirname.replace(/\\/g, `/`).replace("/build", ""), "");

                    const method = helpers.match(filePath, HttpMethodsRegex);
                    if (!method) continue;

                    console.log(`Ready HTTP ${method.toUpperCase()} ${serverPath}`);

                    filePath = `file://${filePath}`

                    switch (method) {
                        case "post":
                            app.post(serverPath, () => import(filePath));
                            break;
                        case "get":
                            app.get(serverPath, () => import(filePath));
                            break;
                        case "put":
                            app.put(serverPath, () => import(filePath));
                            break;
                        case "patch":
                            app.patch(serverPath, () => import(filePath));
                            break;
                        case "delete":
                            app.delete(serverPath, () => import(filePath));
                            break;
                    }
                }
            }

            resolve();
        });
    });
}


async function SetupBotCommands() {
    glob(`${__dirname}/bot/commands/*.js`, async (err: Error | null, result: string[]) => {
        for (let filePath of result) {
            filePath = `file://${filePath}`

            const module = await import(filePath);
            if (!module.default) throw "No default export was defined in " + filePath;
            initModuleOnBotReady(module);

            const commandPrefix = helpers.match(filePath, /\/bot\/commands\/(.+).js/);
            if (!commandPrefix) return;

            bot.on('messageCreate', message => {
                // Message must be prefixed
                if (message.content.startsWith(`!${commandPrefix}`)) {

                    message.content = message.content.replace('@here', '');
                    message.content = message.content.replace('@everyone', '');

                    if (message.mentions.everyone)
                        return; // Don't allow mentioning everyone

                    if (message.author?.bot)
                        return; // ignore messages sent by bots.

                    const argsRegexMatch = message.content.matchAll(/ (?:\/|-|--)([a-zA-Z1-9]+) (?:([\w\/\,\.:#!~\@\$\%\^&\*\(\)-_+=`\[\]\\\|\;\'\<\>]+)|\"([\w\s\/\,\.:#!~\@\$\%\^&\*\(\)-_+=`\[\]\\\|\;\'\<\>)]+)\")/gm);
                    const argsMatch = Array.from(argsRegexMatch);
                    let args: IBotCommandArgument[] = argsMatch.map(i => { return { name: i[1], value: i[2] || i[3] } });

                    let noArgsCommand = message.content;

                    // In order to easily get the command parts, we first remove the arguments
                    for (const argMatch of argsMatch)
                        noArgsCommand = noArgsCommand.replace(argMatch[0], "");

                    const commandPartsRegexMatch = noArgsCommand.matchAll(/ \"(.+?)\"| (\S+)/g);
                    const commandPartsMatch = Array.from(commandPartsRegexMatch);
                    let commandParts: string[] = commandPartsMatch.map(i => i[1] || i[2]);

                    // If a user was mentioned, add the discordId as an argument.
                    // Only first user supported.
                    if (message.mentions?.members) {
                        var mentions = [...message.mentions.members.values()];
                        if (mentions && mentions.length > 0) {
                            args.push({
                                name: "discordId",
                                value: mentions[0].id
                            });
                        }
                    }

                    module.default(message, commandParts, args);

                    const peekArg = args.find(i => i.name == "peek");
                    if (peekArg) {
                        var timeout = isNaN(peekArg.value as any) ? 5 : parseInt(peekArg.value as any);

                        setTimeout(() => {
                            (message.channel as TextChannel).messages.cache.find(x => x.author.id == bot.user?.id)?.delete();
                            message.delete();
                        }, timeout * 1000);
                    }
                }
            });
        }
    });
}

async function SetupBotEvents() {
    glob(`${__dirname}/bot/events/*.js`, async (err: Error | null, result: string[]) => {
        for (let filePath of result) {
            filePath = `file://${filePath}`

            const module = await import(filePath);
            if (!module.default) throw "No default export was defined in " + filePath;
            initModuleOnBotReady(module);

            const eventName = helpers.match(filePath, /\/bot\/events\/(.+).js/);
            if (!eventName) throw `Could not get event name from path (${filePath})`;
            bot.on(eventName, module.default);
        }
    });
}
//#endregion
