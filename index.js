const Discord = require('discord.js');
const client = new Discord.Client;
const Enmap = require('enmap');
const EnmapLevel = require('enmap-level');

client.config = require('./config.js');
client.settings = new Enmap({provider: new EnmapLevel({name: 'Settings', persistent: 'true'})});

const prefix = client.config.prefix;

function voteUp(client, message, aliveNow) {
    let msg = `Use ${client.config.prefix}vote <number> to vote someone up`;
    for(var i=1; i <= aliveNow; i++) {
        msg += `\n \`${client.config.prefix}vote ${i}\``;
        client.settings.set(`${message.guild.id}${i}votes`, 0);
    };
    message.channel.send(msg);
};

function results(client, message, aliveNow) {
    let msg = 'results:';
    for(var i=1; i <= aliveNow; i++) {
        msg += `\n\`${i}: ${client.settings.get(`${message.guild.id}${i}votes`)}\``;
    }
    message.channel.send(msg);
};

function deleteResults(client, message, aliveNow) {
    for(var i=1; i <= aliveNow; i++) {
        client.settings.set(`${message.guild.id}${i}votes`, 0);
    };
};

client.on('ready', () => {
    console.log('Online!');
});

client.on('message', async message => {
    if(!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    if(command === 'setup') {
        if(client.settings.get(`${message.guild.id}election`) === true) return message.channel.send(`Can't edit config whilst voting up is taking place.`);
        if(!message.guild.roles.find('name', 'Alive (Universal)')) return message.channel.send('`Alive (Universal)` is not a role.');
        const aliveRole = message.guild.roles.find('name', 'Alive (Universal)');
        client.settings.set(`${message.guild.id}aliveRole`, `${aliveRole.id}`);
        if(!message.guild.channels.find('name', 'voting-up')) return message.channel.send('`voting-up` is not a channel.');
        const votingChannel = message.guild.channels.find('name', 'voting-up');
        client.settings.set(`${message.guild.id}votingChannel`, `${votingChannel.id}`);
        message.channel.send('Successfully added `Alive (Universal)` and `voting-up` to server configuration.');
    } else 
    if(command === 'voteup') {
        if(client.settings.get(`${message.guild.id}election`) === true) return message.channel.send('There is currently voting up taking place.');
        if(!client.settings.get(`${message.guild.id}aliveRole`) || !client.settings.get(`${message.guild.id}votingChannel`)) return message.channel.send(`An error occured! Try re-configurating this server by using ${prefix}setup.`);
        if(!message.member.hasPermission('ADMINISTRATOR') && message.author.id !== client.config.ownerID) return message.channel.send('You do not have permission to use this');
        
        const aliveRoleID = client.settings.get(`${message.guild.id}aliveRole`);
        const votingChannelID = client.settings.get(`${message.guild.id}votingChannel`);

        if(!client.channels.get(votingChannelID) || !message.guild.roles.get(aliveRoleID)) return message.channel.send('A weird error occured! Try re-configurating the server.');
        const votingChannel = client.channels.get(votingChannelID);
        const aliveRole = message.guild.roles.get(aliveRoleID);
        client.settings.set(`${message.guild.id}aliveNow`, aliveRole.members.size);
        const aliveNow = client.settings.get(`${message.guild.id}aliveNow`);
        if(aliveNow <= 0) return message.channel.send('No one is currently alive.');

        voteUp(client, message, aliveNow);

        client.settings.set(`${message.guild.id}election`, true);
        client.settings.set(`${message.guild.id}limit`, parseInt(aliveNow)/2);
    } else 
    if(command === 'stop') {
        if(client.settings.get(`${message.guild.id}election`) === false) return message.channel.send('There is not currently voting up taking place.');
        const aliveNow = client.settings.get(`${message.guild.id}aliveNow`);
        results(client, message, aliveNow);
        deleteResults(client, message, aliveNow);
        client.settings.set(`${message.guild.id}election`, false);
    } else 
    if(command === 'vote') {
        if(client.settings.get(`${message.guild.id}election`) === false) return message.channel.send('THere is not currently voting up taking place.');
        if(!args) return message.channel.send('Please specify someone to vote up (by number not name).');
        if(args[0] > client.settings.get(`${message.guild.id}aliveNow`)) return message.channel.send('Please provide a valid number to vote for.');
        const oldVotes = client.settings.get(`${message.guild.id}${args[0]}votes`);
        client.settings.set(`${message.guild.id}${args[0]}votes`, parseInt(args[0])+1);
        message.channel.send(`Number ${args[0]} now has ${client.settings.get(`${message.guild.id}${args[0]}votes`)} votes.`);
    }
});

client.login(client.config.token);