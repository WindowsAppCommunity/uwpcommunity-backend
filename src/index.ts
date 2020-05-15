import { Request, Response, NextFunction } from "express";
import { InitBot, bot } from "./common/helpers/discord";
import { InitDb, CreateMocks } from './common/sequalize';
import * as helpers from './common/helpers/generic';
import cors from "cors";
import { IBotCommandArgument } from "./models/types";

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

const express = require('express'), app = express();
const expressWs = require('express-ws')(app);

const bodyParser = require('body-parser');
const glob = require('glob');
const swaggerUi = require('swagger-ui-express');

const PORT = process.env.PORT || 5000;
const MOCK = process.argv.filter(val => val == 'mock').length > 0;

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

InitDb().then(() => {
    if (MOCK) CreateMocks()
});

InitBot();
SetupAPI();
SetupBotScripts();

app.listen(PORT, (err: string) => {
    if (err) {
        console.error(`Error while setting up port ${PORT}:`, err);
        return;
    }
    console.log(`Ready, listening on port ${PORT}`);
});


//#region Setup 

let HttpMethodsRegex = /((?:post|get|put|patch|delete|ws)+)(?:.js)/;

function SetupAPI() {
    glob(__dirname + '/api/**/*.js', function (err: Error, result: string[]) {
        for (let filePath of result) {

            if (!filePath.includes("node_modules") && helpers.match(filePath, HttpMethodsRegex)) {
                let serverPath = filePath.replace(HttpMethodsRegex, "").replace("/app", "").replace("/api", "").replace("/build", "");

                if (helpers.match(serverPath, /{(.+)}\/?$/)) {
                    // Check paths with route params for sibling folders  
                    const folderPath = filePath.replace(/{.+}(.+)$/, "\/\*\/");
                    glob(folderPath, (err: Error, siblingDir: string[]) => {
                        if (siblingDir.length > 1) throw new Error("Folder representing a route parameter cannot have sibling folders: " + folderPath);
                    });
                }

                // Reformat route params from folder-friendly to express spec
                serverPath = serverPath.replace(/{([^\/]+)}/g, ":$1");

                if (helpers.DEVENV) serverPath = serverPath.replace(__dirname.replace(/\\/g, `/`).replace("/build", ""), "");

                const method = helpers.match(filePath, HttpMethodsRegex);
                if (!method) continue;

                console.log(`Setting up ${filePath} as ${method.toUpperCase()} ${serverPath}`);

                switch (method) {
                    case "post":
                        app.post(serverPath, require(filePath));
                        break;
                    case "get":
                        app.get(serverPath, require(filePath));
                        break;
                    case "put":
                        app.put(serverPath, require(filePath));
                        break;
                    case "patch":
                        app.patch(serverPath, require(filePath));
                        break;
                    case "delete":
                        app.delete(serverPath, require(filePath));
                        break;
                    case "ws":
                        app.ws(serverPath, require(filePath)(expressWs, serverPath));
                        break;
                }
            }
        }
    });

    const yaml = require('js-yaml');
    const fs = require('fs');

    // Get document, or throw exception on error
    try {
        const doc = yaml.safeLoad(fs.readFileSync('./src/api.yaml', 'utf8'));
        app.use('/__docs', swaggerUi.serve, swaggerUi.setup(doc));
        app.get('/swagger.json', (req: Request, res: Response) => res.json(doc));
    } catch (e) {
        console.log(e);
    }
}

async function SetupBotScripts() {
    await SetupBotCommands();
    await SetupBotEvents();
}

async function SetupBotCommands() {
    glob(`${__dirname}/bot/commands/*.js`, async (err: Error, result: string[]) => {
        for (let filePath of result) {
            const module = await import(filePath);
            if (!module.default) throw "No default export was defined in " + filePath;

            const commandPrefix = helpers.match(filePath, /\/bot\/commands\/(.+).js/);
            if (!commandPrefix) return;

            bot.on('message', message => {
                // Message must be prefixed
                if (message.content.startsWith(`!${commandPrefix}`)) {

                    if (message.mentions.everyone)
                        return; // Don't allow mentioning everyone

                    const argsRegexMatch = message.content.matchAll(/ (?:\/|-)([a-zA-Z1-9]+) (?:(\w+)|\"([\w\s]+)\")/gm);
                    const argsMatch = Array.from(argsRegexMatch);
                    let args : IBotCommandArgument[] = argsMatch.map(i => { return { name: i[1], value: i[2] || i[3] } });

                    message.content = helpers.remove(message.content, `!${commandPrefix}`).trim(); // Remove the prefix before passing it to the script
                    module.default(message, args);
                }
            });
        }
    });
}

async function SetupBotEvents() {
    glob(`${__dirname}/bot/events/*.js`, async (err: Error, result: string[]) => {
        for (let filePath of result) {
            const module = await import(filePath);
            if (!module.default) throw "No default export was defined in " + filePath;

            const eventName = helpers.match(filePath, /\/bot\/events\/(.+).js/);
            if (!eventName) throw `Could not get event name from path (${filePath})`;
            bot.on(eventName, module.default);
        }
    });
}
//#endregion
