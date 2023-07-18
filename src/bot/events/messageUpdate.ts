import { PartialMessage } from "discord.js";
import { handleSwearFilter } from "./messageHandlers/swearFilter.js";

export default (oldDiscordMessage: PartialMessage, newDiscordMessage: PartialMessage) => {
    if (oldDiscordMessage.author?.bot)
        return; // ignore messages sent by bots.

    handleSwearFilter(newDiscordMessage);
}
