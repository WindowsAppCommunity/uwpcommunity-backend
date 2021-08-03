import { Column, CreatedAt, Model, Table, UpdatedAt, PrimaryKey, AutoIncrement, DataType, BelongsToMany, HasMany } from 'sequelize-typescript';
import User, { getUserByDiscordId } from './User';
import UserProject, { DbToStdModal_UserProject, GetProjectCollaborators } from './UserProject';
import { IProject, IProjectCollaborator } from './types';
import { levenshteinDistance, match } from '../common/helpers/generic';
import Tag, { DbToStdModal_Tag } from './Tag';
import ProjectTag from './ProjectTag';
import fs from 'fs';
import { BuildResponse, HttpStatus, ResponsePromiseReject } from '../common/helpers/responseHelper';
import { Response } from 'express';
import { GetGuildUser } from '../common/helpers/discord';
import ProjectImage from './ProjectImage';

@Table
export default class Project extends Model<Project> {

    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id!: number;


    @Column
    appName!: string;

    @Column
    description!: string;

    @Column
    isPrivate!: boolean;

    @Column
    downloadLink!: string;

    @Column
    githubLink!: string;

    @Column
    externalLink!: string;

    @Column
    awaitingLaunchApproval!: boolean;

    @Column
    needsManualReview!: boolean;

    @Column
    lookingForRoles!: string;

    @Column
    heroImage!: string;

    @Column
    appIcon!: string;

    @Column
    accentColor!: string;

    @BelongsToMany(() => User, () => UserProject)
    users?: User[];

    @BelongsToMany(() => Tag, () => ProjectTag)
    tags?: Tag[];

    @HasMany(() => UserProject)
    userProjects!: UserProject[];

    @Column
    category!: string;

    @CreatedAt
    @Column
    createdAt!: Date;

    @UpdatedAt
    @Column
    updatedAt!: Date;
}

export function isExistingProject(appName: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        Project.findAll({
            where: { appName: appName }
        }).then(projects => {
            resolve(projects.length > 0);
        }).catch(reject)
    });
}

export async function getProjectsByDiscordId(discordId: string): Promise<Project[]> {
    let projects = await getAllDbProjects().catch(x => Promise.reject(x));

    projects = projects.filter(x => x.users?.filter(x => x.discordId == discordId).length ?? 0 > 0);

    if (!projects)
        Promise.reject("User not found");

    return projects;
}

export function getOwnedProjectsByDiscordId(discordId: string): Promise<Project[]> {
    return new Promise(async (resolve, reject) => {
        // Get user by id
        const user = await getUserByDiscordId(discordId).catch(reject);
        if (!user)
            return;

        // Get user projects with this id
        const userProjects = await UserProject.findAll({ where: { userId: user.id, isOwner: true } }).catch(reject);
        if (!userProjects)
            return;

        const results: Project[] = [];
        // Get projects
        for (let userProject of userProjects) {
            const project = await Project.findOne({ where: { id: userProject.projectId } }).catch(reject);
            if (project) {
                results.push(project);
            }
        }

        resolve(results);
    });
}

export interface ISimilarProjectMatch {
    distance: number;
    appName: string;
}

export let IsRefreshingCache = false;
export let IsCacheInitialized = false;

export async function RefreshProjectCache() {
    IsCacheInitialized = false;
    IsRefreshingCache = true;

    await getAllProjects();

    IsRefreshingCache = false;
    IsCacheInitialized = true;
}

