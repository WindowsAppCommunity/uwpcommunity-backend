import { Column, CreatedAt, Model, Table, UpdatedAt, ForeignKey, BelongsTo, PrimaryKey, AutoIncrement, DataType, BelongsToMany } from 'sequelize-typescript';
import User from './User';
import Launch, { GetLaunchIdFromYear, GetLaunchYearFromId } from './Launch';
import * as faker from 'faker'
import UserProject from './UserProject';
import Category, { GetCategoryIdFromName, GetCategoryNameFromId } from './Category';
import { IProject } from './types';
import { levenshteinDistance } from '../common/helpers/generic';
import { resolve } from 'bluebird';

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


    @BelongsToMany(() => User, () => UserProject)
    users?: User[];


    @ForeignKey(() => Launch)
    launchId!: number;

    @BelongsTo(() => Launch, 'launchId')
    launch!: Launch


    @ForeignKey(() => Category)
    categoryId!: number;

    @BelongsTo(() => Category, 'categoryId')
    category!: Category


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

export interface ISimilarProjectMatch {
    distance: number;
    appName: string;
}

/**
 * @summary Looks through a list of projects to find the closest matching app name
 * @param projects Array of projects to look through 
 * @param appName App name to match against
 * @returns Closest suitable match if found, otherwise undefined
 */
export function findSimilarProjectName(projects: Project[], appName: string): string | undefined {
    let matches: ISimilarProjectMatch[] = [];

    // Calculate and store the distances of each possible match
    for (let project of projects) {
        matches.push({ distance: levenshteinDistance(project.appName, appName), appName: project.appName });
    }
    const returnData = matches[0].appName + (matches.length > 1 ? " or " + matches[1].appName : "");

    // Sort by closest match 
    matches = matches.sort((first, second) => first.distance - second.distance);

    // If the difference is less than X characters, return a possible match.
    if (matches[0].distance <= 7) return returnData; // 7 characters is just enough for a " (Beta)" label

    // If the difference is greater than 1/3 of the entire string, don't return as a similar app name
    if ((appName.length / 3) < matches[0].distance) return;

    return returnData;
}

//#region Converters
/** @summary This converts the data model ONLY, and does not represent the actual data in the database */
export async function StdToDbModal_Project(project: IProject): Promise<Project> {
    return new Promise(async (resolve, reject) => {
        const categoryId = await GetCategoryIdFromName(project.category).catch(() => reject(`Invalid category: ${project.category}`));
        if (!categoryId) return;

        const launchId = await GetLaunchIdFromYear(project.launchYear).catch(() => reject(`Invalid launchYear: ${project.launchYear}`));
        if (!launchId) return;

        const dbProject: any = {
            categoryId: categoryId,
            appName: project.appName,
            description: project.description,
            isPrivate: project.isPrivate,
            launchId: launchId,
            downloadLink: project.downloadLink,
            githubLink: project.githubLink,
            externalLink: project.externalLink
        };
        resolve(dbProject);
    });
}

export async function DbToStdModal_Project(project: Project): Promise<IProject> {
    return new Promise(async (resolve, reject) => {
        const categoryName = await GetCategoryNameFromId(project.categoryId).catch(() => reject(`Invalid categoryId: ${project.categoryId}`));
        if (!categoryName) return;

        const launchYear = await GetLaunchYearFromId(project.launchId).catch(() => reject(`Invalid launchId: ${project.launchId}`));
        if (!launchYear) return;

        const stdProject: IProject = {
            id: project.id,
            appName: project.appName,
            description: project.description,
            isPrivate: project.isPrivate,
            downloadLink: project.downloadLink,
            githubLink: project.githubLink,
            externalLink: project.externalLink,
            collaborators: [], // TODO: Create DbToStdModal helpers to get collaborators,
            launchYear: launchYear,
            category: categoryName
        };
        resolve(stdProject);
    });
}
//#endregion

export async function GenerateMockProject(launch: Launch, user: User): Promise<Project> {

    let LaunchId = await GetLaunchYearFromId(launch.id);
    if (!LaunchId) LaunchId = 0;

    const mockProject: IProject = {
        collaborators: [],
        id: faker.random.number({ min: 0, max: 1000 }),
        category: "Other", // TODO: Update this when we get more than one category
        appName: faker.commerce.product(),
        description: faker.lorem.paragraph(),
        isPrivate: false,
        launchYear: LaunchId,
        downloadLink: faker.internet.url(),
        githubLink: faker.internet.url(),
        externalLink: faker.internet.url()
    };

    return new Project(await StdToDbModal_Project(mockProject));
}