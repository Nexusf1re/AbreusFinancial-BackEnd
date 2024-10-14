//constante para obter o timestamp local
const timestamp = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date());
  
  const localTimestamp = timestamp.replace(/\//g, '-').replace(',', '');

  module.exports = localTimestamp;