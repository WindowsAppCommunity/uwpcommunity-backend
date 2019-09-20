import { Response, NextFunction } from "express";
import {  GetDiscordUser, genericServerError } from "../common/helpers";
import { AuthRequest } from "../models/types";

export default async function getUser(req: AuthRequest, res: Response, next: NextFunction) {
    if (!req.headers.authorization) {
        res.status(422);
        return res.json({
            error: "Malformed request",
            reason: `This API route needs an 'Authorization' header`
        });
    }

    const token = req.headers.authorization.replace('Bearer ', '');

    try {
        const user = await GetDiscordUser(token);
        if (!user) {
            res.status(401);
            res.end(`Invalid accessToken`);
            return;
        }

        req.user = user;
    } catch(err) {
        genericServerError(err, res)
    }
}