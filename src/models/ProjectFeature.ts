import { Column, Model, Table, PrimaryKey, AutoIncrement, DataType } from 'sequelize-typescript';

@Table
export default class ProjectFeature extends Model<ProjectFeature> {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @Column
    projectId!: number;

    @Column
    feature!: string;
}

export async function getFeaturesForProject(projectId: number): Promise<string[]> {
    const features = await ProjectFeature.findAll({ where: { projectId: projectId } });
    
    return features.map(x => x.feature);
}
