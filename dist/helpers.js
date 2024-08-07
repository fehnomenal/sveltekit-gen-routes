// src/plugin/helpers.ts
var createSearchFromParams = (params, char = "?") => {
  const search = params.toString();
  return search ? char + search : "";
};
var createSearchFromObject = (params, char) => {
  return createSearchFromArray(Object.entries(params), char);
};
var createSearchFromArray = (params, char) => {
  const _params = new URLSearchParams;
  for (const [name, val] of params) {
    if (Array.isArray(val)) {
      for (const v of val) {
        _params.append(name, v);
      }
    } else if (val) {
      _params.append(name, val);
    }
  }
  return createSearchFromParams(_params, char);
};
var createSearch = (params, char) => {
  if (Array.isArray(params)) {
    return createSearchFromArray(params, char);
  } else if (params instanceof URLSearchParams) {
    return createSearchFromParams(params, char);
  } else if (params) {
    return createSearchFromObject(params, char);
  }
  return "";
};
var createSearchExtra = (params, extra, char) => {
  const extraEntries = Object.entries(extra);
  if (Array.isArray(params)) {
    return createSearchFromArray([...params, ...extraEntries], char);
  } else if (params instanceof URLSearchParams) {
    return createSearchFromArray([...params.entries(), ...extraEntries], char);
  } else if (params) {
    return createSearchFromArray([...Object.entries(params), ...extraEntries], char);
  }
  return createSearchFromArray(extraEntries, char);
};
var routeQuery = (url, char) => (q) => url + createSearch(q, char);
var routeQueryParam = (url, q, char) => url + createSearch(q, char);
var routeQueryExtra = (url, q, extra, char) => url + createSearchExtra(q, extra, char);
var joinSegments = (segments) => segments ? [segments].flat().filter(Boolean).map((s) => `/${s}`).join("") : "";
export {
  routeQueryParam,
  routeQueryExtra,
  routeQuery,
  joinSegments
};
