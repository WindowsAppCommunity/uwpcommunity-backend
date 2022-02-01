import { PartialMessage } from "discord.js";
import { handleSwearFilter } from "./messageHandlers/swearFilter";

export default (oldDiscordMessage: PartialMessage, newDiscordMessage: PartialMessage) => {
    handleSwearFilter(newDiscordMessage);
}
