import { Message } from "discord.js";
import { IBotCommandArgument } from "../../models/types";
import app from './app';

export default async (message: Message, commandParts: string[], args: IBotCommandArgument[]) => app(message, commandParts, args);