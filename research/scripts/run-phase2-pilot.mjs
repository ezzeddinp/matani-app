import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fetchCdseToken, CDSE_TOKEN_URL, CDSE_CATALOG_URL, CDSE_PROCESS_URL } from '../lib/cdse-pilot.mjs';
import { extractProcessParts } from '../../backend/measurement/multipart.js';
import { checkPairedSources } from './prepare-paired-process.mjs';
const require = createRequire(new URL('../../backend/package.json', import.meta.url));
const { fromArrayBuffer } = await import(require.resolve('geotiff'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const privateRoot = new URL('../private/replacement-study/', import.meta.url);
const frozenBytes = readFileSync(new URL('phase1-frozen-manifest.json', privateRoot));
const spec = JSON.parse(frozenBytes);
const candidates = JSON.parse(readFileSync(new URL('open-sea-candidates.geojson', privateRoot)));
const limits = { authentication: 1, catalogue: 4, process: 2 };
const used = { authentication: 0, catalogue: 0, process: 0 };
function take(kind) { if (used[kind] >= limits[kind]) throw new Error(`${kind}-cap-reached`); used[kind]++; }
if (!process.argv.includes('--allow-live')) {
  take('authentication'); assert.throws(() => take('authentication'));
  for (let i=0;i<4;i++) take('catalogue'); assert.throws(() => take('catalogue'));
  for (let i=0;i<2;i++) take('process'); assert.throws(() => take('process'));
  assert.equal(spec.request_templates.length,2);
  console.log(JSON.stringify({ offline_checks:'passed', limits, live:false }));
  process.exit(0);
}
if (!process.env.SENTINEL_CLIENT_ID || !process.env.SENTINEL_CLIENT_SECRET) throw new Error('credentials-missing');
const destination = process.argv[process.argv.indexOf('--output')+1];
if (!process.argv.includes('--output') || !/^phase2-[a-zA-Z0-9-]+$/.test(destination)) throw new Error('fresh-output-name-required');
const out = new URL(`${destination}/`, privateRoot);
mkdirSync(out,{mode:0o700});
const save = (name,value) => writeFileSync(new URL(name,out),typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
const report = { started:new Date().toISOString(), frozen_sha256:hash(frozenBytes), limits, used, retries:0, concurrency:1, account_balance:'unverified; request cap is not a balance check', status:'running', responses:[] };
save('specification.json',frozenBytes);
async function request(kind,name,url,body,token) {
  take(kind); save(`${name}-request.json`,{url,body});
  const response = await fetch(url,{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',Accept:kind==='process'?'multipart/mixed':'application/geo+json'},body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});
  const raw=Buffer.from(await response.arrayBuffer());
  save(`${name}-response.bin`,raw);
  const metadata={name,status:response.status,sha256:hash(raw),bytes:raw.length,content_type:response.headers.get('content-type'),processing_units:response.headers.get('x-processingunits-spent'),request_id:response.headers.get('x-request-id')};
  save(`${name}-response-metadata.json`,metadata); report.responses.push(metadata);
  if(!response.ok) throw new Error(`${name}-http-${response.status}`);
  return {raw,response};
}
try {
  take('authentication');
  const token=await fetchCdseToken({clientId:process.env.SENTINEL_CLIENT_ID,clientSecret:process.env.SENTINEL_CLIENT_SECRET,tokenUrl:CDSE_TOKEN_URL});
  report.authentication='succeeded';
  const base={collections:['sentinel-2-l2a'],datetime:`${spec.period.start}T00:00:00Z/${spec.period.end_exclusive}T00:00:00Z`,intersects:candidates.features[0].geometry,limit:100};
  const items=new Map(), cursors=new Set(); let next;
  do {
    const {raw}=await request('catalogue',`catalogue-${used.catalogue+1}`,CDSE_CATALOG_URL,{...base,...(next===undefined?{}:{next})},token);
    const data=JSON.parse(raw);
    if(!Array.isArray(data.features)) throw new Error('catalogue-invalid-features');
    for(const item of data.features){
      const time=Date.parse(item.properties?.datetime);
      if(!item.id || !Number.isFinite(time)) throw new Error('catalogue-invalid-item');
      if(time < Date.parse(base.datetime.split('/')[0]) || time>=Date.parse(base.datetime.split('/')[1])) continue;
      if(items.has(item.id) && JSON.stringify(items.get(item.id))!==JSON.stringify(item)) throw new Error('catalogue-conflicting-id');
      items.set(item.id,item);
    }
    next=data.context?.next;
    if(next===null) next=undefined;
    if(next!==undefined){ if(cursors.has(String(next))) throw new Error('catalogue-repeated-cursor'); cursors.add(String(next)); }
    else if(data.links?.some(link=>link.rel==='next')) throw new Error('catalogue-unhandled-pagination');
  } while(next!==undefined);
  const sorted=[...items.values()].sort((a,b)=>a.properties.datetime.localeCompare(b.properties.datetime)||a.id.localeCompare(b.id));
  report.catalogue_complete=true; report.catalogue_items=sorted.length;
  report.catalogue_days=[...new Set(sorted.map(item=>new Date(item.properties.datetime).toISOString().slice(0,10)))];
  save('catalogue-inventory.json',sorted);
  if(!sorted.length) throw new Error('no-catalogue-acquisitions');
  const from=report.catalogue_days[0]+'T00:00:00.000Z',to=new Date(Date.parse(from)+86400000).toISOString();
  report.pilot_day=report.catalogue_days[0];
  const sources=[]; report.geometry_results={};
  for(const template of spec.request_templates){
    const index=template.indexName,body=structuredClone(template.body);
    body.input.data[0].dataFilter.timeRange={from,to};
    const {raw,response}=await request('process',index,CDSE_PROCESS_URL,body,token);
    const parts=await extractProcessParts(new Response(raw,{status:response.status,headers:{'content-type':response.headers.get('content-type')}}));
    save(`${index}.tiff`,parts.raster); save(`${index}-userdata.json`,parts.userdata);
    sources.push(...['original','buffered'].map(variant=>({key:`${variant}:${index}`,userdata:parts.userdata})));
    const image=await(await fromArrayBuffer(parts.raster.buffer.slice(parts.raster.byteOffset,parts.raster.byteOffset+parts.raster.byteLength))).getImage();
    const grid=spec.grids[index],origin=image.getOrigin(),resolution=image.getResolution(),keys=image.getGeoKeys();
    if(keys.ProjectedCSTypeGeoKey!==spec.epsg || image.getWidth()!==grid.width || image.getHeight()!==grid.height) throw new Error(`${index}-grid-shape-crs-mismatch`);
    assert.ok(Math.abs(origin[0]-grid.affine[2])<=1e-6 && Math.abs(origin[1]-grid.affine[5])<=1e-6);
    assert.ok(Math.abs(resolution[0]-grid.resolution_m)<=1e-6 && Math.abs(resolution[1]+grid.resolution_m)<=1e-6);
    if(image.fileDirectory.ModelTransformation) throw new Error('unexpected-grid-transform');
    const bands=await image.readRasters();
    if(bands.length!==(index==='ndvi'?3:4)) throw new Error('unexpected-band-count');
    report.geometry_results[index]={};
    for(const variant of ['original','buffered']){
      let source=0;const values=[];
      grid.masks[variant].forEach((inside,i)=>{if(!inside)return; if(bands[2][i]>.5)source++; if(bands[1][i]>.5){if(!Number.isFinite(bands[0][i])||!(bands[2][i]>.5))throw new Error('invalid-valid-pixel');values.push(bands[0][i]);}});
      report.geometry_results[index][variant]={source_pixels:source,valid_pixels:values.length,mean:values.length?values.reduce((a,b)=>a+b,0)/values.length:null,passes:values.length>=spec.quality[`${index}_floor`]};
    }
    save(`${index}-grid.json`,{origin,resolution,keys,width:image.getWidth(),height:image.getHeight()});
  }
  report.source=checkPairedSources(sources,from,to);
  report.status='pilot-validated';
} catch(error) {
  report.status='stopped'; report.error=error.name==='AssertionError'?'grid-verification-failed':String(error.message).slice(0,180);
  process.exitCode=1;
} finally {
  report.finished=new Date().toISOString();save('report.json',report);
  console.log(JSON.stringify({status:report.status,error:report.error,used:report.used,pilot_day:report.pilot_day,output:destination}));
}
