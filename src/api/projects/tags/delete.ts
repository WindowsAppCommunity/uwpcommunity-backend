import { Request, Response } from "express";
import { GetDiscordIdFromToken, GetGuildUser } from "../../../common/helpers/discord";
import { validateAuthenticationHeader } from "../../../common/helpers/generic";
import { BuildResponse, HttpStatus, IRequestPromiseReject, ResponsePromiseReject } from "../../../common/helpers/responseHelper";
import { getAllDbProjects, RefreshProjectCache } from "../../../models/Project";
import ProjectTag from "../../../models/ProjectTag";
import Tag from "../../../models/Tag";
import { IProject, ITag } from "../../../models/types";
import { UserOwnsProject } from "../../../models/UserProject";

module.exports = async (req: Request, res: Response) => {
    const body = req.body as IDeleteProjectTagsRequestBody;
    const reqQuery = req.query as IDeleteProjectTagsRequestQuery;

    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    let discordId = await GetDiscordIdFromToken(authAccess, res);
    if (!discordId) return;

    const queryValidation = checkQuery(reqQuery);
    if (queryValidation !== true) {
        res.send(queryValidation);
        return;
    }

    const bodyCheck = checkBody(body);
    if (bodyCheck !== true) {
        BuildResponse(res, HttpStatus.MalformedRequest, `Parameter "${bodyCheck}" not provided or malformed`);
        return;
    }

    if (!checkPermission(body, reqQuery, discordId)) {
        res.status(HttpStatus.Unauthorized).send("Unauthorized user");
        return;
    }

    removeTag(body, reqQuery, discordId)
        .then(() => {
            BuildResponse(res, HttpStatus.Success, "Success");
            RefreshProjectCache();
        })
        .catch((err: IRequestPromiseReject) => BuildResponse(res, err.status, err.reason));
};

function checkBody(body: IDeleteProjectTagsRequestBody): true | string {
    if (!body.name) return "name";

    return true;
}

function checkQuery(query: IDeleteProjectTagsRequestQuery): true | string {
    if (query.projectId && query.appName)
        return "Only one of 'projectId' or 'appName' should be specified.";

    if (query.projectId == undefined && query.appName == undefined)
        return "Either 'projectId' or 'appName' should be specified.";

    return true;
}

async function removeTag(body: IDeleteProjectTagsRequestBody, query: IDeleteProjectTagsRequestQuery, discordId: string) {
    return new Promise(async (resolve, reject) => {
        const tag = body as ITag;

        const allDbProjects = await getAllDbProjects();

        const project = allDbProjects.filter(x => x.appName == query.appName || x.id == query.projectId)[0];

        if (!project.tags) {
            ResponsePromiseReject("No tags found on this project.", HttpStatus.BadRequest, reject);
            return;
        }

        // Tag needs to be added only if it doesn't exist.
        const matchingTags = project.tags.filter(x => x.name == tag.name || x.id == tag.id);
        const tagExists = matchingTags.length ?? 0 > 0;

        if (!tagExists) {
            ResponsePromiseReject("Tag doesn't exist on this project.", HttpStatus.BadRequest, reject);
            return;
        }

        if (tagExists) {
            var projectTags = await ProjectTag.findAll();
            var relevantProjectTags = projectTags.filter(x => x.tagId == matchingTags[0].id);

            relevantProjectTags[0].destroy()
                .then(resolve)
                .catch(err => ResponsePromiseReject(err, HttpStatus.InternalServerError, reject));
                
            RefreshProjectCache();
            return;
        }

        resolve();
    });
}

async function checkPermission(body: IDeleteProjectTagsRequestBody, query: IDeleteProjectTagsRequestQuery, discordId: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
        const allDbProjects = await getAllDbProjects();
        const matchingDbProjects = allDbProjects.filter(x => x.appName == query.appName || x.id == query.projectId);

        if (matchingDbProjects.length == 0) {
            ResponsePromiseReject("No project found.", HttpStatus.BadRequest, reject);
            return;
        }

        const guildMember = await GetGuildUser(discordId);
        const isMod = guildMember && guildMember.roles.cache.array().filter(role => role.name.toLowerCase() === "mod" || role.name.toLowerCase() === "admin").length > 0;

        const relevantUser = matchingDbProjects[0].users?.filter(x => x.discordId == discordId);
        if (relevantUser?.length ?? 0 === 0) {
            ResponsePromiseReject("No user found.", HttpStatus.Unauthorized, reject);
            return;
        }

        const userOwnsProject: boolean = await UserOwnsProject(relevantUser![0], matchingDbProjects[0]);
        const userCanModify = isMod || userOwnsProject;

        if (!userCanModify) {
            resolve(false);
        } else {
            ResponsePromiseReject("No permission to edit project.", HttpStatus.Unauthorized, reject);
        }
    });
}


type IDeleteProjectTagsRequestBody = ITag;

interface IDeleteProjectTagsRequestQuery {
    appName?: string;
    projectId?: number;
}
