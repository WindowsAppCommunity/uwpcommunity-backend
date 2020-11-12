import { Column, Model, Table, ForeignKey, PrimaryKey, AutoIncrement, DataType, BelongsTo } from 'sequelize-typescript';

@Table
export default class ProjectImage extends Model<ProjectImage> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    id!: number;

    @Column
    projectId!: number;

    @Column
    imageUrl!: string;
}

export async function getImagesForProject(projectId: number): Promise<string[]> {
    const projectImages = await ProjectImage.findAll({ where: { projectId: projectId } });
    
    return projectImages.map(x => x.imageUrl);
}
