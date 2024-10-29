// função para obter o timestamp local no formato desejado
const getLocalTimestamp = () => {
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

  // Formata o timestamp
  const localTimestamp = timestamp.replace(/\//g, '-').replace(',', '');
  return localTimestamp; // Retorna o timestamp no formato 'YYYY-MM-DD HH:mm:ss'
};

module.exports = getLocalTimestamp;
