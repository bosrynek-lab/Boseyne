const fs = require('node:fs');
const path = require('node:path');

const dataDir = path.join(__dirname, '..', 'data');
const dataFile = path.join(dataDir, 'storage.json');

function ensureStorage() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify({ tickets: {}, stickyMessages: {} }, null, 2));
  }
}

function readStorage() {
  ensureStorage();
  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  } catch {
    return { tickets: {}, stickyMessages: {} };
  }
}

function writeStorage(data) {
  ensureStorage();
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

function getTicket(channelId) {
  return readStorage().tickets[channelId] || null;
}

function setTicket(channelId, ticket) {
  const data = readStorage();
  data.tickets[channelId] = ticket;
  writeStorage(data);
}

function deleteTicket(channelId) {
  const data = readStorage();
  delete data.tickets[channelId];
  writeStorage(data);
}

function getSticky(channelId) {
  return readStorage().stickyMessages[channelId] || null;
}

function setSticky(channelId, messageId) {
  const data = readStorage();
  data.stickyMessages[channelId] = messageId;
  writeStorage(data);
}

module.exports = {
  readStorage,
  writeStorage,
  getTicket,
  setTicket,
  deleteTicket,
  getSticky,
  setSticky
};
