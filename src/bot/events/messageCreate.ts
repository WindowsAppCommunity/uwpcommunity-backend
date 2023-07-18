import { Message } from "discord.js";
import { devChatterWarning } from "./messageHandlers/devChatterWarning.js";
import { handleSwearFilter } from "./messageHandlers/swearFilter.js";

export default (discordMessage: Message) => {
    if (discordMessage.author?.bot)
        return; // ignore messages sent by bots.

    handleSwearFilter(discordMessage);
    devChatterWarning(discordMessage);
}
