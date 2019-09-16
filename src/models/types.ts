export interface IProject {
    appName: string;
    description: string;
    isPrivate: boolean;
    launchId: number;
    users?: IUser[];
    id?: number;
};

export interface IUser {
    name: string;
    discordId: string;
    email?: string; // This is a contact email supplied by the user, and is safe to be public 
    id?: number;
    projects?: IProject[];
}

/**
 * @summary Discord API user object
 */
export interface IDiscordUser {
    "username": string;
    "locale": string;
    "premium_type": number;
    "mfa_enabled": boolean;
    "flags": number;
    "avatar": string;
    "discriminator": string;
    "id": string;
}