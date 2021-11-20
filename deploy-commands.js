const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, guildIds, token } = require('./config.json');

const commands = [
	new SlashCommandBuilder().setName('server').setDescription('Replies with server info!'),
	new SlashCommandBuilder().setName('info').setDescription('Informações sobre seu personagem.'),
	new SlashCommandBuilder().setName('bal').setDescription('Mostra seu saldo atual.'),
	new SlashCommandBuilder().setName('additem').setDescription('Adiciona um item à base de items.'),
	new SlashCommandBuilder().setName('listitems').setDescription('Exibe a base de items'),
]
	.map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(token);

guildIds.map(guildId=>{
	return rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);
})
