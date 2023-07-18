import { Message } from "discord.js";
import { IBotCommandArgument } from "../../models/types.js";
import app from './app.js';

export default async (message: Message, commandParts: string[], args: IBotCommandArgument[]) => app(message, commandParts, args);