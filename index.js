require('dotenv').config();

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  ModalBuilder,
  Partials,
  PermissionFlagsBits,
  PermissionsBitField,
  REST,
  Routes,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const config = require('../config.json');
const {
  getSticky,
  setSticky,
  getTicket,
  setTicket,
  deleteTicket
} = require('./storage');
const {
  color,
  ticketPanelPayload,
  ticketCreatedPayload,
  ticketChannelPayload,
  ticketClosedDmPayload,
  legitPayload,
  productsPayload,
  productsSelectPayload,
  productResultPayload
} = require('./ui');

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;

if (!token) {
  console.error('Brak DISCORD_TOKEN w pliku .env');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const commands = [
  new SlashCommandBuilder()
    .setName('panel-ticket')
    .setDescription('Wysyła panel do tworzenia ticketów.')
    .addChannelOption(o => o
      .setName('kanal')
      .setDescription('Kanał, na który wysłać panel')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('panel-produkty')
    .setDescription('Wysyła panel produktów/cennika.')
    .addChannelOption(o => o
      .setName('kanal')
      .setDescription('Kanał, na który wysłać panel')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('sticky-legit')
    .setDescription('Ustawia sticky message z wzorem +rep.')
    .addChannelOption(o => o
      .setName('kanal')
      .setDescription('Kanał legit-check')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
].map(c => c.toJSON());

function isStaff(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
  const roles = (config.ticket?.staffRoleIds || []).filter(Boolean);
  return roles.some(roleId => member.roles.cache.has(roleId));
}

function cleanChannelName(input) {
  return String(input || 'user')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'user';
}

function randomTicketId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 10; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function registerCommands() {
  if (!guildId) {
    console.warn('Brak GUILD_ID w .env — komendy slash nie zostaną zarejestrowane.');
    return;
  }
  const rest = new REST({ version: '10' }).setToken(token);
  await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), { body: commands });
  console.log(`Zarejestrowano ${commands.length} komendy slash na serwerze ${guildId}.`);
}

async function sendSticky(channel) {
  const oldId = getSticky(channel.id);
  if (oldId) {
    try {
      const old = await channel.messages.fetch(oldId);
      await old.delete().catch(() => null);
    } catch (_) {}
  }

  const msg = await channel.send(legitPayload());
  setSticky(channel.id, msg.id);
  return msg;
}

async function updateTicketMessage(channel, ticket) {
  if (!ticket?.messageId) return;
  try {
    const msg = await channel.messages.fetch(ticket.messageId);
    const user = await client.users.fetch(ticket.ownerId);
    await msg.edit(ticketChannelPayload({
      user,
      ticketId: ticket.ticketId,
      item: ticket.item,
      amount: ticket.amount,
      payment: ticket.payment,
      claimedBy: ticket.claimedBy
    }));
  } catch (err) {
    console.warn('Nie udało się zaktualizować wiadomości ticketa:', err.message);
  }
}

client.once('ready', async () => {
  console.log(`Zalogowano jako ${client.user.tag}`);
  try {
    await registerCommands();
  } catch (err) {
    console.error('Błąd rejestracji komend:', err);
  }

  // Jeżeli kanał Legit Check jest wpisany w configu, dopilnuj sticky po starcie bota.
  if (config.sticky?.enabledByDefault && config.sticky?.sendOnStartup && config.sticky?.channelId) {
    try {
      const stickyChannel = await client.channels.fetch(config.sticky.channelId);
      if (stickyChannel?.isTextBased() && stickyChannel.guild) {
        await sendSticky(stickyChannel);
        console.log(`Sticky Legit Check ustawiony na #${stickyChannel.name}.`);
      }
    } catch (err) {
      console.warn('Nie udało się ustawić sticky Legit Check po starcie:', err.message);
    }
  }
});

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const channel = interaction.options.getChannel('kanal', true);

      if (interaction.commandName === 'panel-ticket') {
        await channel.send(ticketPanelPayload());
        return interaction.reply({ content: `Panel ticketów wysłany na ${channel}.`, ephemeral: true });
      }

      if (interaction.commandName === 'panel-produkty') {
        await channel.send(productsPayload());
        return interaction.reply({ content: `Panel produktów wysłany na ${channel}.`, ephemeral: true });
      }

      if (interaction.commandName === 'sticky-legit') {
        await sendSticky(channel);
        return interaction.reply({ content: `Sticky legit-check ustawiony na ${channel}.`, ephemeral: true });
      }
    }

    if (interaction.isButton() && interaction.customId === 'ticket:create') {
      const modal = new ModalBuilder()
        .setCustomId('ticket:modal')
        .setTitle('Formularz zakupu');

      const item = new TextInputBuilder()
        .setCustomId('ticket:item')
        .setLabel('Co chcesz zakupić')
        .setPlaceholder('np. Robux / przedmiot / usługa')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(200);

      const amount = new TextInputBuilder()
        .setCustomId('ticket:amount')
        .setLabel('Kwota')
        .setPlaceholder('np. 100 PLN')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);

      const payment = new TextInputBuilder()
        .setCustomId('ticket:payment')
        .setLabel('Metoda płatności')
        .setPlaceholder('np. BLIK / przelew / PayPal')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100);

      modal.addComponents(
        new ActionRowBuilder().addComponents(item),
        new ActionRowBuilder().addComponents(amount),
        new ActionRowBuilder().addComponents(payment)
      );

      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'ticket:modal') {
      await interaction.deferReply({ ephemeral: true });

      const item = interaction.fields.getTextInputValue('ticket:item').trim();
      const amount = interaction.fields.getTextInputValue('ticket:amount').trim();
      const payment = interaction.fields.getTextInputValue('ticket:payment').trim();

      const categoryId = config.ticket?.categoryId || null;
      const permissionOverwrites = [
        {
          id: interaction.guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks
          ]
        },
        {
          id: client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ManageMessages
          ]
        }
      ];

      for (const roleId of (config.ticket?.staffRoleIds || []).filter(Boolean)) {
        permissionOverwrites.push({
          id: roleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageMessages
          ]
        });
      }

      const channel = await interaction.guild.channels.create({
        name: `${config.ticket?.channelPrefix || 'ticket'}-${cleanChannelName(interaction.user.username)}`,
        type: ChannelType.GuildText,
        parent: categoryId || undefined,
        topic: `Ticket użytkownika ${interaction.user.id}`,
        permissionOverwrites
      });

      const ticketId = randomTicketId();
      const ticket = {
        ticketId,
        ownerId: interaction.user.id,
        item,
        amount,
        payment,
        claimedBy: null,
        createdAt: Date.now(),
        messageId: null
      };

      const msg = await channel.send(ticketChannelPayload({
        user: interaction.user,
        ticketId,
        item,
        amount,
        payment
      }));

      ticket.messageId = msg.id;
      setTicket(channel.id, ticket);

      return interaction.editReply(ticketCreatedPayload(channel.id));
    }

    if (interaction.isButton() && interaction.customId === 'ticket:claim') {
      if (!isStaff(interaction.member)) {
        return interaction.reply({ content: 'Tylko administrator lub seller może przejąć ticketa.', ephemeral: true });
      }

      const ticket = getTicket(interaction.channelId);
      if (!ticket) return interaction.reply({ content: 'Nie znaleziono danych tego ticketa.', ephemeral: true });
      if (ticket.claimedBy) return interaction.reply({ content: 'Ten ticket został już przejęty.', ephemeral: true });

      ticket.claimedBy = interaction.user.id;
      setTicket(interaction.channelId, ticket);
      await updateTicketMessage(interaction.channel, ticket);
      return interaction.reply({ content: `Ticket przejęty przez ${interaction.user}.`, ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId === 'ticket:close') {
      if (!isStaff(interaction.member)) {
        return interaction.reply({ content: 'Tylko administrator lub seller może zamknąć ticketa.', ephemeral: true });
      }
      const ticket = getTicket(interaction.channelId);
      if (!ticket) return interaction.reply({ content: 'Nie znaleziono danych tego ticketa.', ephemeral: true });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket:close-confirm')
          .setLabel('Tak, zamknij')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('ticket:close-cancel')
          .setLabel('Anuluj')
          .setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({ content: 'Na pewno zamknąć ten ticket?', components: [row], ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId === 'ticket:close-cancel') {
      return interaction.update({ content: 'Anulowano zamykanie ticketa.', components: [] });
    }

    if (interaction.isButton() && interaction.customId === 'ticket:close-confirm') {
      if (!isStaff(interaction.member)) {
        return interaction.reply({ content: 'Brak uprawnień.', ephemeral: true });
      }

      const ticket = getTicket(interaction.channelId);
      if (!ticket) {
        return interaction.update({ content: 'Nie znaleziono danych tego ticketa.', components: [] });
      }

      const delay = Number(config.ticket?.closeDelaySeconds || 5);
      let dmSent = false;

      try {
        const owner = await client.users.fetch(ticket.ownerId);
        await owner.send(ticketClosedDmPayload({
          user: owner,
          ticketId: ticket.ticketId,
          item: ticket.item,
          amount: ticket.amount,
          payment: ticket.payment,
          closedBy: interaction.user.id,
          closedAt: new Date()
        }));
        dmSent = true;
      } catch (err) {
        console.warn(`Nie udało się wysłać DM po zamknięciu ticketa ${ticket.ticketId}:`, err.message);
      }

      await interaction.update({
        content: dmSent
          ? `Wiadomość prywatna została wysłana do właściciela. Ticket zostanie zamknięty za ${delay} s.`
          : `Nie udało się wysłać wiadomości prywatnej (użytkownik może mieć wyłączone DM). Ticket zostanie zamknięty za ${delay} s.`,
        components: []
      });

      deleteTicket(interaction.channelId);
      setTimeout(() => interaction.channel.delete('Ticket zamknięty').catch(() => null), delay * 1000);
      return;
    }

    if (interaction.isButton() && interaction.customId === 'ticket:settings') {
      if (!isStaff(interaction.member)) {
        return interaction.reply({ content: 'Tylko administrator lub seller może używać ustawień ticketa.', ephemeral: true });
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket:rename')
          .setLabel('Zmień nazwę')
          .setEmoji('✏️')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('ticket:add-user')
          .setLabel('Dodaj użytkownika')
          .setEmoji('➕')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('ticket:remove-user')
          .setLabel('Usuń użytkownika')
          .setEmoji('➖')
          .setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({ content: 'Ustawienia ticketa:', components: [row], ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId === 'ticket:rename') {
      if (!isStaff(interaction.member)) return interaction.reply({ content: 'Brak uprawnień.', ephemeral: true });
      const modal = new ModalBuilder().setCustomId('ticket:rename-modal').setTitle('Zmień nazwę ticketa');
      const input = new TextInputBuilder()
        .setCustomId('ticket:new-name')
        .setLabel('Nowa nazwa kanału')
        .setPlaceholder('np. ticket-robux')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(90);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'ticket:rename-modal') {
      if (!isStaff(interaction.member)) return interaction.reply({ content: 'Brak uprawnień.', ephemeral: true });
      const newName = cleanChannelName(interaction.fields.getTextInputValue('ticket:new-name'));
      await interaction.channel.setName(newName);
      return interaction.reply({ content: `Nazwa kanału została zmieniona na **${newName}**.`, ephemeral: true });
    }

    if (interaction.isButton() && ['ticket:add-user', 'ticket:remove-user'].includes(interaction.customId)) {
      if (!isStaff(interaction.member)) return interaction.reply({ content: 'Brak uprawnień.', ephemeral: true });
      const mode = interaction.customId === 'ticket:add-user' ? 'add' : 'remove';
      const modal = new ModalBuilder().setCustomId(`ticket:${mode}-user-modal`).setTitle(mode === 'add' ? 'Dodaj użytkownika' : 'Usuń użytkownika');
      const input = new TextInputBuilder()
        .setCustomId('ticket:user-id')
        .setLabel('ID użytkownika')
        .setPlaceholder('Wklej ID użytkownika Discord')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(30);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && ['ticket:add-user-modal', 'ticket:remove-user-modal'].includes(interaction.customId)) {
      if (!isStaff(interaction.member)) return interaction.reply({ content: 'Brak uprawnień.', ephemeral: true });
      const userId = interaction.fields.getTextInputValue('ticket:user-id').replace(/\D/g, '');
      if (!userId) return interaction.reply({ content: 'Nieprawidłowe ID użytkownika.', ephemeral: true });

      const adding = interaction.customId === 'ticket:add-user-modal';
      if (adding) {
        await interaction.channel.permissionOverwrites.edit(userId, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        });
      } else {
        const ticket = getTicket(interaction.channelId);
        if (ticket && ticket.ownerId === userId) {
          return interaction.reply({ content: 'Nie można usunąć właściciela ticketa.', ephemeral: true });
        }
        await interaction.channel.permissionOverwrites.delete(userId).catch(() => null);
      }
      return interaction.reply({ content: adding ? `Dodano <@${userId}> do ticketa.` : `Usunięto <@${userId}> z ticketa.`, ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId === 'products:open') {
      return interaction.reply(productsSelectPayload());
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'products:select') {
      const category = interaction.values[0];
      const channelId = config.products?.[category] || '';
      return interaction.update(productResultPayload(category, channelId, interaction.guildId));
    }
  } catch (err) {
    console.error(err);
    const payload = { content: 'Wystąpił błąd podczas wykonywania tej akcji.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(() => null);
    } else {
      await interaction.reply(payload).catch(() => null);
    }
  }
});

client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  const configuredSticky = config.sticky?.channelId;
  if (!config.sticky?.enabledByDefault || !config.sticky?.refreshOnEveryMessage) return;
  if (!configuredSticky || message.channel.id !== configuredSticky) return;

  setTimeout(() => sendSticky(message.channel).catch(() => null), 1200);
});

client.login(token);
