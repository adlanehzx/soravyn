import postgres from "postgres";
/** Keep existing physical database/role names on upgrade; never rename a live database. */
export async function resolveEmbeddedIdentity(port:number){
 for(const user of ["soravyn","opensoul","paperclip"]){
  const adminUrl=`postgres://${user}:${user}@127.0.0.1:${port}/postgres`;
  const client=postgres(adminUrl,{max:1,connect_timeout:3});
  try{
   const rows=await client<{datname:string}[]>`select datname from pg_database`;
   const database=["soravyn","opensoul","paperclip"].find(name=>rows.some(row=>row.datname===name))||"soravyn";
   return {adminUrl,database,connectionUrl:`postgres://${user}:${user}@127.0.0.1:${port}/${database}`};
  }catch(error){if(!["28P01","28000","42704"].includes(String((error as {code?:string}).code)))throw error;}
  finally{await client.end();}
 }
 throw new Error("Unable to connect to the embedded database with supported installation identities");
}
