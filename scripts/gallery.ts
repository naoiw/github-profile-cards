import {mkdir,readFile,writeFile} from "node:fs/promises";
import {join} from "node:path";
import {renderSvg} from "../src/core.ts";
import {renderOutputGallery} from "../src/output-gallery.ts";
import type {GalleryEntry} from "../src/output-gallery.ts";
import type {LanguageStat,Options,CardTheme} from "../src/core.ts";

// Frozen, public-data example from 2026-11-21. This is intentionally not a live
// account fetch; the README remains viewable without API access or tokens.
const repoCounts:[string,string,number][]=[
  ["TypeScript","#3178c6",15],["JavaScript","#f1e05a",3],
  ["CoffeeScript","#244776",1],["CSS","#663399",1],["LiveScript","#499886",1],
  ["Nim","#ffc200",1],["Rust","#dea584",1]
];
const commitCounts:[string,string,number][]=[
  ["TypeScript","#3178c6",597],["JavaScript","#f1e05a",153],
  ["CoffeeScript","#244776",25],["CSS","#663399",15],
  ["Nim","#ffc200",11],["Rust","#dea584",10],["LiveScript","#499886",7]
];
const options:Options={topN:12,showOthers:true,includeArchived:true,excludeRepos:[],excludeLanguages:[]};
function normalize(rows:[string,string,number][]):LanguageStat[] {
  const total=rows.reduce((sum,row)=>sum+row[2],0);
  return rows.map(([name,color,count])=>({name,color,count,ratio:count/total}));
}
async function main():Promise<void> {
  const check=process.argv.includes("--check");
  const generated:GalleryEntry[]=[];
  for(const theme of ["dark","light"] as CardTheme[]) {
    const dir=join("profile-card-output",theme);
    if(!check) await mkdir(dir,{recursive:true});
    for(const [title,file,rows] of [
      ["Top Languages by Repo","languages-by-repo.svg",repoCounts],
      ["Top Languages by Commit","languages-by-commit.svg",commitCounts]
    ] as const) {
      const content=renderSvg(title,normalize(rows),options,"donut",theme);
      const path=join(dir,file);
      if(check) {
        const existing=await readFile(path,"utf8");
        if(existing!==content) throw new Error(path+" is outdated. Run npm run gallery.");
      } else {
        await writeFile(path,content,"utf8");
      }
      generated.push({theme,title,chart:"donut",relativePath:theme+"/"+file});
      console.log((check?"Verified ":"Generated ")+path);
    }
  }
  const readme=join("profile-card-output","README.md");
  const markdown=renderOutputGallery(generated);
  if(check) {
    const existing=await readFile(readme,"utf8");
    if(existing!==markdown) throw new Error(readme+" is outdated. Run npm run gallery.");
  } else {
    await writeFile(readme,markdown,"utf8");
  }
  console.log((check?"Verified ":"Generated ")+readme);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
