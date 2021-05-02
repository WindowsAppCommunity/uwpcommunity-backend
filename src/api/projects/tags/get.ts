import { Request, Response } from "express";
import { DbToStdModal_Project, getAllDbProjects } from "../../../models/Project";

module.exports = async (req: Request, res: Response) => {
    const reqQuery = req.query as IGetProjectTagRequestQuery;

    const queryValidation = checkQuery(reqQuery);
    if (queryValidation !== true) {
        res.send(queryValidation);
        return;
    }

    const dbProjects = await getAllDbProjects();

    var filteredDbProjects = dbProjects.filter(x => (x.tags?.filter(x => x.id == reqQuery.tagId || x.name == reqQuery.tagName).length ?? 0 > 0) && !x.isPrivate);
    var filteredProjects = filteredDbProjects.map(DbToStdModal_Project);

    res.json(filteredProjects);
};

function checkQuery(query: IGetProjectTagRequestQuery): true | string {
    if (query.tagId && query.tagName)
        return "Only one of 'tagId' or 'tagName' should be specified.";

    if (query.tagId == undefined && query.tagName == undefined)
        return "Either 'tagId' or 'tagName' should be specified.";

    return true;
}


interface IGetProjectTagRequestQuery {
    tagId?: number;
    tagName?: string;
}