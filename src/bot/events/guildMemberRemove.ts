import { GuildMember, TextChannel } from "discord.js";
import { GetChannelByName } from "../../common/discord.js";
import { DeleteUserByDiscordId, GetUserByDiscordId } from "../../sdk/users.js";

export default async (guildMember: GuildMember) => {
    let user = await GetUserByDiscordId(guildMember.id);
    if (user) {
        let removalMessage: string = `Registered user ${guildMember.user.username}#${guildMember.user.discriminator} ${guildMember.nickname ? `(${guildMember.nickname})` : ""} has left the server, information has been deleted from database`;
        
        console.log(removalMessage);
        await DeleteUserByDiscordId(guildMember.id);

        let botChannel = await GetChannelByName("bot-stuff") as TextChannel;
        if (botChannel)
            botChannel.send(removalMessage);
    }
}
