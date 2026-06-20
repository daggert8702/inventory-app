require("dotenv").config();

const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("Missing DISCORD_TOKEN, CLIENT_ID, or GUILD_ID in .env");
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder()
    .setName("digi-update")
    .setDescription("Post a Digital Den update.")
    .addStringOption(option =>
      option
        .setName("type")
        .setDescription("Update type")
        .setRequired(true)
        .addChoices(
          { name: "Code Update", value: "code" },
          { name: "Price Change", value: "price" },
          { name: "Item Added", value: "item_added" },
          { name: "Item Removed", value: "item_removed" },
          { name: "General Update", value: "general" }
        )
    )
    .addStringOption(option =>
      option
        .setName("note")
        .setDescription("What changed?")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("version")
        .setDescription("Optional version number, like v1.0.1")
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName("item")
        .setDescription("Optional item name")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("digi-status")
    .setDescription("Post a Digital Den website status update.")
    .addStringOption(option =>
      option
        .setName("status")
        .setDescription("Current website status")
        .setRequired(true)
        .addChoices(
          { name: "Online", value: "online" },
          { name: "Down", value: "down" },
          { name: "Maintenance", value: "maintenance" }
        )
    )
    .addStringOption(option =>
      option
        .setName("note")
        .setDescription("Optional status note")
        .setRequired(false)
    )
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    console.log("Registering Digi Bot commands...");

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("Commands registered.");
  } catch (error) {
    console.error(error);
  }
})();