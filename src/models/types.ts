export interface IProject {
    id?: number;

    appName: string;
    description: string;
    isPrivate: boolean;
    downloadLink?: string;
    githubLink?: string;
    externalLink?: string;

    heroImage: string;

    awaitingLaunchApproval: boolean;
    needsManualReview: boolean;
    lookingForRoles?: string[];

    collaborators: IProjectCollaborator[];

    launchYear?: number;
    category?: string;
};

export interface IProjectCollaborator extends IUser {
    role: "Developer" | "Translator" | "Beta Tester" | "Other";
}

export interface IUser {
    id?: number;

    name: string;
    discordId: string;
    email?: string; // This is a contact email supplied by the user, and is safe to be public 
}

export const ResponseErrorReasons = {
    MissingAuth: "Missing authorization header",
    UserExists: "User already exists",
    UserNotExists: "User does not exist",
    ProjectExists: "Project already exists",
    ProjectNotExist: "Project does not exist",
    GenericError: "Internal server error"
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

export interface IDiscordAuthResponse {
    "access_token": string;
    "token_type": "Bearer"
    "expires_in": number,
    "refresh_token": string,
    "scope": string;
}
