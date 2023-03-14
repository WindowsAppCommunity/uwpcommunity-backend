import { Message, TextChannel } from "discord.js";
import { IBotCommandArgument } from "../../models/types";

export default async (message: Message, commandParts: string[], args: IBotCommandArgument[]) => (message.channel as TextChannel).send("pong");