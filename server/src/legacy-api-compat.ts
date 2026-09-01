import type { RequestHandler } from "express";
/** Compatibility for saved gateway configuration and older onboarding clients. */
export function normalizeLegacyApiFields(value:unknown):unknown {
 if(Array.isArray(value))return value.map(normalizeLegacyApiFields);
 if(!value||typeof value!=="object")return value;
 const record=value as Record<string,unknown>;
 const next:Record<string,unknown>=Object.create(null);
 for(const [key,item] of Object.entries(record))next[key]=normalizeLegacyApiFields(item);
 if(next.soravynApiUrl===undefined&&typeof next.paperclipApiUrl==="string")next.soravynApiUrl=next.paperclipApiUrl;
 return next;
}
export const legacyApiCompatibility:RequestHandler=(req,_res,next)=>{
 if(req.body)req.body=normalizeLegacyApiFields(req.body);
 next();
};
