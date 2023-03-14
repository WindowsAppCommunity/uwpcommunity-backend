import { PartialMessage } from "discord.js";
import { handleSwearFilter } from "./messageHandlers/swearFilter";

export default (oldDiscordMessage: PartialMessage, newDiscordMessage: PartialMessage) => {
    if (oldDiscordMessage.author?.bot)
        return; // ignore messages sent by bots.

    handleSwearFilter(newDiscordMessage);
}
