import { Message } from "discord.js";
import { devChatterWarning } from "./messageHandlers/devChatterWarning";
import { handlePossibleBan } from "./messageHandlers/possibleBan";
import { handleSwearFilter } from "./messageHandlers/swearFilter";

export default (discordMessage: Message) => {
    handleSwearFilter(discordMessage);
    handlePossibleBan(discordMessage);
    devChatterWarning(discordMessage);
}
