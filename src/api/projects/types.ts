import { IProject } from "../../models/types";

export interface IProjectRequest extends IProject {
    role: string;
}