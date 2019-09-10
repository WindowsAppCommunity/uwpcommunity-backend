export interface IProject {
    appName: string;
    description: string;
    isPrivate: boolean;
    launchId: number;
    user: IUser;
};

export interface IUser {
    name: string;
    discordId: string;
    email?: string;
}