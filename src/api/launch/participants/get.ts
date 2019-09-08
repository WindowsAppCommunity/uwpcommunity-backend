import { Request, Response } from "express";
import User from "../../../models/User";
import Launch from "../../../models/Launch";
import Project from "../../../models/Project";
import { Dirent } from "fs";

module.exports = (req: Request, res: Response) => {
    if (!req.query.year) {
        res.status(422);
        res.json(JSON.stringify({
            error: "Malformed request",
            reason: "Year parameter not specified"
        }));
        return;
    }

    getProjectsByLaunchYearCached(req.query.year)
        .then(result => {
            res.end(JSON.stringify(result));
        })
        .catch(err => {
            res.status(500);
            res.end(`Internal server error: ${err}`);
        });
};

export function getProjectsByLaunchYear(year: number, shouldCache = true): Promise<Project[]> {
    return new Promise((resolve, reject) => {
        Project
            .findAll({
                include: [{
                    model: Launch,
                    where: { year: year }
                }, User]
            })
            .then(results => {
                if (shouldCache) fs.writeFile(launchTableCachePath, JSON.stringify(results), () => { }); // Cache the results
                resolve(results);
            })
            .catch(reject);
    });
}


// Get and cache the list of launch participants
// This API is our only surface for interacting with the database, so the cache should be updated when a new participant is added
const fs = require("fs");
const launchTableCacheFilename: string = "launchTableCache.json";
const launchTableCachePath = __dirname + "/" + launchTableCacheFilename;

export function getProjectsByLaunchYearCached(year: number): Promise<Project[]> {
    return new Promise((resolve, reject) => {

        fs.readdir(__dirname, (err: Error, fileResults: string[] | Buffer[] | Dirent) => {
            // If missing, get data from database and create the cache
            if (!(fileResults instanceof Array && fileResults instanceof String) || !fileResults.includes(launchTableCacheFilename)) {
                console.info("Data not cached, refreshing from DB");
                getProjectsByLaunchYear(year)
                    .then(resolve)
                    .catch(reject)
                return;
            }

            // If the file exists, get the contents
            fs.readFile(launchTableCachePath, (err: Error, file: string[] | Buffer[] | Dirent) => {
                let fileContents = file.toString();

                if (fileContents.length <= 5) {
                    // Retry
                    getProjectsByLaunchYearCached(year);
                    return;
                }
                resolve(JSON.parse(fileContents));
            });
        });

    });
}