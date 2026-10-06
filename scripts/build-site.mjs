import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const check=process.argv.includes('--check');let failures=0;
for(const name of fs.readdirSync(path.join(root,'site/pages')).filter(n=>n.endsWith('.html'))){
 const es=name.startsWith('es-'),prefix=es?'es-':'',language=es?'es':'en';
 const base=name.replace(/^es-/,'');
 const section=base==='index.html'?null:base==='using-911.html'?'using-911.html':base==='meetings.html'?'meetings.html':base==='training.html'?'training.html':'resources.html';
 let header=fs.readFileSync(path.join(root,'site/shared',language+'-header.html'),'utf8');
 header=header.replace(/<a href="([^"]+)"[^>]*>/g,(tag,href)=>{
  if(!['using-911.html','meetings.html','training.html','resources.html'].map(n=>prefix+n).includes(href))return tag;
  return '<a href="'+href+'"'+(href===prefix+section?' aria-current="'+(base===section?'page':'location')+'"':'')+'>';
 });
 const footer=fs.readFileSync(path.join(root,'site/shared',language+'-footer.html'),'utf8');
 const output=fs.readFileSync(path.join(root,'site/pages',name),'utf8').replace('{{HEADER}}',header).replace('{{FOOTER}}',footer);
 const target=path.join(root,'public',name);
 if(check){if(!fs.existsSync(target)||fs.readFileSync(target,'utf8').replace(/\r\n/g,'\n')!==output.replace(/\r\n/g,'\n')){console.error('Generated page out of date: '+name);failures++;}}
 else fs.writeFileSync(target,output);
}
if(failures)process.exit(1);
console.log(check?'Shared layouts are synchronized.':'Static pages generated.');
