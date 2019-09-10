import { Request, Response } from "express";
import User from "../../models/User"
import { IUser } from "../../models/types";

module.exports = (req: Request, res: Response) => {
    getUserByToken(req.query.token)
        .then(results => {
            res.end(JSON.stringify(results))
        })
        .catch(err => {
            console.error(err);
            res.status(500);
            res.end(`Internal server error: ${err}`);
        });
};

function getUserByToken(token: string): Promise<IUser> {
    return new Promise<IUser>((resolve, reject) => {
        User.findAll({
            where: { discordId: token }
        }).then(users => {
            if (users.length === 0) {
                reject(`User with ID ${token} not found`);
                return;
            }
            resolve(users[0]);
        }).catch(reject);
    });
}
