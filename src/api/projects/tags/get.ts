import { Request, Response } from "express";
import { validateAuthenticationHeader } from "../../../common/helpers/generic";
import { DbToStdModal_Project, getAllDbProjects } from "../../../models/Project";

module.exports = async (req: Request, res: Response) => {
    const reqQuery = req.query as IGetProjectTagRequestQuery;

    // If someone wants the projects for a specific user, they must be authorized
    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    const queryValidation = checkQuery(reqQuery);
    if (queryValidation !== true) {
        res.send(queryValidation);
        return;
    }

    const dbProjects = await getAllDbProjects();

    var filteredDbProjects = dbProjects.filter(x => (x.tags?.filter(x => x.id == reqQuery.id || x.name == reqQuery.name).length ?? 0 > 0) && !x.isPrivate);

    var filteredProjects = filteredDbProjects.map(DbToStdModal_Project);

    res.json(filteredProjects);
};

function checkQuery(query: IGetProjectTagRequestQuery): true | string {
    if (query.id && query.name)
        return "Only one of 'id' or 'name' should be specified.";

    if (query.id == undefined && query.name == undefined)
        return "Either 'id' or 'name' should be specified.";

    return true;
}


interface IGetProjectTagRequestQuery {
    id?: number;
    name?: string;
}