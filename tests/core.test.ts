import assert from "node:assert/strict";
import test from "node:test";
import {byRepo,byCommit,topN,renderSvg,cardSubtitle,percentLabel,normalizeLanguageColor,UNKNOWN_LANGUAGE_COLOR,shorten} from "../src/core.ts";
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

test("both charts render aligned numeric headings and readable large values",()=>{
  const counts=[{...repo("o/a","TypeScript"),contributions:1234567},{...repo("o/b","Rust"),contributions:35}];
  const all=byCommit(counts,{...opts,topN:12});
  for (const style of ["donut","bars"] as const) {
    for (const theme of ["dark","light"] as const) {
      const svg=renderSvg("Top Languages by Commit",all,{...opts,topN:12},style,theme);
      assert.match(svg,/>COMMITS<\/text>/);
      assert.match(svg,/>SHARE<\/text>/);
      assert.match(svg,/1,234,567/);
      assert.match(svg,/99\.9%/);
      assert.doesNotMatch(svg,/entries/);
    }
  }
});
test("30 language layout keeps all rows within SVG height",()=>{
  const rows=Array.from({length:30},(_,i)=>repo("o/r"+i,"Language"+i));
  const all=byRepo(rows,{...opts,topN:30});
  const svg=renderSvg("Top Languages by Repo",all,{...opts,topN:30},"bars","light");
  const height=Number(svg.match(/height="(\d+)"/)?.[1]);
  assert.ok(height>=1000);
  assert.match(svg,/Language29/);
  assert.match(svg,/0\.?0?%|3\.3%/);
});

test("sub-0.1% long-tail values are not misleadingly shown as zero",()=>{
  assert.equal(percentLabel(35/1234602),"<0.1%");
  assert.equal(percentLabel(1234567/1234602),">99.9%");
  assert.equal(percentLabel(0),"0.0%");
  assert.equal(percentLabel(0.135),"13.5%");
});

test("GitHub colors and rare languages are handled without a whitelist",()=>{
  assert.equal(normalizeLanguageColor("#A1B2C3"),"#a1b2c3");
  assert.equal(normalizeLanguageColor("#abc"),"#aabbcc");
  assert.equal(normalizeLanguageColor(null),null);
  assert.equal(normalizeLanguageColor("url(javascript:alert(1))"),null);
  const entries=[
    repo("o/a","Haxe",{primaryLanguage:{name:"Haxe",color:null}}),
    repo("o/b","Haxe",{primaryLanguage:{name:"Haxe",color:"#AABBCC"}}),
    repo("o/c","Brainfuck",{primaryLanguage:{name:"Brainfuck",color:"bad-color"}}),
    repo("o/d","C++",{primaryLanguage:{name:"C++",color:"#f34b7d"}})
  ];
  const all=byRepo(entries,{...opts,topN:12});
  assert.equal(all.find(s=>s.name==="Haxe")?.color,"#aabbcc");
  assert.equal(all.find(s=>s.name==="Brainfuck")?.color,UNKNOWN_LANGUAGE_COLOR);
  assert.equal(all.find(s=>s.name==="C++")?.color,"#f34b7d");
  assert.equal(all.reduce((sum,s)=>sum+s.count,0),4);
});
test("SVG rendering rejects unsafe colors from direct renderer input",()=>{
  const data=[{name:"<untrusted>",color:"url(javascript:alert(1))",count:1,ratio:1}];
  for(const chart of ["donut","bars"] as const) {
    const svg=renderSvg("Top Languages by Repo",data,{...opts,topN:12},chart,"light");
    assert.doesNotMatch(svg,/javascript:/);
    assert.match(svg,/&lt;untrusted&gt;/);
    assert.match(svg,/#87929c/);
  }
});

test("long language names have bounded labels and retain original SVG titles",()=>{
  const label="A very long language name with 漢字 and extra characters";
  assert.equal(shorten("Rust",198),"Rust");
  assert.ok(shorten(label,198).endsWith("…"));
  const stats=[{name:label,color:"#aabbcc",count:35,ratio:1}];
  for(const chart of ["donut","bars"] as const) {
    for(const theme of ["dark","light"] as const) {
      const svg=renderSvg("Top Languages by Repo",stats,{...opts,topN:12},chart,theme);
      assert.match(svg,/clipPath id="language-label-region"/);
      assert.match(svg,/clip-path="url\(#language-label-region\)"/);
      assert.match(svg,/A very long language name with 漢字 and extra characters<\/title>/);
      assert.match(svg,/…/);
    }
  }
});
test("large donut totals use smaller center text to remain legible",()=>{
  const one=[{name:"TypeScript",color:"#3178c6",count:1234567890123,ratio:1}];
  const svg=renderSvg("Top Languages by Commit",one,{...opts,topN:12},"donut","dark");
  assert.match(svg,/font-size="16"[^>]*>1,234,567,890,123<\/text>/);
});
