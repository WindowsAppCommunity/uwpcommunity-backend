import { Request, Response } from "express";
import { HttpStatus, BuildResponse } from "../../../common/helpers/responseHelper";
const request = require("request");

function log(...args: any[]) {
    console.log(`GET /signin/: \x1b[33m${Array.from(arguments)}\x1b[0m`);
}

module.exports = (req: Request, res: Response) => {
    if (!req.query.refreshToken) {
        BuildResponse(res, HttpStatus.MalformedRequest, "Missing refreshToken");
        return;
    }

    let refreshToken = req.query.refreshToken;
    request.post({
        url: 'https://discordapp.com/api/oauth2/token',
        form: {
            client_id: process.env.discord_client,
            client_secret: process.env.discord_secret,
            grant_type: "refresh_token",
            refresh_token: refreshToken,
            redirect_uri: "http://uwpcommunity-site-backend.herokuapp.com/signin/redirect",
            scope: "identify guilds"
        }
    }, (err: Error, httpResponse: any, body: string) => {
        BuildResponse(res, HttpStatus.Success, JSON.stringify(body));
    });
};


interface IDiscordAuthResponse {
    "access_token": string;
    "token_type": "Bearer"
    "expires_in": number,
    "refresh_token": string,
    "scope": string;
};