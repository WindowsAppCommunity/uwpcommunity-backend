import { Request, Response } from "express";
import { Buffer } from "buffer";
import { Dirent } from "fs";
import { IQueryResult } from "./dbclient";
import { User } from "./User";


module.exports = (req: Request, res: Response) => {
    stuff();
    // if (!req.query.year) {
    //     res.status(422);
    //     res.json(JSON.stringify({
    //         error: "Malformed request",
    //         reason: "Year parameter not specified"
    //     }));
    //     return;
    // }
    // getLaunchCached(req.query.year, res, (results: string) => {
    //     res.end(results);
    // });
};

function getLaunchTable(year: number, res: Response, cb: Function) {
    // db.query(`select * from participants LEFT JOIN years ON participants.year_id = years.id where years.year = '${year}'`, (err: string, queryResults: IQueryResult) => {

    //     if (err) {
    //         if (err.toString().includes("does not exist")) {
    //             res.status(404);
    //             res.json(JSON.stringify({
    //                 error: "Not found",
    //                 reason: `Data does not exist for year ${year}`
    //             }));
    //             return;
    //         } else {
    //             console.error(err);
    //             return;
    //         }
    //     }

    //     let results = [];
    //     for (let row of queryResults.rows) {
    //         results.push(JSON.stringify(row));
    //     }

    //     fs.writeFile(launchCachePath, results, () => { }); // Cache the results
    //     cb(JSON.stringify(results));
    // });
}

async function stuff() {
    // Please note that when using async/await you lose the `bluebird` promise context
    // and you fall back to native
    const newUser = await User.create({
        name: 'Johnny',
        preferredName: 'John',
    });
    console.log(newUser.id, newUser.name, newUser.preferredName);

    const project = await newUser.createProject({
        name: 'first!',
    });

    const ourUser = await User.findByPk(1, {
        include: [User.associations.projects],
        rejectOnEmpty: true, // Specifying true here removes `null` from the return type!
    });
    console.log(ourUser.projects![0].name); // Note the `!` null assertion since TS can't know if we included
    // the model or not
}

// Get and cache the list of launch participants
// This API is our only surface for interacting with the database, so the cache should be updated when a new participant is added
const fs = require("fs");
const launchCacheFilename: string = "launchCache.json";
const launchCachePath = __dirname + "/" + launchCacheFilename;

function getLaunchCached(year: number, res: Response, cb: Function) {
    fs.readdir(__dirname, (err: Error, fileResults: string[] | Buffer[] | Dirent) => {

        // If missing, get data from database and create the cache
        if (!(fileResults instanceof Array && fileResults instanceof String) || !fileResults.includes(launchCacheFilename)) {
            console.info("Data not cached, refreshing from DB");
            getLaunchTable(year, res, (result: string) => {
                cb(result);
            });
            return;
        }

        // If the file exists, get the contents
        fs.readFile(launchCachePath, (err: Error, file: string[] | Buffer[] | Dirent) => {
            let fileContents = file.toString();

            if (fileContents.length <= 5) {
                // Retry
                getLaunchCached(year, res, cb);
                return;
            }
            cb(fileContents);
        });
    });
}