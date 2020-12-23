import { Column, CreatedAt, Model, Table, UpdatedAt, ForeignKey, BelongsTo, PrimaryKey, AutoIncrement, DataType, BelongsToMany, HasMany } from 'sequelize-typescript';
import User, { getUserByDiscordId } from './User';
import * as faker from 'faker'
import UserProject, { DbToStdModal_UserProject, GetProjectCollaborators } from './UserProject';
import { IProject, IProjectCollaborator } from './types';
import { levenshteinDistance } from '../common/helpers/generic';
import { getImagesForProject } from './ProjectImage';
import Role from './Role';
import Tag from './Tag';
import ProjectTag from './ProjectTag';
import ModelManager from 'sequelize/types/lib/model-manager';

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

export let CachedProjects: Project[] = [];

export let IsRefreshingCache = false;

export async function RefreshProjectCache() {
    CachedProjects.length = 0;
    IsRefreshingCache = true;

    await getAllProjects();

    IsRefreshingCache = false;
}

export async function getAllDbProjects(customWhere: any = undefined): Promise<Project[]> {
    if (CachedProjects.length > 0 && !IsRefreshingCache) {
        return CachedProjects;
    }

    const dbProjects = await Project.findAll({
        include: [{
            all: true, include: [{ all: true }],
        }],
        where: customWhere,
    })
        .catch(x => Promise.reject(x));

    CachedProjects = dbProjects;

    return dbProjects;
}

export function getAllProjects(customWhere: any = undefined): Promise<IProject[]> {
    return new Promise(async (resolve, reject) => {

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

        resolve(projects);
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
    const collaborators: IProjectCollaborator[] = project.userProjects.map(DbToStdModal_UserProject);
    // Due to load times, this has been disabled, and the feature has been postponed.
    // edit: to fix this, include the model in the database request (see getAllProjects)
    //const images: string[] = (await getImagesForProject(project.id).catch(console.log)) || [];

    const stdProject: IProject = {
        id: project.id,
        appName: project.appName,
        description: project.description,
        isPrivate: project.isPrivate,
        downloadLink: project.downloadLink,
        githubLink: project.githubLink,
        externalLink: project.externalLink,
        collaborators: collaborators,
        category: project.category,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        awaitingLaunchApproval: project.awaitingLaunchApproval,
        needsManualReview: project.needsManualReview,
        images: [],
        heroImage: project.heroImage,
        appIcon: project.appIcon,
        accentColor: project.accentColor,
        lookingForRoles: JSON.parse(project.lookingForRoles)
    };

    return (stdProject);
}
//#endregion
