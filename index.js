// Require the necessary discord.js classes
const { Client, Intents, MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');
const { token, clientId } = require('./config.json');
const { commands } = require('./commands.js');
const fs = require('fs')

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

async function arrayToButtons(arr){
  let rows = [] ;
  let currentRow = 0;
  let count = 0;
  await arr.map(type => {
    if ( count === 5 ) {
      count = 0
      currentRow = currentRow + 1;
    }
    if (rows[currentRow] === undefined) { 
      rows[currentRow] = new MessageActionRow()
    }
    const row = rows[currentRow]
    row.addComponents(
      new MessageButton()
        .setCustomId(type)
        .setLabel(capitalizeFirstLetter(type))
        .setStyle('PRIMARY'),
    );
    count = count + 1;
  })
  return rows
}

async function writeItems(items){
  try{
    const newItems = JSON.stringify(items)
    await fs.writeFileSync(`data/db/items.json`, newItems)
    return true
    }catch(err){
      console.log(err)
    }

    
}
let mainType = undefined;
const defaultUserData = {
  level: 1,
  balance : 100,
  baseHealth : 100,
  baseArmor: 10,
  baseMagicResistance: 10,
  baseMana : 50,
  inventory : {baseSlots : 20, baseCapacity : 100, items : []},
  equipment: {
    rightHand: null,
    leftHand: null,
    head: null,
    torso: null,
    legs: null,
    feets: null,
    hands: null,
    back: null
  }
}

async function getUserData(userId){
  try{
  const rawData = await fs.readFileSync(`data/users/${userId}.json`)
  const userData = JSON.parse(rawData)
  return userData
  }catch(err){
    const newUserData = JSON.stringify(defaultUserData)
    await fs.writeFileSync(`data/users/${userId}.json`, newUserData)
    return getUserData(userId)
  }

}
async function getItemsDb(){
  try{
  const rawData = await fs.readFileSync(`data/db/items.json`)
  const items = JSON.parse(rawData)
  return items
  }catch(err){
    return null
  }

}
// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGES]});

// When the client is ready, run this code (only once)
client.on('ready', () => {
	console.log('Ready!');
});

client.on("messageCreate", (message) => {
    const channel = message.channel
    console.log(message.author.id)
    console.log(clientId)
    if (message.author.bot) return false; 
    
    console.log(`Message from ${message.author.username}: ${message.content}`);
});


client.on('message', (msg) => {
  if (!msg.author.bot) msg.author.send('ok ' + msg.author.id);
  console.log(msg.content)
  });

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;
  const items = await getItemsDb()
  const mainTypes = Object.keys(items);
  let currentType = interaction?.customId || undefined
  if (mainTypes.includes(interaction.customId)) mainType = interaction.customId
  let itemName = undefined
  let itemDesc = undefined
  let power = undefined
  let subCategory = undefined
  if (mainTypes.includes(interaction.customId)) {
    const buttons = await arrayToButtons(Object.keys(items[interaction.customId]))
    return interaction.update({content : 'Agora selecione o tipo.', components : buttons})
  } else {
    try{
      interaction.update({content : 'Digite o nome do item (máx 20 caractéres).', components : []})
    }catch(err){
      console.log(err)
    }

    const filter = m => m.author.id === interaction.user.id
    const collector = interaction.channel.createMessageCollector({ filter, time: 150000 });
    collector.on('collect', async m => {
      if (!itemName){
        itemName = m.content.substring(0, 20)
        return m.reply({content : 'Digite uma descrição para o item (máx 100 caractéres).', components : []})
      }
      else if (!itemDesc){
        itemDesc = m.content.substring(0, 100)
        return m.reply({content : 'Digite o poder do item (máx 3 caractéres).', components : []})
      }
      else if (!power){ 
        power = m.content.substring(0, 10)
        const newItems = items
        let remanescentItems = undefined
        try{
          remanescentItems = items[mainType][currentType]
        }catch(err){
          remanescentItems = []
        }
        console.log(newItems, mainType, currentType)
        newItems[mainType][currentType] = [...remanescentItems, {name: itemName, power, desc: itemDesc}]
        await writeItems(newItems)
        m.reply({content : 'Item inserido!', components : []})
        return collector.stop
      }
    });

    collector.on('end', collected => {
      console.log(`Collected ${collected.size} items`);
    });


  }
});




client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'ping') {
    await interaction.reply('Pong!');
  } else if (commandName === 'server') {
    await interaction.reply('Server info.');
  } else if (commandName === 'info') {
    await interaction.reply('User info.');
  } else if (commandName === 'bal') {
    const userData = await getUserData(interaction.user.id)
    await interaction.reply({content:`Your current balance is: ${userData.balance}`});
  } else if (commandName === 'listitems') {
    const items = await getItemsDb()

    const embed = new MessageEmbed()
    .setColor('#0099ff')
    .setTitle('BASE DE ITEMS')
    .setAuthor('HenriqueCFS', 'https://i.imgur.com/kIOfw7J.jpg', 'https://github.com/HenriqueCFS')
    .setThumbnail('https://i.imgur.com/552nZXy.png')
    .setTimestamp()
    .setFooter('Unlimited Confraria Works');
    Object.keys(items).map(cat=>{
      if (cat) embed.addField(cat, 'Categoria')
      const catItem = items[cat]
      Object.keys(catItem).map(subcat=>{
        if (subcat) embed.addField(subcat, items[cat][subcat].length > 0 ? 'Subcategoria' : 'Nenhum item deste tipo.')
        items[cat][subcat].map(item=>{
          embed.addField(item.name, `${item.desc} - Força: ${item.power}`)
        })
      })
    })
    return interaction.reply({ embeds: [embed] });
  } else if (commandName === 'additem') {
    const items = await getItemsDb()
    if (items === null) return await interaction.reply('Erro ao ler o banco de dados')
    else {
      const types = Object.keys(items);
      const buttons = await arrayToButtons(types)
      await interaction.reply({content: 'Selecione a categoria.', components : buttons})
    }
  }
});

  


// Login to Discord with your client's token
client.login(token);