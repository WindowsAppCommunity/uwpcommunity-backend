import { ActionRowBuilder, APIActionRowComponent, APIEmbed, APIEmbedField, ButtonBuilder, ButtonStyle, EmbedType, Events, GuildMember, Interaction, InteractionType, Message, MessageActionRowComponentData, MessageCollector, ModalBuilder, TextChannel, TextInputBuilder, TextInputStyle } from "discord.js";
import { col } from "sequelize/types";
import { GetGuildMembers, GetRoles } from "../../common/helpers/discord";
import { GetRoleByName } from "../../models/Role";
import { IBotCommandArgument } from "../../models/types";

export interface StaffPollResponse {
    member: GuildMember;
    value?: string;
    pollMessage?: Message;
}

export interface StaffPoll {
    name: string;
    description: string;
    responses: StaffPollResponse[];
}

export default async (message: Message, commandParts: string[], args: IBotCommandArgument[]) => {
    const sentFromChannel = message.channel as TextChannel;
    const pollId = Guid.newGuid();

    if (!message.member?.roles.cache.find(i => i.name.toLowerCase() == "admin")) {
        message.reply("Only Admins can create staff polls.")
    }

    var name = args.find(x => x.name.toLowerCase() == "name")?.value;
    var description = args.find(x => x.name.toLowerCase() == "description")?.value;
    var isAnonymous = commandParts.includes("anonymous");

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
    if (!guildMembers) {
        sentFromChannel.send(`Error: no staff members were found.`);
        return;
    }

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

    var staffMembers = guildMembers.filter(x => x.roles.cache.has(staffRole!.id));

    message.client.on(Events.InteractionCreate, async (interaction: Interaction) => {
        var staffMember = staffMembers.find(x => x.id == interaction.user.id);
        if (!staffMember)
            return;

        if (interaction.isButton()) {
            if (interaction.customId === `staffpoll-button-${staffMember.id}-${name}-${pollId}`) {
                const modal = new ModalBuilder()
                    .setCustomId(`staffpoll-modal-${staffMember.id}-${name}-${pollId}`)
                    .setTitle('Staff poll')
                    .addComponents([
                        new ActionRowBuilder<TextInputBuilder>().addComponents(
                            new TextInputBuilder()
                                .setCustomId(`staffpoll-input-${staffMember.id}-${name}-${pollId}`)
                                .setLabel('Submit')
                                .setStyle(TextInputStyle.Paragraph)
                                .setMinLength(2)
                                .setRequired(true)
                        ),
                    ]);

                await interaction.showModal(modal);
            }
        }

        if (interaction.type === InteractionType.ModalSubmit) {
            if (interaction.customId === `staffpoll-modal-${staffMember.id}-${name}-${pollId}`) {
                var response = thisPoll.responses.find(x => x.member?.id == staffMember!.id);
                if (!response) {
                    sentFromChannel.send(`Internal error: could not locate the member response for <@${staffMember.id}>`);
                    return;
                }

                response.value = interaction.fields.getTextInputValue(`staffpoll-input-${staffMember.id}-${name}-${pollId}`);

                interaction.reply(`Thank you, your response has been collected.`);

                // If this is the last response, complete the poll and report the results. 
                if (thisPoll.responses.filter(x => x.value != undefined).length == staffMembers?.length) {
                    EndStaffPoll(staffMembers, thisPoll, sentFromChannel, name, description);
                }
            }
        }
    });

    for (var staffMember of staffMembers) {
        let button = new ActionRowBuilder<ButtonBuilder>();

        button.addComponents(
            new ButtonBuilder()
                .setCustomId(`staffpoll-button-${staffMember.id}-${name}-${pollId}`)
                .setStyle(ButtonStyle.Primary)
                .setLabel('Submit your vote'),
        );

        var sentMessage = await staffMember.send({
            content: "A staff poll has started",
            embeds: [
                {
                    "title": name,
                    "description": description,
                    "footer": {
                        "text": `Submit your response. Your reply will be held in our server's memory until all staff members have responded. `
                    }
                }
            ],
            components: [button],
        });

        var response: StaffPollResponse = { pollMessage: sentMessage, member: staffMember };
        thisPoll.responses.push(response);
    }

    sentFromChannel.send(`A poll has been sent to each staff member's DM. The results will be posted here in <#${sentFromChannel.id}> when all results have been received.`);

    function EndStaffPoll(staffMembers: GuildMember[], thisPoll: StaffPoll, sentFromChannel: TextChannel, name: string | undefined, description: string | undefined) {
        var embeds: APIEmbed[] = [{
            "title": `Staff Poll Results: ${name}`,
            "description": description
        }];

        for (const staffMember of staffMembers) {
            var memberResponse = thisPoll.responses.find(x => x.member?.id == staffMember.id);
            if (!memberResponse?.pollMessage) {
                sentFromChannel.send(`Internal error: could not locate the member response for <@${staffMember.id}>`);
                return;
            }

            embeds.push({
                description: memberResponse.value ?? "Empty or missing response",
                author: {
                    name: isAnonymous ? "Anonymous" : memberResponse.member.displayName,
                    icon_url: isAnonymous ? undefined : memberResponse.member.displayAvatarURL()
                }
            });
        }

        sentFromChannel.send({
            content: "A staff poll has ended",
            embeds: embeds,
        });
    }
}

class Guid {
    static newGuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}