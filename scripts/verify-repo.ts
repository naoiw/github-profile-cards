/**
 * Independent live cross-check of GitHub's repository-language statistics.
 * REST /users/:login/repos is the comparison source for GraphQL user.repositories.
 *
 * Commit contributions cannot be independently equated to REST commits:
 * GitHub contribution rules, privacy and attribution differ. Those cases are
 * covered by deterministic GraphQL fixture tests instead.
 */
import {GitHubClient} from "../src/github.ts";
import {byRepo} from "../src/core.ts";
import type {Options,RepoEntry} from "../src/core.ts";

const options:Options={topN:30,showOthers:true,includeArchived:true,excludeRepos:[],excludeLanguages:[]};

async function restPublicRepos(login:string,token:string):Promise<Map<string,string|null>> {
  const result=new Map<string,string|null>();
  for(let page=1;page<=100;page++) {
    const uri="https://api.github.com/users/"+encodeURIComponent(login)+"/repos?type=owner&per_page=100&page="+page;
    const response=await fetch(uri,{
      headers:{Authorization:"Bearer "+token,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","User-Agent":"github-profile-cards-verify"},
      signal:AbortSignal.timeout(30_000)
    });
    if(!response.ok) throw new Error("GitHub REST returned "+response.status+" on page "+page);
    const rows=await response.json() as Array<{full_name:string;language:string|null;fork:boolean;private:boolean}>;
    if(!Array.isArray(rows)) throw new Error("Unexpected GitHub REST repository response");
    for(const repo of rows) if(!repo.fork&&!repo.private) result.set(repo.full_name.toLowerCase(),repo.language);
    if(rows.length<100) return result;
  }
  throw new Error("REST pagination exceeded safety limit");
}

async function main():Promise<void> {
  const arg=process.argv.indexOf("--username");
  const login=arg>=0?process.argv[arg+1]:process.env.GITHUB_REPOSITORY_OWNER;
  const token=process.env.GITHUB_TOKEN;
  if(!login||!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(login)) throw new Error("Provide --username LOGIN");
  if(!token) throw new Error("GITHUB_TOKEN is required for live verification");
  const [rest,graphql]=await Promise.all([
    restPublicRepos(login,token),new GitHubClient(token).repositories(login)
  ]);
  const gqlRepos=new Map<string,string|null>();
  for(const repo of graphql) {
    if(!repo.isPrivate) gqlRepos.set(repo.nameWithOwner.toLowerCase(),repo.primaryLanguage?.name??null);
  }
  const missing=[...rest.keys()].filter(name=>!gqlRepos.has(name));
  const unexpected=[...gqlRepos.keys()].filter(name=>!rest.has(name));
  const different=[...rest].filter(([name,language])=>gqlRepos.has(name)&&gqlRepos.get(name)!==language);
  if(missing.length||unexpected.length||different.length) {
    throw new Error("GraphQL/REST repo mismatch: missing="+JSON.stringify(missing.slice(0,8))+
      " unexpected="+JSON.stringify(unexpected.slice(0,8))+
      " language differences="+JSON.stringify(different.slice(0,8)));
  }

  const expected=new Map<string,number>();
  for(const language of rest.values()) if(language) expected.set(language,(expected.get(language)??0)+1);
  const actual=byRepo(graphql,options);
  for(const stat of actual) {
    if(stat.count!==expected.get(stat.name)) throw new Error("Incorrect count for "+stat.name+
      ": GraphQL="+stat.count+" REST="+expected.get(stat.name));
    expected.delete(stat.name);
  }
  if(expected.size) throw new Error("Languages missing from GraphQL summary: "+[...expected.keys()].join(", "));
  console.log("Verified "+rest.size+" public non-fork repositories and "+actual.length+
    " primary languages against independent GitHub REST API data for "+login+".");
  console.log("By Commit uses GraphQL contribution rules and is validated with yearly/cap test fixtures.");
}
main().catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1;});
