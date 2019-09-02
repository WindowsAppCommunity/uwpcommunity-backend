import { Model } from 'sequelize';
import { HasManyGetAssociationsMixin, HasManyAddAssociationMixin, HasManyHasAssociationMixin, Association, HasManyCountAssociationsMixin, HasManyCreateAssociationMixin } from 'sequelize';
import { Project } from "./project";

export class Launch extends Model {
    public id!: number;

    public year!: string;

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;

    // Since TS cannot determine model association at compile time
    // we have to declare them here purely virtually
    // these will not exist until `Model.init` was called.
    public getProjects!: HasManyGetAssociationsMixin<Project>; // Note the null assertions!
    public addProject!: HasManyAddAssociationMixin<Project, number>;
    public hasProject!: HasManyHasAssociationMixin<Project, number>;
    public countProjects!: HasManyCountAssociationsMixin;
    public createProject!: HasManyCreateAssociationMixin<Project>;

    // You can also pre-declare possible inclusions, these will only be populated if you
    // actively include a relation.
    public readonly projects?: Project[]; // Note this is optional since it's only populated when explicitly requested in code
    public static associations: {
        projects: Association<Launch, Project>;
    };
}
