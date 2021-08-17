import { Request, Response } from "express";
import { DbToStdModal_Project, getAllDbProjects } from "../../../models/Project";
import ProjectTag from "../../../models/ProjectTag";
import Tag from "../../../models/Tag";
import { ITag } from "../../../models/types";

module.exports = async (req: Request, res: Response) => {
    const reqQuery = req.query as IGetProjectTagRequestQuery;

    const queryValidation = checkQuery(reqQuery);
    if (queryValidation !== true) {
        res.send(queryValidation);
        return;
    }

    if (reqQuery.projectId !== undefined) {
        var tags = await GetByProjectId(reqQuery.projectId);
        res.json(tags);
        return;
    }

    const dbProjects = await getAllDbProjects();

    var filteredDbProjects = dbProjects.filter(x => (x.tags?.filter(x => x.id == reqQuery.tagId || x.name == reqQuery.tagName).length ?? 0 > 0) && !x.isPrivate);
    var filteredProjects = filteredDbProjects.map(DbToStdModal_Project);

    res.json(filteredProjects);
};


async function GetByProjectId(projectId: number): Promise<ITag[]> {
    const projectTags = await ProjectTag.findAll({ where: { projectId: projectId } });
    if (!projectTags || projectTags.length == 0) {
        return [];
    }

    var returnData : ITag[] = [];

    for (var projectTag of projectTags) {
        var tag = await Tag.findAll({ where: { id: projectTag.tagId }});

        returnData.push({name: tag[0].name, id: tag[0].id});
    }

    return returnData;
}

function checkQuery(query: IGetProjectTagRequestQuery): true | string {
    if (query.tagId && query.tagName)
        return "Only one of 'tagId' or 'tagName' should be specified.";

    if (query.tagId && query.projectId)
        return "Only one of 'tagId' or 'projectId' should be specified.";

    if (query.tagName && query.projectId)
        return "Only one of 'tagName' or 'projectId' should be specified.";

    if (query.tagId == undefined && query.tagName == undefined && query.projectId == undefined)
        return "Either 'tagId', 'tagName' or 'projectId' should be specified.";

    return true;
}


interface IGetProjectTagRequestQuery {
    tagId?: number;
    tagName?: string;
    projectId?: number;
}