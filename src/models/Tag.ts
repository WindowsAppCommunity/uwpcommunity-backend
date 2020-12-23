import { Column, CreatedAt, Model, Table, UpdatedAt, PrimaryKey, AutoIncrement, DataType, HasMany, BelongsToMany } from 'sequelize-typescript';
import Project from './Project';
import ProjectTag from './ProjectTag';

@Table
export default class Tag extends Model<Tag> {

    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id!: number;
    
    @Column
    name!: string;

    @Column
    icon!: string;

    @BelongsToMany(() => Project, () => ProjectTag)
    projects: Project[];

    @CreatedAt
    @Column
    createdAt!: Date;

    @UpdatedAt
    @Column
    updatedAt!: Date;
}
