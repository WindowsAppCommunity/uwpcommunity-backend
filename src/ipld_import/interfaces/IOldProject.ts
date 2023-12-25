export interface IOldProject {
    id: string;
    appName: string;
    description: string;
    isPrivate: boolean;
    downloadLink: string | null;
    githubLink: string | null;
    externalLink: string | null;
    awaitingLaunchApproval: boolean;
    needsManualReview: boolean;
    lookingForRoles: string | null;
    heroImage: string;
    category: string;
    createdAt: string;
    updatedAt: string;
    appIcon: string | null;
    accentColor: string | null;
  }