import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const readme=readFileSync(new URL("../README.md",import.meta.url),"utf8");
const target="https://github.com/naoiw/github-profile-cards";

test("all gallery cards link to the generator repository",()=>{
  const gallery=readme.split("## Style gallery")[1]?.split("## Quick start")[0]??"";
  const matches=[...gallery.matchAll(/\[!\[[^\]]+\]\((profile-card-output\/(?:dark|light)\/languages-by-(?:repo|commit)\.svg)\)\]\((https:\/\/github\.com\/naoiw\/github-profile-cards)\)/g)];
  assert.equal(matches.length,4);
  const paths=matches.map(match=>match[1]);
  assert.equal(new Set(paths).size,4);
  for(const theme of ["dark","light"]) {
    for(const kind of ["repo","commit"]) {
      assert.ok(paths.includes("profile-card-output/"+theme+"/languages-by-"+kind+".svg"));
    }
  }
});

test("both theme-aware README examples link to the generator repository",()=>{
  const section=readme.split("## Quick start")[1]?.split("### Generated files")[0]??"";
  const links=[...section.matchAll(/<a href="([^"]+)">([\s\S]*?)<\/a>/g)];
  assert.equal(links.length,2);
  for(const match of links) {
    assert.equal(match[1],target);
    assert.match(match[2],/<picture>/);
    assert.match(match[2],/prefers-color-scheme: dark/);
    assert.match(match[2],/prefers-color-scheme: light/);
    assert.match(match[2],/<img /);
  }
});
