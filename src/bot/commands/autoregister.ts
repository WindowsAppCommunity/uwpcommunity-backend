import { IBotCommandArgument } from "../../models/types";
import { DMChannel, Message, TextChannel } from "discord.js";
import User, { getUserByDiscordId } from "../../models/User";


export default async (message: Message, commandParts: string[], args: IBotCommandArgument[]) => {
    var discordUser = message.author;

    var name = args.find(x => x.name == "name")?.value;
    var email = args.find(x => x.name == "email")?.value;

    // Check if the user already exists
    const user = await User.findOne({
        where: { discordId: discordUser.id }
    })
        .catch((err) => handleGenericError(err, (message.channel as TextChannel)));

    if (user) {
        (message.channel as TextChannel).send(`User is already registered.`);
        return;
    }

    if (!name) {
        (message.channel as TextChannel).send(`Please supply a name as an argument. E.g. \`!autoregister /name "Average Joe"\`. This name will be displayed to other users.`);
        return;
    }

    await submitUser(name, discordUser.id, email);

    (message.channel as TextChannel).send(`Thank you for registering! You can now access community services, the dashboard on https://uwpcommunity.com/, and (when given access) private app channels.`);
}

function submitUser(name: string, discordId: string, email: string | undefined): Promise<User> {
    return new Promise<User>((resolve, reject) => {
        User.create({ name, email, discordId })
            .then(resolve)
            .catch(reject);
    });
}

function handleGenericError(channel: TextChannel | DMChannel, err: any) {
    channel.send(`An error occurred: ${err}`);
}