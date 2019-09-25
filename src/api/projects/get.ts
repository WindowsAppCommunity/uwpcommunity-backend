import { Request, Response } from "express";
import User from "../../models/User";
import Project, { DbToStdModal_Project } from "../../models/Project";
import { Dirent } from "fs";
import * as path from 'path';
import { IProject } from "../../models/types";
import { genericServerError } from "../../common/helpers/generic";

module.exports = (req: Request, res: Response) => {
    getProjects(req.query.token)
        .then(result => {
            res.json(result);
        })
        .catch(err => genericServerError(err, res));
};

export function getProjects(token?: string): Promise<IProject[]> {
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
                        if (proj) projects.push(proj);
                    }

                    resolve(projects);
                }
            })
            .catch(reject);
    });
}
