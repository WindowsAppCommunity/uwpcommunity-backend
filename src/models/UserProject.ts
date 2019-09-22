import { Column, Model, Table, ForeignKey, PrimaryKey, AutoIncrement, DataType, BelongsTo } from 'sequelize-typescript';
import User from './User';
import Project from './Project';
import Role from './Role';

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
