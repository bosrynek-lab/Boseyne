const fs = require('node:fs');
const path = require('node:path');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder
} = require('discord.js');

const config = require('../config.json');

function color() {
  const raw = String(config.themeColor || '#3498DB').replace('#', '');
  return parseInt(raw, 16);
}

function assetPath(key) {
  const rel = config.assets?.[key];
  if (!rel) return null;
  const full = path.join(__dirname, '..', rel);
  return fs.existsSync(full) ? full : null;
}

function addLocalImage(payload, embed, key, fileName) {
  const full = assetPath(key);
  if (!full) return payload;
  payload.files = payload.files || [];
  payload.files.push({ attachment: full, name: fileName });
  embed.setImage(`attachment://${fileName}`);
  return payload;
}

function ticketPanelPayload() {
  const embed = new EmbedBuilder()
    .setColor(color())
    .setTitle('🌊  ·  RYNEK SHOP × TICKETY')
    .setDescription([
      '🛒  ·  **Chcesz coś zakupić lub potrzebujesz pomocy?**',
      'Kliknij przycisk poniżej, uzupełnij formularz, a utworzymy dla Ciebie prywatny ticket.',
      '',
      '🌊  ·  W formularzu podasz: **co chcesz zakupić, kwotę i metodę płatności.**'
    ].join('\n'))
    .setFooter({ text: `🌊 © 2026 ${config.brandName} × Panel Ticketów` });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket:create')
      .setLabel('Utwórz ticket')
      .setEmoji('🛒')
      .setStyle(ButtonStyle.Primary)
  );

  const payload = { embeds: [embed], components: [row] };
  return addLocalImage(payload, embed, 'ticketBanner', 'ticket-banner.png');
}

function ticketCreatedPayload(channelId) {
  const embed = new EmbedBuilder()
    .setColor(color())
    .setTitle('✅  ·  Sukces!')
    .setDescription(`**Sukces!** Twój ticket został utworzony, znajdziesz go na <#${channelId}>.`)
    .setFooter({ text: `🌊 © 2026 ${config.brandName} × Sukces` });
  return { embeds: [embed], ephemeral: true };
}

function ticketChannelPayload({ user, ticketId, item, amount, payment, claimedBy = null }) {
  const embed = new EmbedBuilder()
    .setColor(color())
    .setTitle('🌊  ·  RYNEK SHOP × POMOC')
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .addFields(
      {
        name: '👤  ·  Informacje o użytkowniku',
        value: [
          `› **Ping:** <@${user.id}>`,
          `› **TAG:** ${user.tag || user.username}`,
          `› **ID:** \`${user.id}\``
        ].join('\n')
      },
      {
        name: 'ℹ️  ·  Informacje o tickecie',
        value: [
          `› **ID Ticketa:** \`${ticketId}\``,
          `› **Co chcesz zakupić:** ${item}`,
          `› **Kwota:** ${amount}`,
          `› **Metoda płatności:** ${payment}`,
          claimedBy ? `› **Przejęty przez:** <@${claimedBy}>` : '› **Status:** Oczekuje na obsługę'
        ].join('\n')
      }
    )
    .setFooter({ text: `🌊 © 2026 ${config.brandName} × Pomoc` });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket:close')
      .setLabel('Zamknij ticketa')
      .setEmoji('✖️')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('ticket:settings')
      .setLabel('Ustawienia ticketa')
      .setEmoji('⚙️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ticket:claim')
      .setLabel(claimedBy ? 'Ticket przejęty' : 'Przejmij ticketa')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(Boolean(claimedBy))
  );

  return { embeds: [embed], components: [row] };
}


