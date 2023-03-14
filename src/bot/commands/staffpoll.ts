import { APIEmbed, APIEmbedField, EmbedType, GuildMember, Message, TextChannel } from "discord.js";
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

    var name = args.find(x => x.name.toLowerCase() == "name")?.value;
    var description = args.find(x => x.name.toLowerCase() == "description")?.value;

    if (args.length == 0) {
        sentFromChannel.send(`No parameters provided. Command usage: !staffpoll -name "Moderator nominations" -description "Nominate a server member for the mod position."`);
        return;
    }

    if (!name) {
        sentFromChannel.send(`Missing name parameter. Command usage: !staffpoll -name "Moderator nominations" -description "Nominate a server member for the mod position."`);
        return;
    }

    if (!description) {
        sentFromChannel.send(`Missing description parameter. Command usage: !staffpoll -name "Moderator nominations" -description "Nominate a server member for the mod position."`);
        return;
    }

    var thisPoll: StaffPoll = { name: name, description: description, responses: [] };

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

    var staffMembers = guildMembers?.filter(x => x.roles.cache.has(staffRole!.id));
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

        // Wait for the reply
        (sentMessage.channel as TextChannel).awaitMessages({ filter: ((m: Message) => m.type == 19 && m.reference?.messageId == sentMessage.id), max: 1 })
            .then(collected => {
                // Save the response.
                var receivedResponse = collected.first()!;
                thisPoll.responses.push(receivedResponse);

                receivedResponse.reply("Thank you, your response has been collected.")

                // If this is the last response, complete the poll and report the results. 
                if (thisPoll.responses.length == staffMembers?.length) {
                    EndStaffPoll(staffMembers, thisPoll, sentFromChannel, name, description);
                }
            });
    }

    sentFromChannel.send(`A poll has been sent to each staff member's DM. The results will be posted here in <#${sentFromChannel.id}> when all results have been received.`);
}

function EndStaffPoll(staffMembers: GuildMember[], thisPoll: StaffPoll, sentFromChannel: TextChannel, name: string | undefined, description: string | undefined) {
    var embeds: APIEmbed[] = [{
        "title": `Staff Poll Results: ${name}`,
        "description": description
    }];

    for (const staffMember of staffMembers) {
        var memberResponse = thisPoll.responses.find(x => x.author.id == staffMember.id);
        if (!memberResponse) {
            sentFromChannel.send(`Internal error: could not locate the member response for <@${staffMember.id}>`);
            return;
        }

        embeds.push({
            description: memberResponse.cleanContent ?? "Empty or missing response",
            author: {
                name: memberResponse.author.username,
                icon_url: memberResponse.author.displayAvatarURL()
            }
        });
    }

    sentFromChannel.send({
        content: "A staff poll has ended",
        embeds: embeds,
    });
}
