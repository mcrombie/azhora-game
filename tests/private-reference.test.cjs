const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {isPublicFile}=require('../scripts/public-file.cjs');
const root=path.resolve(__dirname,'..');
test('private paths are refused, including encoded URL and case variants; normal game assets remain readable',async()=>{
  assert.equal(isPublicFile(root,path.join(root,'src/boot.js')),true);
  const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+pathname);res.writeHead(isPublicFile(root,file)?200:403);res.end();});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try{for(const url of ['/reference-private/2026-10-06-extraction.txt','/%72eference-private/2026-10-06-extraction.txt','/REFERENCE-PRIVATE/a.pdf','/src/..%5creference-private/a.pdf','/.git/config']){
    assert.equal((await fetch('http://127.0.0.1:'+server.address().port+url)).status,403,url);
  }}finally{await new Promise(r=>server.close(r));}
});
test('all root-serving hosts apply the privacy gate and distributions use positive file lists',()=>{
  for(const f of ['main.cjs','scripts/profile-startup.cjs','scripts/campaign-ui.cjs'])assert.match(fs.readFileSync(path.join(root,f),'utf8'),/isPublicFile\(/);
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));assert.ok(pkg.files.includes('!reference-private/**'));assert.ok(!pkg.files.includes('*'));
  const build=fs.readFileSync(path.join(root,'scripts/build-web.mjs'),'utf8');assert.match(build,/PUBLISHED = \['index.html', 'src', 'vendor', 'assets'\]/);assert.match(build,/reference-private/);
});