export function ProjectFieldsAreValid(project: IProject, res: Response): boolean {
    // Make sure download link is a valid URL
    if (project.downloadLink && !match(project.downloadLink, /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/ig)) {
        BuildResponse(res, HttpStatus.MalformedRequest, "Invalid downloadLink");
        return false;
    }

    // Make sure github link is a valid URL
    if (project.githubLink && !match(project.githubLink, /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/ig)) {
        BuildResponse(res, HttpStatus.MalformedRequest, "Invalid githubLink");
        return false;
    }

    // Make sure external link is a valid URL
    if (project.externalLink && !match(project.externalLink, /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/ig)) {
        BuildResponse(res, HttpStatus.MalformedRequest, "Invalid externalLink");
        return false;
    }

    // Make sure hero image is an image URL or a microsoft store image
    if (project.heroImage && isInvalidImage(project.heroImage)) {
        if (!project.heroImage.includes("https")) {
            BuildResponse(res, HttpStatus.MalformedRequest, "heroImage must be hosted on https");
            return false;
        }

        BuildResponse(res, HttpStatus.MalformedRequest, "Invalid heroImage");
        return false;
    }

    // Make sure images given are an image URL or a microsoft store image
    if (project.images) {
        for (let image of project.images) {
            if (isInvalidImage(image)) {
                if (!image.includes("https")) {
                    BuildResponse(res, HttpStatus.MalformedRequest, "Images must be hosted on https");
                    return false;
                }

                BuildResponse(res, HttpStatus.MalformedRequest, "Invalid image");
                return false;
            }
        }
    }

    // Make sure app icon is an image URL or a microsoft store image
    if (project.appIcon && isInvalidImage(project.appIcon)) {
        if (!project.appIcon.includes("https")) {
            BuildResponse(res, HttpStatus.MalformedRequest, "appIcon must be hosted on https");
            return false;
        }

        BuildResponse(res, HttpStatus.MalformedRequest, "Invalid appIcon");
        return false;
    }

    return true;
}

