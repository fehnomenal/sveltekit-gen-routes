import"./index-3e5b4906b422a611.js";var o=(r,e="?")=>{const t=r.toString();return t?e+t:""},u=(r,e)=>{return n(Object.entries(r),e)},n=(r,e)=>{const t=new URLSearchParams;for(let[s,i]of r)if(Array.isArray(i))for(let a of i)t.append(s,a);else if(i)t.append(s,i);return o(t,e)},c=(r,e)=>{if(Array.isArray(r))return n(r,e);else if(r instanceof URLSearchParams)return o(r,e);else if(r)return u(r,e);return""},g=(r,e,t)=>{if(Array.isArray(r))return n([...r,...Object.entries(e)],t);else if(r instanceof URLSearchParams)return n([...r.entries(),...Object.entries(e)],t);else if(r)return n([...Object.entries(r),...Object.entries(e)],t);return""},f=(r,e)=>(t)=>r+c(t,e),y=(r,e,t)=>r+c(e,t),d=(r,e,t,s)=>r+g(e,t,s),P=(r)=>typeof r==="string"?r:r.join("/");export{y as routeQueryParam,d as routeQueryExtra,f as routeQuery,P as joinSegments};
