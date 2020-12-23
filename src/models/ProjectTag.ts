import { Column, CreatedAt, Model, Table, UpdatedAt, HasMany, PrimaryKey, AutoIncrement, DataType, ForeignKey } from 'sequelize-typescript';
import Project from './Project';
import Tag from './Tag';

@Table
export default class ProjectTag extends Model<ProjectTag> {

    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id!: number;
    
    @Column(DataType.INTEGER)
    @ForeignKey(() => Project)
    projectId!: number;

    @Column(DataType.INTEGER)
    @ForeignKey(() => Tag)
    tagId!: number;

    @CreatedAt
    @Column
    createdAt!: Date;

    @UpdatedAt
    @Column
    updatedAt!: Date;
}


