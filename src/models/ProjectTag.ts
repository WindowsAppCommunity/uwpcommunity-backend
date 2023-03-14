import { Column, CreatedAt, Model, Table, UpdatedAt, HasMany, PrimaryKey, AutoIncrement, DataType, ForeignKey } from 'sequelize-typescript';
import Project from './Project';
import Tag from './Tag';

@Table
export default class ProjectTag extends Model<ProjectTag> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;
    
    @Column(DataType.INTEGER)
    @ForeignKey(() => Project)
    projectId!: number;

    @Column(DataType.INTEGER)
    @ForeignKey(() => Tag)
    tagId!: number;

    @CreatedAt
    @Column
    declare createdAt: Date;

    @UpdatedAt
    @Column
    declare updatedAt: Date;
}