function isInvalidImage(image: string) : boolean {
    return !match(image, /(?:(?:https:\/\/))[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b(?:[-a-zA-Z0-9@:%_\+.~#?&\/=].+(\.jpe?g|\.png|\.gif))/) && !match(image, /(https:\/\/store-images.s-microsoft.com)/);
}

export function nukeProject(appName: string, discordId: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        getAllDbProjects()
            .then(async (allProjects) => {
                const projects = allProjects.filter(x => x.appName == appName);

                if (projects.length === 0) { ResponsePromiseReject(`Project with name "${appName}" could not be found.}`, HttpStatus.NotFound, reject); return; }
                if (projects.length > 1) { ResponsePromiseReject("More than one project with that name found. Contact a system administrator to fix the data duplication", HttpStatus.InternalServerError, reject); return; }

                const guildMember = await GetGuildUser(discordId);
                const isMod = guildMember && guildMember.roles.cache.filter(role => role.name.toLowerCase() === "mod" || role.name.toLowerCase() === "admin").array.length > 0;

                const collaborators = await GetProjectCollaborators(projects[0].id);
                const userCanModify = collaborators.filter(x => x.isOwner && x.discordId == discordId).length > 0 || isMod;

                if (!userCanModify) {
                    ResponsePromiseReject("Unauthorized user", HttpStatus.Unauthorized, reject);
                    return;
                }

                const projectTags = await ProjectTag.findAll({ where: { projectId: projects[0].id } }).catch(err => ResponsePromiseReject(err, HttpStatus.InternalServerError, reject)) as ProjectTag[] | null;

                for (var tag of projectTags ?? []) {
                    await tag.destroy();
                }

                const projectImages = await ProjectImage.findAll({ where: { projectId: projects[0].id } }).catch(err => ResponsePromiseReject(err, HttpStatus.InternalServerError, reject)) as ProjectImage[] | null;

                for (let image of projectImages ?? []) {
                    await image.destroy();
                }

                const userProjects = await UserProject.findAll({ where: { projectId: projects[0].id } }).catch(err => ResponsePromiseReject(err, HttpStatus.InternalServerError, reject)) as UserProject[] | null;

                for(const userProject of userProjects ?? []) {
                    await userProject.destroy();
                }

                projects[0].destroy({ force: true })
                    .then(resolve)
                    .catch(err => ResponsePromiseReject(err, HttpStatus.InternalServerError, reject));
                    
            }).catch(err => ResponsePromiseReject(err, HttpStatus.InternalServerError, reject));
    });
}

export async function getAllDbProjects(customWhere: any = undefined): Promise<Project[]> {
    const dbProjects = await Project.findAll({
        include: [{
            all: true
        }],
        where: customWhere,
    }).catch(Promise.reject);

    return (dbProjects);
}

export function getAllProjects(customWhere: any = undefined, cached: boolean = false): Promise<IProject[]> {
    return new Promise(async (resolve, reject) => {
        if (cached && IsCacheInitialized) {
            var file = fs.readFileSync("./projects.json", {}).toString();
            var cachedProjects = JSON.parse(file) as IProject[];
            resolve(cachedProjects);
        } else {
            const DbProjects = await getAllDbProjects(customWhere).catch(reject);

            let projects: IProject[] = [];

            if (DbProjects) {
                for (let project of DbProjects) {
                    let proj = DbToStdModal_Project(project);
                    if (proj) {
                        projects.push(proj);
                    }
                }
            }

            fs.writeFileSync("./projects.json", JSON.stringify(projects), {});

            IsCacheInitialized = true;

            resolve(projects);
        }
    });
}

/**
 * @summary Looks through a list of projects to find the closest matching app name
 * @param projects Array of projects to look through 
 * @param appName App name to match against
 * @returns Closest suitable match if found, otherwise undefined
 */
export function findSimilarProjectName(projects: Project[], appName: string, maxDistance: number = 7): string | undefined {
    let matches: ISimilarProjectMatch[] = [];

    // Calculate and store the distances of each possible match
    for (let project of projects) {
        matches.push({ distance: levenshteinDistance(project.appName, appName), appName: project.appName });
    }

    const returnData = matches[0].appName + (matches.length > 1 ? " or " + matches[1].appName : "");

    // Sort by closest match 
    matches = matches.sort((first, second) => first.distance - second.distance);

    // If the difference is less than X characters, return a possible match.
    if (matches[0].distance <= maxDistance) return returnData; // 7 characters is just enough for a " (Beta)" label

    // If the difference is greater than 1/3 of the entire string, don't return as a similar app name
    if ((appName.length / 3) < matches[0].distance) return;

    return returnData;
}

//#region Converters
/** @summary This converts the data model ONLY, and does not represent the actual data in the database */
export async function StdToDbModal_Project(project: Partial<IProject>): Promise<Partial<Project>> {
    const dbProject: Partial<Project> = {
        category: project.category,
        appName: project.appName,
        description: project.description,
        isPrivate: project.isPrivate,
        downloadLink: project.downloadLink,
        githubLink: project.githubLink,
        externalLink: project.externalLink,
        awaitingLaunchApproval: project.awaitingLaunchApproval,
        needsManualReview: project.needsManualReview,
        heroImage: project.heroImage,
        appIcon: project.appIcon,
        accentColor: project.accentColor,
        lookingForRoles: JSON.stringify(project.lookingForRoles)
    };
    return (dbProject);
}

export function DbToStdModal_Project(project: Project): IProject {
    const collaborators: (IProjectCollaborator | undefined)[] = project.userProjects?.map(DbToStdModal_UserProject);

    const stdProject: IProject = {
        id: project.id,
        appName: project.appName,
        description: project.description,
        isPrivate: project.isPrivate,
        downloadLink: project.downloadLink,
        githubLink: project.githubLink,
        externalLink: project.externalLink,
        collaborators: collaborators.filter(x => x != undefined) as IProjectCollaborator[],
        category: project.category,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        awaitingLaunchApproval: project.awaitingLaunchApproval,
        needsManualReview: project.needsManualReview,
        images: [],
        features: [],
        tags: project.tags?.map(DbToStdModal_Tag) ?? [],
        heroImage: project.heroImage,
        appIcon: project.appIcon,
        accentColor: project.accentColor,
        lookingForRoles: JSON.parse(project.lookingForRoles)
    };

    return (stdProject);
}
//#endregion
