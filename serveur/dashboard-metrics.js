// Les dates du serveur sont des jours de Paris ; midi UTC évite les décalages saisonniers.
export function serie(jours, aujourdhui, n = 30, depuis = null) {
  const base = Date.parse(`${aujourdhui}T12:00:00Z`);
  const debut = depuis ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(depuis)) : null;
  return Array.from({ length: n }, (_, i) => {
    const jour = new Date(base - (n - 1 - i) * 864e5).toISOString().slice(0, 10);
    return [jour, debut && jour < debut ? null : jours[jour] || 0];
  });
}

export function csv(s) {
  return '\uFEFFdate;chargements\r\n' + s.map(([jour, n]) => `${jour};${n ?? ''}`).join('\r\n');
}
