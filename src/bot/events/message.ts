import { Message } from "discord.js";
import { handlePossibleBan } from "./messageHandlers/possibleBan";
import { handleSwearFilter } from "./messageHandlers/swearFilter";

export default (discordMessage: Message) => {
    handleSwearFilter(discordMessage);
    handlePossibleBan(discordMessage);
}
