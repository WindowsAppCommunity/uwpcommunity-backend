import { Column, Model, Table, ForeignKey, PrimaryKey, AutoIncrement, DataType } from 'sequelize-typescript';
import User from './User';
import Project from './Project';

@Table
export default class UserProject extends Model<UserProject> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id!: number;
    
    @ForeignKey(() => User)
    @Column
    userId!: number;

    @ForeignKey(() => Project)
    @Column
    projectId!: number;
}
