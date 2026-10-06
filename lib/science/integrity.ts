// Canonical representation for hashes stable across PostgreSQL JSONB key ordering.
export function canonicalJson(value:unknown):string{
 if(Array.isArray(value))return '['+value.map(canonicalJson).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,v])=>JSON.stringify(key)+':'+canonicalJson(v)).join(',')+'}';
 return JSON.stringify(value)??'null';
}
