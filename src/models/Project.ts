import { Column, CreatedAt, Model, Table, UpdatedAt, ForeignKey, BelongsTo, PrimaryKey, AutoIncrement, DataType, BelongsToMany } from 'sequelize-typescript';
import User from './User';
import Launch, { GetLaunchIdFromYear, GetLaunchYearFromId } from './Launch';
import * as faker from 'faker'
import UserProject from './UserProject';
import Category, { GetCategoryIdFromName, GetCategoryNameFromId } from './Category';
import { IProject } from './types';

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

export async function StdToDbModal_Project(project: IProject): Promise<Project | undefined> {
    const categoryId = await GetCategoryIdFromName(project.category);
    if (!categoryId) return;

    const launchId = await GetLaunchIdFromYear(project.launchYear);
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
    return dbProject as Project;
}

export async function DbToStdModal_Project(project: Project): Promise<IProject | undefined> {
    const categoryName = await GetCategoryNameFromId(project.categoryId);
    if (!categoryName) return;

    const launchYear = await GetLaunchYearFromId(project.launchId);
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
    return stdProject;
}

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