import assert from "node:assert/strict";
import test from "node:test";
import {execFileSync,spawnSync} from "node:child_process";
import {mkdtemp,readFile,rm,stat} from "node:fs/promises";

async function withOutput(testCase:(output:string)=>Promise<void>):Promise<void> {
  const output=await mkdtemp("test-cards-");
  try {await testCase(output);}
  finally {await rm(output,{recursive:true,force:true});}
}
function generate(output:string,args:string[]=[]):void {
  execFileSync(process.execPath,["src/cli.ts","--demo","--username","demo","--output-dir",output,...args],{
    encoding:"utf8",timeout:30_000,stdio:"pipe"
  });
}
async function exists(path:string):Promise<boolean> {
  try {await stat(path);return true;}catch{return false;}
}
test("all is the default and writes both cards to both theme directories",async()=>{
  await withOutput(async output=>{
    generate(output);
    for(const theme of ["dark","light"]) {
      for(const filename of ["languages-by-repo.svg","languages-by-commit.svg"]) {
        const svg=await readFile(output+"/"+theme+"/"+filename,"utf8");
        assert.match(svg,/^<svg /);
        assert.match(svg,/<\/svg>\s*$/);
      }
    }
    assert.equal(await exists(output+"/languages-by-repo.svg"),false);
    const dark=await readFile(output+"/dark/languages-by-repo.svg","utf8");
    const light=await readFile(output+"/light/languages-by-repo.svg","utf8");
    assert.notEqual(dark,light);
  });
});
test("explicit all is supported",async()=>{
  await withOutput(async output=>{
    generate(output,["--theme","all","--chart","bars"]);
    assert.equal(await exists(output+"/dark/languages-by-commit.svg"),true);
    assert.equal(await exists(output+"/light/languages-by-commit.svg"),true);
    const svg=await readFile(output+"/dark/languages-by-repo.svg","utf8");
    assert.match(svg,/<rect x="245"/);
  });
});
test("single theme still uses a theme subdirectory",async()=>{
  for(const theme of ["dark","light"]) {
    await withOutput(async output=>{
      generate(output,["--theme",theme]);
      assert.equal(await exists(output+"/"+theme+"/languages-by-repo.svg"),true);
      assert.equal(await exists(output+"/"+(theme==="dark"?"light":"dark")),false);
    });
  }
});
test("unsupported theme fails without generating output",async()=>{
  await withOutput(async output=>{
    const result=spawnSync(process.execPath,["src/cli.ts","--demo","--username","demo","--theme","unknown","--output-dir",output],{encoding:"utf8"});
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/choose all, dark or light/);
    assert.equal(await exists(output+"/dark"),false);
  });
});

test("generated README previews only the latest run",async()=>{
  await withOutput(async output=>{
    generate(output);
    const all=await readFile(output+"/README.md","utf8");
    assert.match(all,/^# Generated profile cards/m);
    assert.ok(all.indexOf("## Dark")<all.indexOf("## Light"));
    for(const theme of ["dark","light"]) {
      for(const name of ["languages-by-repo.svg","languages-by-commit.svg"]) {
        assert.ok(all.includes("]("+ "./"+theme+"/"+name+")"));
      }
    }
    generate(output,["--theme","light","--chart","bars"]);
    const light=await readFile(output+"/README.md","utf8");
    assert.doesNotMatch(light,/## Dark|\.\/dark\//);
    assert.match(light,/### Top Languages by Repo · Bars/);
    assert.match(light,/!\[Top Languages by Commit — Light \(Bars\)\]/);
    assert.equal(await exists(output+"/dark/languages-by-repo.svg"),true);
  });
});
test("custom nested output-dir uses relative links",async()=>{
  await withOutput(async root=>{
    const out=root+"/subdir/cards";
    generate(out,["--theme","dark"]);
    const markdown=await readFile(out+"/README.md","utf8");
    assert.match(markdown,/\.\/dark\/languages-by-repo.svg/);
    assert.doesNotMatch(markdown,/subdir\/cards|\.\/light\//);
  });
});
test("repeat generation retains README content and modification time",async()=>{
  await withOutput(async out=>{
    generate(out);
    const path=out+"/README.md";
    const content=await readFile(path,"utf8");
    const lastModified=(await stat(path)).mtimeMs;
    generate(out);
    assert.equal(await readFile(path,"utf8"),content);
    assert.equal((await stat(path)).mtimeMs,lastModified);
  });
});
