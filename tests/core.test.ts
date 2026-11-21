import assert from "node:assert/strict";
import test from "node:test";
import {byRepo,byCommit,topN,renderSvg,cardSubtitle} from "../src/core.ts";
import type {Options,RepoEntry} from "../src/core.ts";

const opts:Options={topN:2,showOthers:true,includeArchived:false,excludeRepos:["owner/ignored"],excludeLanguages:[]};
function repo(full:string,name:string,rest:Partial<RepoEntry>={}):RepoEntry {
  return {nameWithOwner:full,primaryLanguage:{name,color:null},isArchived:false,isPrivate:false,...rest};
}
test("count one primary language per nonfork repository",()=>{
  const stats=byRepo([repo("owner/a","C"),repo("owner/b","C"),repo("owner/c","TypeScript"),repo("owner/ignored","Rust"),repo("owner/z","Go",{isArchived:true}),repo("owner/secret","Python",{isPrivate:true})],opts);
  assert.deepEqual(stats.map(x=>[x.name,x.count]),[["C",2],["TypeScript",1]]);
});
test("attribute commit contributions to repository primary language",()=>{
  const stats=byCommit([{...repo("owner/a","TypeScript"),contributions:20},{...repo("owner/b","C"),contributions:3},{...repo("owner/c","TypeScript"),contributions:7}],opts);
  assert.deepEqual(stats.map(x=>[x.name,x.count]),[["TypeScript",27],["C",3]]);
});
test("Top N includes long-tail Others with full-denominator percentages",()=>{
  const all=byRepo([repo("o/a","A"),repo("o/b","A"),repo("o/c","B"),repo("o/d","C"),repo("o/e","D")],opts);
  const shown=topN(all,opts);
  assert.deepEqual(shown.map(x=>[x.name,x.count]),[["A",2],["B",1],["Others",2]]);
  assert.ok(Math.abs(shown.reduce((s,x)=>s+x.ratio,0)-1)<1e-8);
});
test("both SVG renderers escape strings and show language labels",()=>{
  const all=byRepo([repo("o/a","<script>"),repo("o/b","TypeScript")],opts);
  const donut=renderSvg("A&B",all,opts,"donut","dark");
  const bars=renderSvg("A&B",all,opts,"bars","light");
  assert.match(donut,/<circle /);
  assert.match(bars,/<rect x="245"/);
  assert.match(donut,/&lt;script&gt;/);
  assert.doesNotMatch(donut,/<script>/);
  assert.match(donut,/A&amp;B/);
});

test("subtitle distinguishes available languages from the Top N cap",()=>{
  const names=["C","TypeScript","Rust","Python","Nim"];
  const all=byRepo(names.map((name,i)=>repo("o/"+i,name)),opts);
  assert.equal(cardSubtitle(all,{...opts,topN:12}),"5 languages");
  assert.equal(cardSubtitle(all,{...opts,topN:2}),"Top 2 of 5 languages + Others");
  assert.equal(cardSubtitle(all,{...opts,topN:2,showOthers:false}),"Top 2 of 5 languages");
  assert.equal(cardSubtitle([],opts),"0 languages");
  assert.equal(cardSubtitle(all.slice(0,1),opts),"1 language");
});
test("donut center contains a real total with explicit units",()=>{
  const all=byRepo([repo("o/a","C"),repo("o/b","TypeScript")],opts);
  const svg=renderSvg("Top Languages by Repo",all,{...opts,topN:12},"donut","dark");
  assert.match(svg,/>2<\/text>/);
  assert.match(svg,/>repos<\/text>/);
  assert.doesNotMatch(svg,/entries/);
  assert.doesNotMatch(svg,/Top 12/);
  const commitSvg=renderSvg("Top Languages by Commit",all,opts,"donut","dark");
  assert.match(commitSvg,/>commits<\/text>/);
});
