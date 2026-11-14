const common = `const fs=require('fs');const cp=require('child_process');
function run(cmd,args,input){const r=cp.spawnSync(cmd,args,{input,encoding:'utf8',maxBuffer:4*1024*1024});if(r.status!==0)throw new Error(cmd+' failed');return r.stdout;}
const v=JSON.parse(fs.readFileSync('/work/render-input.json','utf8'));
`;
export const sandboxPreparationCode = common + `
fs.copyFileSync('/opt/video/node_modules/gsap/dist/gsap.min.js','/work/gsap.min.js');
if(fs.existsSync('/work/logo.source'))run(process.execPath,['-e',"require('/opt/video/node_modules/sharp')('/work/logo.source',{limitInputPixels:40000000}).rotate().resize(600,600,{fit:'inside',withoutEnlargement:true}).png().toFile('/work/logo.png').catch(()=>process.exit(1))"]);
for(let i=0;i<v.scenes.length;i++){if(v.scenes[i].imageAssetId)run(process.execPath,['-e',"require('/opt/video/node_modules/sharp')('/work/media-"+i+".source',{limitInputPixels:40000000}).rotate().resize(1920,1920,{fit:'inside',withoutEnlargement:true}).png().toFile('/work/media-"+i+".png').catch(()=>process.exit(1))"]);}
if(v.narration!=='none'&&!v.reuseNarration){
 const parts=[];
 for(let i=0;i<v.scenes.length;i++){const s=v.scenes[i];run('espeak-ng',['-v',v.narration,'-s',String(v.voiceSpeed||145),'-p',String(v.voicePitch??50),'-g',String(v.voiceGap||0),'-w','/work/speech-'+i+'.wav','--stdin'],(v.pronunciations||[]).reduce((text,rule)=>text.split(rule.from).join(rule.to),s.speech||s.text));
 const probe=JSON.parse(run('ffprobe',['-v','error','-show_format','-of','json','/work/speech-'+i+'.wav']));if(Number(probe.format.duration)>s.duration)throw new Error('Narration exceeds scene duration');
 run('ffmpeg',['-y','-v','error','-i','/work/speech-'+i+'.wav','-af','apad','-t',String(s.duration),'-ar','48000','-ac','1','/work/voice-'+i+'.wav']);parts.push("file '/work/voice-"+i+".wav'");}
 fs.writeFileSync('/work/voice-list.txt',parts.join(String.fromCharCode(10)));
 run('ffmpeg',['-y','-v','error','-f','concat','-safe','0','-i','/work/voice-list.txt','-c','copy','/work/narration.wav']);
 if(v.normalizeAudio){fs.renameSync('/work/narration.wav','/work/unnormalized.wav');run('ffmpeg',['-y','-v','error','-i','/work/unnormalized.wav','-af','loudnorm=I=-16:TP=-1.5:LRA=11','-ar','48000','-ac','1','/work/narration.wav']);}
}
`;
export const sandboxRenderCode = common + `
run(process.execPath,['/opt/video/node_modules/hyperframes/dist/cli.js','render','/work','--quality','draft','--fps','24','--workers','1','--output','/work/output.mp4']);
if(v.narration!=='none'){fs.renameSync('/work/output.mp4','/work/silent.mp4');run('ffmpeg',['-y','-v','error','-i','/work/silent.mp4','-i','/work/narration.wav','-c:v','copy','-c:a','aac','-shortest','-movflags','+faststart','/work/output.mp4']);}
`;
export const sandboxVoicePreviewCode = common + `
const text=(v.pronunciations||[]).reduce((s,r)=>s.split(r.from).join(r.to),v.scenes[0].text);
run('espeak-ng',['-v',v.narration,'-s',String(v.voiceSpeed),'-p',String(v.voicePitch),'-g',String(v.voiceGap||0),'-w','/work/narration.wav','--stdin'],text);
if(v.normalizeAudio){fs.renameSync('/work/narration.wav','/work/unnormalized.wav');run('ffmpeg',['-y','-v','error','-i','/work/unnormalized.wav','-af','loudnorm=I=-16:TP=-1.5:LRA=11','-ar','48000','-ac','1','/work/narration.wav']);}
`;
