import { Request, Response } from "express";
import { IProjectCollaborator } from "../../../models/types";
import { genericServerError } from "../../../common/helpers/generic";
import { GetProjectCollaborators } from "../../../models/UserProject";

module.exports = (req: Request, res: Response) => {
    const queryCheck = checkQuery(req.query);
    if (queryCheck !== true) {
        res.status(422);
        res.json({
            error: "Malformed request",
            reason: `Query string "${queryCheck}" not provided or malformed`
        });
        return;
    }

    getProjectCollaborators(req.query, res)
        .then(result => {
            res.send(result);
        })
        .catch(err => genericServerError(err, res));
};

export async function getProjectCollaborators(projectRequestData: IGetProjectsRequestQuery, res: Response): Promise<IProjectCollaborator[] | void> {
    const collaborators: IProjectCollaborator[] | void = await GetProjectCollaborators(projectRequestData.projectId).catch(err => genericServerError(err, res));
    return collaborators;
}

function checkQuery(query: IGetProjectsRequestQuery) {
    if (query.projectId == undefined) return "projectId";
    return true;
}

interface IGetProjectsRequestQuery {
    projectId: number;
}
