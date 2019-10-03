import { Column, Model, Table, ForeignKey, PrimaryKey, AutoIncrement, DataType, BelongsTo } from 'sequelize-typescript';
import User, { DbToStdModal_User } from './User';
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

    @ForeignKey(() => User)
    @Column
    userId!: number;

    @ForeignKey(() => Project)
    @Column
    projectId!: number;


    @ForeignKey(() => Role)
    roleId!: number;

    @BelongsTo(() => Role, 'roleId')
    role!: Role
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
    const RelevantUserProjects = await UserProject.findAll({ where: { projectId: ProjectId } });

    let users: IProjectCollaborator[] = [];
    for (let user of RelevantUserProjects) {
        const RelevantUser = await User.findOne({ where: { id: user.id } });
        if (RelevantUser) {
            users.push({ ...(await DbToStdModal_User(RelevantUser)), role: user.role ? user.role.name : "Other", isOwner: user.isOwner });
        }
    }

    return users;
}

export async function UserOwnsProject(user: User, project: Project): Promise<boolean> {
    const OwnedUserProject = await UserProject.findAll({ where: { isOwner: true, userId: user.id, projectId: project.id } });
    if (OwnedUserProject.length > 0) return true;
    return false;
}

export async function GetProjectsByUserId(UserId: number) {
    const RelevantUserProjects = await UserProject.findAll({ where: { userId: UserId } });

    let projects: Project[] = [];
    for (let project of RelevantUserProjects) {
        const RelevantProject = await Project.findOne({ where: { id: project.id } });
        if (RelevantProject) projects.push(RelevantProject);
    }

    return Project;
}