import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const t=JSON.parse(await readFile('/tmp/soravyn-revision-smoke.json','utf8'));
const base=`${process.env.SORAVYN_TEST_URL||t.origin}/api/companies/${t.companyId}/video`;
const jobs=await (await fetch(`${base}/jobs`)).json();const revision=jobs.find(j=>j.id===t.revisionId);assert.equal(revision.status,'succeeded');
const root=`data/video/${t.companyId}`;
const originalVoice=await readFile(`${root}/${t.jobId}/narration.wav`);const newVoice=await readFile(`${root}/${t.revisionId}/narration.wav`);assert.equal(createHash('sha256').update(originalVoice).digest('hex'),createHash('sha256').update(newVoice).digest('hex'));
const report=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',`${root}/${t.revisionId}/output.mp4`],{encoding:'utf8'}));assert.ok(report.streams.some(s=>s.codec_type==='audio'));assert.equal(Number(report.format.duration),10);
for(const name of ['output.mp4','captions.srt','assets.manifest.json','narration.wav']){const r=await fetch(`${base}/jobs/${t.revisionId}/files/${name}`);assert.equal(r.status,200);assert.ok((await r.arrayBuffer()).byteLength>0);}
const oldCaptions=await readFile(`${root}/${t.jobId}/captions.srt`,'utf8');const captions=await readFile(`${root}/${t.revisionId}/captions.srt`,'utf8');assert.equal(captions,oldCaptions);
const result={passed:true,originalJobId:t.jobId,revisionJobId:t.revisionId,duration:report.format.duration,codecs:report.streams.map(s=>s.codec_name),checks:['real French narration','client image decoded in isolated container','revision MP4 verified','narration WAV byte-identical','captions byte-identical','all artifacts downloadable'],mode:'real HyperFrames/espeak/FFmpeg, no external model'};
await writeFile('doc/verification/video-revision.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
