import { Column, CreatedAt, Model, Table, UpdatedAt, ForeignKey, BelongsTo, PrimaryKey, AutoIncrement, DataType, BelongsToMany } from 'sequelize-typescript';
import User, { getUserByDiscordId } from './User';
import * as faker from 'faker'
import UserProject, { GetProjectCollaborators } from './UserProject';
import { IProject, IProjectCollaborator } from './types';
import { levenshteinDistance } from '../common/helpers/generic';
import { getImagesForProject } from './ProjectImage';

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

export function getProjectsByDiscordId(discordId: string): Promise<Project[]> {
    return new Promise((resolve, reject) => {
        Project.findAll({
            include: [{
                model: User,
                where: { discordId: discordId }
            }]
        }).then(projects => {
            if (!projects) { reject("User not found"); return; }
            resolve(projects);
        }).catch(reject);
    });
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

export function getAllProjects(): Promise<IProject[]> {
    return new Promise(async (resolve, reject) => {

        const DbProjects = await Project.findAll().catch(reject);
        let projects: IProject[] = [];

        if (DbProjects) {
            for (let project of DbProjects) {
                let proj = await DbToStdModal_Project(project).catch(reject);
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

export async function DbToStdModal_Project(project: Project): Promise<IProject> {
    const collaborators: IProjectCollaborator[] = await GetProjectCollaborators(project.id);
    // Due to load times, this has been disabled, and the feature has been postponed.
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
