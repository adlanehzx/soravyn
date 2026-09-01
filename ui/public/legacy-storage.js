/* Upgrade compatibility only. Old preferences are copied once, never deleted or logged. */
(() => {
  for (const name of ["localStorage", "sessionStorage"]) {
    try {
      const storage=window[name];
      const marker="soravyn.storageMigration.v1";
      if(storage.getItem(marker)==="done")continue;
      for(const prefix of ["opensoul", "paperclip"]){
        const keys=Array.from({length:storage.length},(_,index)=>storage.key(index)).filter(Boolean);
        for(const key of keys){
          if(!key.startsWith(prefix+".")&&!key.startsWith(prefix+":"))continue;
          const target="soravyn"+key.slice(prefix.length);
          if(storage.getItem(target)===null){const value=storage.getItem(key);if(value!==null)storage.setItem(target,value);}
        }
      }
      storage.setItem(marker,"done");
    }catch{ /* Restricted storage must never block application startup. */ }
  }
})();
