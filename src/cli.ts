import {mkdir,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {GitHubClient} from "./github.ts";
import {byRepo,byCommit,renderSvg} from "./core.ts";
import type {RepoEntry,CommitEntry,Options,GraphStyle,CardTheme} from "./core.ts";

function option(name:string,fallback:string):string {
  const index=process.argv.indexOf("--"+name);
  if(index<0) return fallback;
  const value=process.argv[index+1];
  if(!value || value.startsWith("--")) throw new Error("Missing value for --"+name);
  return value;
}
function flag(name:string):boolean { return process.argv.includes("--"+name); }
function list(name:string):string[] {
  return option(name,"").split(",").map(x=>x.trim()).filter(Boolean);
}
async function main():Promise<void> {
  const username=option("username",process.env.GITHUB_REPOSITORY_OWNER??"");
  if(!/^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/i.test(username)) throw new Error("Invalid GitHub username");
  const topN=Number(option("top-n","12"));
  if(!Number.isInteger(topN)||topN<1||topN>30) throw new Error("top-n must be 1 through 30");
  const chart=option("chart","donut") as GraphStyle;
  const theme=option("theme","all");
  if(chart!=="donut"&&chart!=="bars") throw new Error("Invalid chart; choose donut or bars");
  if(theme!=="all"&&theme!=="dark"&&theme!=="light") throw new Error("Invalid theme; choose all, dark or light");
  const out=option("output-dir","profile-card-output");
  if(!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(out)) throw new Error("output-dir must be a relative directory without traversal");
  const settings:Options={topN,showOthers:!flag("hide-others"),includeArchived:!flag("exclude-archived"),excludeRepos:list("exclude-repos"),excludeLanguages:list("exclude-languages")};
  let repos:RepoEntry[],commits:CommitEntry[];
  if(flag("demo")) {
    const names=["TypeScript","C","Rust","JavaScript","CoffeeScript","Python","HTML","Go","Shell","Ruby","Nim","C++","Kotlin","CSS","Swift"];
    repos=names.flatMap((name,i)=>Array.from({length:i===0?12:i===1?6:1},(_,n)=>({
      nameWithOwner:"demo/"+name.toLowerCase()+"-"+n,
      primaryLanguage:{name,color:null},isArchived:false,isPrivate:false
    })));
    commits=repos.map((repo,i)=>({...repo,contributions:Math.max(1,Math.floor(120/(i+1)))}));
  } else {
    const client=new GitHubClient(process.env.GITHUB_TOKEN??"");
    repos=await client.repositories(username);
    commits=await client.commitContributions(username);
  }
  const cards=[
    {filename:"languages-by-repo.svg",title:"Top Languages by Repo",stats:byRepo(repos,settings)},
    {filename:"languages-by-commit.svg",title:"Top Languages by Commit",stats:byCommit(commits,settings)}
  ];
  const themes:CardTheme[]=theme==="all" ? ["dark","light"] : [theme];
  for(const selectedTheme of themes) {
    const directory=resolve(out,selectedTheme);
    await mkdir(directory,{recursive:true});
    for(const {filename,title,stats} of cards) {
      await writeFile(resolve(directory,filename),renderSvg(title,stats,settings,chart,selectedTheme),"utf8");
      console.log(selectedTheme+"/"+filename+": "+stats.length+" languages");
    }
  }
  if(flag("demo")) console.log("Demo uses synthetic sample data, not real user data.");
}
main().catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1;});
