export const match = (param): param is `${number}` => /\d+/.test(param);
