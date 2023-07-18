import { Helia, Ipns, Dag, ImportLibp2pKey } from './helia.js';
import { peerIdFromString } from "@libp2p/peer-id";
import type { CID } from "multiformats/cid";
import { IPublisher } from "./interface/IPublisher.js";
import { exit } from "process";;
import { type PeerId } from "@libp2p/interface-peer-id";

interface IPublisherMap {
    ipnsCid: CID; // This CIDv1 should always be an IPNS CID.
    publisher: IPublisher;
}

// While each user could theoretically publish their own IPNS record for each publisher,
// we still need a way to keep track all registered publishers. This is that.
let publishers: IPublisherMap[] = [];
let publishersIpnsKey: PeerId | undefined;

export default publishers;

export async function GetFirstPublisherBy(callback: (Publisher: IPublisherMap) => boolean): Promise<IPublisher | undefined> {
    if (!Helia || !Ipns || !Dag)
        throw new Error("Helia not initialized");

    for (var item of publishers) {
        if (callback(item)) {
            const peerId = peerIdFromString(item.ipnsCid.toString());
            const cid = await Ipns.resolve(peerId);

            return await Dag.get<IPublisher>(cid);
        }
    }
}

export async function GetPublisherByName(name: string): Promise<IPublisher | undefined> {
    if (!Helia || !Ipns || !Dag)
        throw new Error("Helia not initialized");

    for (var item of publishers) {
        if (item.publisher.name == name) {
            const peerId = peerIdFromString(item.ipnsCid.toString());
            const cid = await Ipns.resolve(peerId);

            return await Dag.get<IPublisher>(cid);
        }
    }
}

export async function SaveAllAsync() {
    if (Dag == undefined)
        throw new Error("Dag missing or not initialized");

    if (Ipns == undefined)
        throw new Error("Ipns missing or not initialized");

    for (var publisherMapItem of publishers) {
        try {
            await SavePublisherAsync(publisherMapItem.ipnsCid, publisherMapItem.publisher);
        }
        catch {
            // Any publishers without a corresponding cannot be edited.
            // ignored
        }
    }

    publishersIpnsKey ??= await ImportLibp2pKey("publishers.key");

    var cid = await Dag.add(publishers);
    await Ipns.publish(publishersIpnsKey, cid);
}

export async function LoadAllAsync() {
    if (Dag == undefined)
        throw new Error("Dag missing or not initialized");

    if (Ipns == undefined)
        throw new Error("Ipns missing or not initialized");

    publishersIpnsKey ??= await ImportLibp2pKey("publishers.key");

    var cid = await Ipns.resolve(publishersIpnsKey, { offline: true });

    var publisherRes = await Dag.get<IPublisherMap[] | null>(cid);
    if (publisherRes != null)
        publishers = publisherRes;

    // In order to publish changes to this publisher, we must have the proper libp2p key.
    for (var publisherMapItem of publishers) {
        try {
            ImportLibp2pKey(publisherMapItem.ipnsCid.toString());
        }
        catch {
            // Any publishers without a corresponding cannot be edited.
            // ignored
        }

        var publisher = await LoadPublisherAsync(publisherMapItem.ipnsCid);

        // Update our snapshot with latest data.
        publisherMapItem.publisher = publisher;
    }
}

export async function SavePublisherAsync(ipnsCid: CID, publisher: IPublisher) : Promise<CID> {
    // Only public publishers supported for now.
    AssertPublic(publisher);

    if (!publishers.find(x => x.ipnsCid.equals(ipnsCid))) {
        publishers.push({ ipnsCid, publisher: publisher });
    }

    if (Ipns == undefined)
        throw new Error("Ipns missing or not initialized");

    if (Dag == undefined)
        throw new Error("Dag missing or not initialized");

    var peerId = await ImportLibp2pKey(ipnsCid.toString());
    var cid = await Dag.add(publisher);

    await Ipns.publish(peerId, cid);

    return cid;
}

export async function LoadPublisherAsync(ipnsCid: CID) {
    if (Dag == undefined)
        throw new Error("Dag missing or not initialized");

    if (Ipns == undefined)
        throw new Error("Ipns missing or not initialized");

    var ipnsKey = peerIdFromString(ipnsCid.toString());
    var cid = await Ipns.resolve(ipnsKey);
    var publisher = await Dag.get<IPublisher>(cid);

    // Only public publishers supported for now.
    AssertPublic(publisher);

    return publisher;
}

export function AssertPublic(publisher: IPublisher) {
    if (publisher.isPrivate) {
        throw new Error("FATAL: Publisher is marked private, but was treated as a public publisher internally. Execution should not continue.");
        exit(-1);
    }
}
