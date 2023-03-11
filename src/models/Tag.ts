import { Column, CreatedAt, Model, Table, UpdatedAt, PrimaryKey, AutoIncrement, DataType, HasMany, BelongsToMany } from 'sequelize-typescript';
import Project, { DbToStdModal_Project } from './Project';
import ProjectTag from './ProjectTag';
import { ITag } from './types';

@Table
export default class Tag extends Model<Tag> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @Column
    name!: string;

    @Column
    icon!: string;

    @BelongsToMany(() => Project, () => ProjectTag)
    projects: Project[];

    @CreatedAt
    @Column
    declare createdAt: Date;

    @UpdatedAt
    @Column
    declare updatedAt: Date;
}

export function DbToStdModal_Tag(tag: Tag): ITag {
    return {
        id: tag.id,
        name: tag.name,
        icon: tag.icon,
        projects: tag.projects?.map(DbToStdModal_Project) ?? [],
    }
}