import type { CID } from "multiformats/cid";

export interface ICommunityEventEntry {
    project: CID;
    year: number;
    eventName: string;
}
