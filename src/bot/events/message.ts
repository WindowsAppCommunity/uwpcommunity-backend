import { Message } from "discord.js";
import { devChatterWarning } from "./messageHandlers/devChatterWarning";
import { handlePossibleBan } from "./messageHandlers/possibleBan";
import { handleSwearFilter } from "./messageHandlers/swearFilter";
import { wipThreadOnlyComments } from "./messageHandlers/wipThreadOnlyComments";

export default (discordMessage: Message) => {
    if (discordMessage.author?.bot)
        return; // ignore messages sent by bots.

    handleSwearFilter(discordMessage);
    handlePossibleBan(discordMessage);
    devChatterWarning(discordMessage);
    wipThreadOnlyComments(discordMessage);
}
