const Discord = require('discord.js');
const client = new Discord.Client;
const Enmap = require('enmap');
const EnmapLevel = require('enmap-level');

client.config = require('./config.js');
client.settings = new Enmap({provider: new EnmapLevel({name: "settings", persistent: "true"})});


const prefix = client.config.prefix;

function voteUp(client, message, aliveNow) {
	let msg = `Use ${client.config.prefix}vote < number > to vote up someone`;
	for(var i=0; i < aliveNow; i++){
		msg += `\n \`${client.config.prefix}vote ${i+1}\``
		client.settings.set(`${message.guild.id}${i}Votes`, 0);
	};
	message.channel.send(msg);
};

function results(client, message, aliveNow) {
	let msg = `results:`;
	for(var i=0; i < aliveNow; i++){
		msg += `\n \`${i + 1}: ${client.settings.get(`${message.guild.id}${i}Votes`)}\``;
	};
	message.channel.send(msg);
};

function deleteResults(client, message, aliveNow) {
	for(var i=0; i < aliveNow; i++){
		let num = parseInt(i) + 1;
		client.settings.delete(`${message.guild.id}${num}Votes`);
	};
}

client.on('ready', () => {
 console.log('Online!');
});

client.on('message', async message => {
	// 
	
	if(!message.content.startsWith(prefix)) return;
    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();
    if(command === 'setup') {
        if(!message.guild.roles.find('name', 'Alive (Universal)')) return message.channel.send('\'Alive (Universal)\' is not a role.');
        const AliveRole = message.guild.roles.find('name', 'Alive (Universal)');
		client.settings.set(`${message.guild.id}Alive`, `${AliveRole.id}`);
		if(!message.guild.channels.find('name', 'voting-up')) return message.channel.send('#voting-up is not a channel.');
		const VotingChannel = message.guild.channels.find('name', 'voting-up');
		client.settings.set(`${message.guild.id}Channel`, `${VotingChannel.id}`);
		message.channel.send(`Successfully added both <@&${client.settings.get(`${message.guild.id}Alive`)}> and <#${client.settings.get(`${message.guild.id}Channel`)}> to the server configuration.`);
	} else
	if(command === 'voteup') {
		if(!client.settings.get(`${message.guild.id}election`)) return message.channel.send('There is something wrong! Please try running the command again!');
		if(client.settings.get(`${message.guild.id}election`) === 1) return message.channel.send('There is already voting up in progress.');
		if(!client.settings.get(`${message.guild.id}Alive`) || !client.settings.get(`${message.guild.id}Channel`)) return message.channel.send(`Configuration not completed! Please run ${prefix}setup.`);
		if(!message.member.hasPermission('ADMINISTRATOR') && message.author.id !== client.config.ownerID) return message.channel.send('You do not have permission to begin a vote up.');

		const aliveRoleID = client.settings.get(`${message.guild.id}Alive`);
		const votingChannelID = client.settings.get(`${message.guild.id}Channel`);
		if(!client.channels.get(votingChannelID) || !message.guild.roles.get(aliveRoleID)) return message.channel.send(`An error occured! Try re-configurating this server by using ${prefix}setup.`);
		const votingChannel = client.channels.get(votingChannelID);
		const aliveRole = message.guild.roles.get(aliveRoleID);
		client.settings.set(`${message.guild.id}aliveNow`, aliveRole.members.size);
		const aliveNow = client.settings.get(`${message.guild.id}aliveNow`);
		if(aliveNow === 0) return message.channel.send('Now one is currently alive.');
		voteUp(client, message, aliveNow);
		client.settings.set(`${message.guild.id}election`, 1);
		client.settings.set(`${message.guild.id}limit`, client.settings.get(`${message.guild.id}aliveNow`) / 2);
	} else 
	if(command === 'vote') {
		if(client.settings.get(`${message.guild.id}election` === 0)) return message.channel.send('There isn\'t voting up in progress.');
		if(!parseInt(args)) return message.channel.send('Please specify someone to vote for.');
		if(args[0] > client.settings.get(`${message.guild.id}aliveNow`)) return message.channel.send(`${args[0]} is not a valid number.`);
		const oldVotes = parseInt(client.settings.get(`${message.guild.id}${args[0]}Votes`));
		client.settings.set(`${message.guild.id}${parseInt(args[0]) - 1}Votes`, oldVotes + 1);
		message.channel.send(`Number ${args[0]} now has ${client.settings.get(`${message.guild.id}${args[0]}Votes`)} votes.`);
	} else 
	if(command === 'stop') {
		if(client.settings.get(`${message.guild.id}election` === 0)) return message.channel.send('There isn\'t an election in progress currently');
		const aliveNow = client.settings.get(`${message.guild.id}aliveNow`);
		results(client, message, aliveNow);
		deleteResults(client, message, aliveNow);
	}
});

client.login(client.config.token);