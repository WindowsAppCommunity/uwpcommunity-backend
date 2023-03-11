import { APIEmbed, APIEmbedField, EmbedType, Message, TextChannel } from "discord.js";
import { GetGuildMembers, GetRoles } from "../../common/helpers/discord";
import { GetRoleByName } from "../../models/Role";
import { IBotCommandArgument } from "../../models/types";

export interface StaffPoll {
    name: string;
    description: string;
    responses: Message[];
}

export default async (message: Message, commandParts: string[], args: IBotCommandArgument[]) => {
    const sentFromChannel = message.channel as TextChannel;

    if (!message.member?.roles.cache.find(i => i.name.toLowerCase() == "admin")) {
        message.reply("Only Admins can create staff polls.")
    }

    var name = args.find(x => x.name == "name")?.value;
    var description = args.find(x => x.name == "description")?.value;

    if (args.length == 0) {
        sentFromChannel.send(`No parameters provided. Command usage: !staffpoll -name "Moderator nominations" -description "Nominate a server member for the mod position."`);
        return;
    }

    var thisPoll = { name, description } as StaffPoll;

    var guildMembers = await GetGuildMembers();
    var allRoles = await GetRoles();
    if (allRoles == undefined) {
        sentFromChannel.send(`Error: couldn't retrieve roles.`);
        return;
    }

    var staffRole = allRoles.find(x => x.name.toLowerCase() == "staff");
    if (staffRole == undefined || staffRole == null) {
        sentFromChannel.send(`Error: couldn't find staff role.`);
        return;
    }

    var staffMembers = guildMembers?.filter(x => x.roles.resolveId(staffRole!.id));
    if (staffMembers == undefined || staffMembers == null) {
        sentFromChannel.send(`Error: no staff members were found.`);
        return;
    }

    for (var staffMember of staffMembers!) {
        var sentMessage = await staffMember.send({
            content: "A staff poll has started",
            embeds: [
                {
                    "title": name,
                    "description": description,
                    "footer": {
                        "text": `To provide your respond, reply to this message. Your reply will be held in our server's memory until all staff members have responded. `
                    }
                }
            ]
        });

        (message.channel as TextChannel).awaitMessages({ filter: ((m: Message) => m.type as any == "REPLY" && m.reference?.messageId == sentMessage.id), max: 1 })
            .then(collected => {
                var receivedResponse = collected.first()!;
                thisPoll.responses.push(receivedResponse);

                receivedResponse.reply("Thank you, your response has been collected.")

                // If this is the last response, complete the poll and report the results. 
                if (thisPoll.responses.length == staffMembers?.length) {
                    var embedFields: APIEmbedField[] = [];

                    for (const staffMember of staffMembers) {
                        var memberResponse = thisPoll.responses.find(x => x.author.id == staffMember.id);

                        embedFields.push({
                            name: `<@${staffMember.id}>'s response:`,
                            value: memberResponse?.cleanContent ?? "Empty or missing response",
                        });
                    }

                    sentFromChannel.send({
                        content: "A staff poll has ended",
                        embeds: [
                            {
                                "title": `Staff Poll Results: ${name}`,
                                "description": description,
                                "fields": embedFields,
                            }
                        ]
                    });
                }
            });
    }

    sentFromChannel.send(`A poll has been sent to each staff member's DM. The results will be posted here in <#${sentFromChannel.id}> when all results have been received.`);
}