import { Request, Response } from "express";
import User from "../../models/User";
import Project, { DbToStdModal_Project } from "../../models/Project";
import { Dirent } from "fs";
import * as path from 'path';
import { IProject } from "../../models/types";
import { genericServerError } from "../../common/helpers/generic";

module.exports = (req: Request, res: Response) => {
    getProjectsCached(req.query.token)
        .then(result => {
            res.json(result);
        })
        .catch(err => genericServerError(err, res));
};

export function getProjects(token?: string, shouldCache = true): Promise<IProject[]> {
    return new Promise((resolve, reject) => {
        Project
            .findAll((token ? {
                include: [{
                    model: User,
                    where: { discordId: token }
                }]
            } : undefined))
            .then(async results => {
                if (results) {
                    let projects: IProject[] = [];

                    for (let project of results) {
                        let proj = await DbToStdModal_Project(project).catch(reject);
                        console.log(proj);
                        if (proj) projects.push(proj);
                    }

                    resolve(projects);
                    if (shouldCache) fs.writeFile(launchTableCachePath, JSON.stringify(projects), () => { }); // Cache the results
                }
            })
            .catch(reject);
    });
}


// Get and cache the list of launch participants
// This API is our only surface for interacting with the database, so the cache should be updated when a new participant is added
const fs = require("fs");
const launchTableCacheFilename: string = "launchTableCache.json";
const launchTableCachePath = path.join(__dirname, launchTableCacheFilename);

export function getProjectsCached(token?: string): Promise<IProject[]> {
    return new Promise((resolve, reject) => {

        fs.readdir(__dirname, (err: Error, fileResults: string[] | Buffer[] | Dirent) => {
            // If missing, get data from database and create the cache
            if (!(fileResults instanceof Array && fileResults instanceof String) || !fileResults.includes(launchTableCacheFilename)) {
                console.info("Data not cached, refreshing from DB");
                getProjects(token)
                    .then(resolve)
                    .catch(reject)
                return;
            }

            // If the file exists, get the contents
            fs.readFile(launchTableCachePath, (err: Error, file: string[] | Buffer[] | Dirent) => {
                let fileContents = file.toString();

                if (fileContents.length <= 5) {
                    // Retry
                    getProjectsCached(token);
                    return;
                }
                resolve(JSON.parse(fileContents));
            });
        });

    });
}