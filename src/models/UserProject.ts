import { Column, Model, Table, ForeignKey, PrimaryKey, AutoIncrement, DataType, BelongsTo } from 'sequelize-typescript';
import User from './User';
import Project from './Project';
import Role from './Role';
import { IProjectCollaborator } from './types';

@Table
export default class UserProject extends Model<UserProject> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id!: number;

    @Column
    isOwner!: boolean;

    @BelongsTo(() => User, 'userId')
    user!: User;

    @ForeignKey(() => User)
    @Column
    userId!: number;

    @BelongsTo(() => Project, 'projectId')
    project!: Project;

    @ForeignKey(() => Project)
    @Column
    projectId!: number;

    @BelongsTo(() => Role, 'roleId')
    role!: Role;

    @ForeignKey(() => Role)
    @Column
    roleId!: number;
}

export function DbToStdModal_UserProject(userProject: UserProject): IProjectCollaborator | undefined {
    if(!userProject.user) {
        return undefined;
    }

    let user: IProjectCollaborator =
    {
        isOwner: userProject.isOwner,
        role: userProject.role?.name ?? "Other",
        name: userProject.user?.name,
        discordId: userProject.user?.discordId,
    };

    return user;
}

export async function GetUsersByProjectId(ProjectId: number) {
    const RelevantUserProjects = await UserProject.findAll({ where: { projectId: ProjectId } });

    let users: User[] = [];
    for (let user of RelevantUserProjects) {
        const RelevantUser = await User.findOne({ where: { id: user.id } });
        if (RelevantUser) users.push(RelevantUser);
    }

    return users;
}

export async function GetProjectCollaborators(ProjectId: number): Promise<IProjectCollaborator[]> {
    const RelevantUserProjects = await UserProject.findAll({ where: { projectId: ProjectId }, include: [{ model: User }]  });

    let users: IProjectCollaborator[] = RelevantUserProjects.map(DbToStdModal_UserProject).filter(x=> x != undefined) as IProjectCollaborator[];;

    return users;
}

export async function UserOwnsProject(user: User, project: Project): Promise<boolean> {
    const OwnedUserProject = await UserProject.findAll({ where: { isOwner: true, userId: user.id, projectId: project.id } });
    if (OwnedUserProject.length > 0) return true;
    return false;
}

export async function GetProjectsByUserId(UserId: number, isOwner: boolean = false): Promise<Project[]> {
    const RelevantUserProjects = await UserProject.findAll({ where: { userId: UserId, isOwner }, include: [{ model: Project }] });

    return RelevantUserProjects.flatMap(x => x.project);
}