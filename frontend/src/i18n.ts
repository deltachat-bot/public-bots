const langs: { [k: string]: { [k: string]: string } } = {};

langs["en"] = {
  "search-placeholder": "Search among {0} bots",
  "last-updated": "Last updated: {0}",
  admin: "Admin: ",
};

langs["es"] = {
  "search-placeholder": "Buscar entre {0} bots",
  "last-updated": "Actualizado: {0}",
  admin: "Admin: ",
};

export function getText(key: string): string {
  const currentLang = (
    (window.navigator && window.navigator.language) ||
    "en-US"
  )
    .slice(0, 2)
    .toLowerCase();
  return langs[currentLang][key] || langs["en"][key] || key;
}

export function format(template: string, ...args: any[]) : string {
  return template.replace(/{(\d+)}/g, function (match, numb) {
    return typeof args[numb] != "undefined" ? args[numb] : match;
  });
}