function ticketClosedDmPayload({ user, ticketId, item, amount, payment, closedBy = null, closedAt = new Date() }) {
  const ts = Math.floor(closedAt.getTime() / 1000);
  const embed = new EmbedBuilder()
    .setColor(color())
    .setTitle('🌊  ·  RYNEK SHOP × ZAMKNIĘTO TWOJEGO TICKETA')
    .setDescription([
      `Hejka <@${user.id}>! Twój ticket został **zamknięty**.`,
      'Dziękujemy za skorzystanie z naszych usług i zapraszamy ponownie!'
    ].join('\n'))
    .addFields({
      name: 'ℹ️  ·  Informacje o tickecie',
      value: [
        `› **ID Ticketa:** \`${ticketId}\``,
        `› **Zamknięto:** <t:${ts}:F>`,
        `› **Co kupowałeś:** ${item || 'Brak danych'}`,
        `› **Kwota:** ${amount || 'Brak danych'}`,
        `› **Metoda płatności:** ${payment || 'Brak danych'}`,
        closedBy ? `› **Zamknął:** <@${closedBy}>` : null
      ].filter(Boolean).join('\n')
    })
    .setFooter({ text: `🌊 © 2026 ${config.brandName} × Zamknięto Twojego Ticketa` });

  return { embeds: [embed] };
}

function legitPayload() {
  const embed = new EmbedBuilder()
    .setColor(color())
    .setTitle('🌊  ·  RYNEK SHOP × LEGIT CHECK')
    .addFields(
      {
        name: '✏️  ·  Wzór:',
        value: '`+rep @Użytkownik (co zakupiłeś/sprzedałeś) (metoda płatności)`'
      },
      {
        name: 'ℹ️  ·  Przykład:',
        value: '`+rep @auto_wywrotka torpedo (blik)`'
      }
    )
    .setFooter({ text: `🌊 © 2026 ${config.brandName} × Legit Check` });

  const payload = { embeds: [embed] };
  return addLocalImage(payload, embed, 'legitBanner', 'legit-banner.png');
}

function productsPayload() {
  const embed = new EmbedBuilder()
    .setColor(color())
    .setTitle('🛒  ·  RYNEK SHOP × CENNIK')
    .setDescription([
      '🌊  ·  **Wybierz interesującą Cię kategorię produktów.**',
      'Po wyborze pokażemy Ci właściwy kanał z cenami.',
      '',
      '🛒  ·  Kliknij przycisk poniżej, aby otworzyć listę kategorii.'
    ].join('\n'))
    .setFooter({ text: `🛒 © 2026 ${config.brandName}` });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('products:open')
      .setLabel('Wybierz kategorię')
      .setEmoji('🛒')
      .setStyle(ButtonStyle.Primary)
  );

  const payload = { embeds: [embed], components: [row] };
  return addLocalImage(payload, embed, 'productsBanner', 'products-banner.png');
}

function productsSelectPayload() {
  const options = Object.keys(config.products || {}).map((name, index) => ({
    label: name,
    value: name,
    emoji: index % 2 === 0 ? '🛒' : '🌊'
  }));

  const select = new StringSelectMenuBuilder()
    .setCustomId('products:select')
    .setPlaceholder('Wybierz kategorię')
    .addOptions(options);

  const row = new ActionRowBuilder().addComponents(select);

  const embed = new EmbedBuilder()
    .setColor(color())
    .setTitle('🛒  ·  Wybierz kategorię')
    .setDescription('Wybierz kategorię z listy poniżej. Ta wiadomość jest widoczna tylko dla Ciebie.');

  return { embeds: [embed], components: [row], ephemeral: true };
}

function productResultPayload(category, channelId, guildId) {
  const embed = new EmbedBuilder()
    .setColor(color())
    .setTitle(`🛒  ·  ${category}`)
    .setDescription(
      channelId
        ? `Ceny tych przedmiotów znajdziesz na kanale <#${channelId}>.`
        : 'Kanał cen dla tej kategorii nie został jeszcze skonfigurowany.'
    )
    .setFooter({ text: `🌊 © 2026 ${config.brandName} × Cennik` });

  const components = [];
  if (channelId && guildId) {
    components.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Przejdź do kanału')
          .setEmoji('🛒')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${guildId}/${channelId}`)
      )
    );
  }

  return { embeds: [embed], components, ephemeral: true };
}

module.exports = {
  color,
  ticketPanelPayload,
  ticketCreatedPayload,
  ticketChannelPayload,
  ticketClosedDmPayload,
  legitPayload,
  productsPayload,
  productsSelectPayload,
  productResultPayload
};
