import { Model, Association } from 'sequelize';
import { Launch } from './launch';

export class Project extends Model {
    public id!: number;

    public name!: string;

    public userId!: number;
    public launchId!: number;

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}
