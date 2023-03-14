import { Request, Response } from "express";
import { GetDiscordIdFromToken, GetGuildUser } from "../../../common/helpers/discord";
import { genericServerError, validateAuthenticationHeader } from "../../../common/helpers/generic";
import { BuildResponse, HttpStatus, IRequestPromiseReject, ResponsePromiseReject } from "../../../common/helpers/responseHelper";
import { getAllDbProjects, RefreshProjectCache } from "../../../models/Project";
import ProjectTag from "../../../models/ProjectTag";
import Tag from "../../../models/Tag";
import { IProject, ITag } from "../../../models/types";
import { UserOwnsProject } from "../../../models/UserProject";

module.exports = async (req: Request, res: Response) => {
    const body = req.body as IPostProjectTagsRequestBody;
    const reqQuery = req.query as IPostProjectTagsRequestQuery;

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

    if (!await checkPermission(body, reqQuery, discordId).catch((err) => genericServerError(err, res))) {
        res.status(HttpStatus.Unauthorized);
        return;
    }

    createTag(body, reqQuery, discordId)
        .then(() => {
            BuildResponse(res, HttpStatus.Success, "Success");
            RefreshProjectCache();
        })
        .catch((err: IRequestPromiseReject) => BuildResponse(res, err.status, err.reason));
};

function checkBody(body: IPostProjectTagsRequestBody): true | string {
    if (!body.tagName) return "tagName";

    return true;
}

function checkQuery(query: IPostProjectTagsRequestQuery): true | string {
    if (query.projectId && query.appName)
        return "Only one of 'projectId' or 'appName' should be specified.";

    if (query.projectId == undefined && query.appName == undefined)
        return "Either 'projectId' or 'appName' should be specified.";

    return true;
}

async function checkPermission(body: IPostProjectTagsRequestBody, query: IPostProjectTagsRequestQuery, discordId: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
        const tag = body as IPostProjectTagsRequestBody;

        const allDbProjects = await getAllDbProjects();
        const matchingDbProjects = allDbProjects.filter(x => x.appName == query.appName || x.id == query.projectId);

        if (matchingDbProjects.length == 0) {
            ResponsePromiseReject("No project found.", HttpStatus.BadRequest, reject);
            return;
        }

        const guildMember = await GetGuildUser(discordId);
        const isMod = guildMember && [...guildMember.roles.cache.values()].filter(role => role.name.toLowerCase() === "mod" || role.name.toLowerCase() === "admin").length > 0;
        const isLaunchCoordinator = guildMember && ([...guildMember.roles.cache.values()].filter(role => role.name.toLowerCase() === "launch coordinator").length ?? 0) > 0;

        const relevantUser = matchingDbProjects[0].users?.filter(x => x.discordId == discordId);
        if ((relevantUser?.length ?? 0) === 0 && !isMod) {
            ResponsePromiseReject("No user found.", HttpStatus.Unauthorized, reject);
            return;
        }

        const isLaunchTag = tag.tagName?.includes("Launch ") ?? false;

        let userOwnsProject: boolean = false;

        if (relevantUser && relevantUser.length > 0)
            userOwnsProject = await UserOwnsProject(relevantUser[0], matchingDbProjects[0]);

        // Only launch coordinators can add a launch tag to a project. 
        const userCanModify = (isLaunchTag && isLaunchCoordinator) || (isMod && !isLaunchTag && !isLaunchCoordinator) || (userOwnsProject && !isLaunchTag);

        resolve(userCanModify);
    });
}

async function createTag(body: IPostProjectTagsRequestBody, query: IPostProjectTagsRequestQuery, discordId: string) {
    return new Promise<void>(async (resolve, reject) => {
        const tag = body as IPostProjectTagsRequestBody;

        const allDbProjects = await getAllDbProjects();
        const matchingDbProjects = allDbProjects.filter(x => x.appName == query.appName || x.id == query.projectId);

        if (matchingDbProjects.length == 0) {
            ResponsePromiseReject("No project found.", HttpStatus.BadRequest, reject);
            return;
        }

        const project = matchingDbProjects[0];

        if (!project.tags) {
            ResponsePromiseReject("No tags were supplied.", HttpStatus.BadRequest, reject);
            return;
        }

        // Tag needs to be added only if it doesn't exist.
        const tagExists = project.tags.filter(x => x.name == tag.tagName || x.id == tag.tagId).length > 0;

        if (!tagExists) {
            var dbTags = await Tag.findAll();
            var dbTag = dbTags.filter(x => x.id == body.tagId || x.name == body.tagName)[0];

            ProjectTag.create({
                projectId: project.id,
                tagId: dbTag.id,
            });
        } else {
            ResponsePromiseReject("Tag already exists on project.", HttpStatus.BadRequest, reject);
            return;
        }

        resolve();
    });
}

interface IPostProjectTagsRequestBody {
    tagName: string;
    tagId?: number;
}

interface IPostProjectTagsRequestQuery {
    appName?: string;
    projectId?: number;
}
