import assert from "node:assert/strict";
import test from "node:test";
import {GitHubClient} from "../src/github.ts";
import {byCommit,byRepo} from "../src/core.ts";
import type {RepoEntry,Options} from "../src/core.ts";

const options:Options={topN:12,showOthers:true,includeArchived:true,excludeRepos:[],excludeLanguages:[]};
function entry(name:string,language:string,overrides:Partial<RepoEntry>={}):RepoEntry {
  return {
    nameWithOwner:name,primaryLanguage:{name:language,color:"#abcdef"},
    isPrivate:false,isArchived:false,...overrides
  };
}
type GraphQLRequest={query:string;variables:Record<string,unknown>};
function mockGraphQL(handler:(request:GraphQLRequest)=>unknown):typeof fetch {
  return (async (_input:RequestInfo|URL,init?:RequestInit):Promise<Response>=>{
    const request=JSON.parse(String(init?.body)) as GraphQLRequest;
    return {ok:true,status:200,json:async()=>({data:handler(request)})} as Response;
  }) as typeof fetch;
}

test("repository pagination aggregates all pages without silently omitting a cursor",async()=>{
  const calls:(string|null)[]=[];
  const sender=mockGraphQL(({query,variables})=>{
    assert.match(query,/repositories\(ownerAffiliations:OWNER,isFork:false/);
    const cursor=(variables.cursor??null) as string|null;
    calls.push(cursor);
    return {user:{repositories:cursor===null
      ? {nodes:[entry("demo/a","Rust"),entry("demo/b","Rust")],pageInfo:{hasNextPage:true,endCursor:"next"}}
      : {nodes:[entry("demo/c","TypeScript"),entry("demo/hidden","C",{isPrivate:true})],pageInfo:{hasNextPage:false,endCursor:null}}
    }};
  });
  const rows=await new GitHubClient("fixture",sender).repositories("demo");
  assert.deepEqual(calls,[null,"next"]);
  assert.deepEqual(byRepo(rows,options).map(s=>[s.name,s.count]),[["Rust",2],["TypeScript",1]]);
});

test("yearly commit windows do not overlap and repository contributions accumulate",async()=>{
  const ranges:{from:string;to:string}[]=[];
  const sender=mockGraphQL(({query,variables})=>{
    if(query.includes("contributionYears")) return {user:{contributionsCollection:{contributionYears:[2026,2025,2025]}}};
    assert.match(query,/commitContributionsByRepository/);
    const from=variables.from as string,to=variables.to as string;
    ranges.push({from,to});
    const older=from.startsWith("2025");
    const rows=older
      ? [{repository:entry("demo/a","Rust"),contributions:{totalCount:12}}]
      : [{repository:entry("demo/a","Rust"),contributions:{totalCount:7}},
         {repository:entry("demo/b","TypeScript"),contributions:{totalCount:3}},
         {repository:entry("demo/private","C",{isPrivate:true}),contributions:{totalCount:100}}];
    return {user:{contributionsCollection:{commitContributionsByRepository:rows}}};
  });
  const stats=byCommit(await new GitHubClient("fixture",sender).commitContributions("demo"),options);
  assert.deepEqual(stats.map(s=>[s.name,s.count]),[["Rust",19],["TypeScript",3]]);
  assert.deepEqual(ranges.map(({from,to})=>[from,to]),[
    ["2025-01-01T00:00:00.000Z","2025-12-31T23:59:59.999Z"],
    ["2026-01-01T00:00:00.000Z","2026-12-31T23:59:59.999Z"]
  ]);
});

test("100-repository contribution cap splits windows without overlap",async()=>{
  const ranges:{from:number;to:number}[]=[];
  const sender=mockGraphQL(({query,variables})=>{
    if(query.includes("contributionYears")) return {user:{contributionsCollection:{contributionYears:[2026]}}};
    const from=Date.parse(variables.from as string),to=Date.parse(variables.to as string);
    ranges.push({from,to});
    const fullYear=(to-from)>300*86400000;
    const rows=fullYear
      ? Array.from({length:100},(_,i)=>({repository:entry("demo/r"+i,"Rust"),contributions:{totalCount:1}}))
      : [{repository:entry(from<Date.UTC(2026,6,1)?"demo/left":"demo/right","Rust"),contributions:{totalCount:from<Date.UTC(2026,6,1)?2:3}}];
    return {user:{contributionsCollection:{commitContributionsByRepository:rows}}};
  });
  const result=await new GitHubClient("fixture",sender).commitContributions("demo");
  assert.equal(result.length,2);
  assert.equal(result.reduce((sum,row)=>sum+row.contributions,0),5);
  assert.equal(ranges.length,3);
  assert.equal(ranges[1].to+1,ranges[2].from);
  assert.equal(ranges[0].from,ranges[1].from);
  assert.equal(ranges[0].to,ranges[2].to);
});

test("GraphQL errors and stalled cursors fail explicitly",async()=>{
  const graphQLError=(async()=>({ok:true,json:async()=>({errors:[{message:"access denied"}]})})) as unknown as typeof fetch;
  await assert.rejects(new GitHubClient("fixture",graphQLError).repositories("demo"),/access denied/);
  const stalled=mockGraphQL(()=>({user:{repositories:{nodes:[],pageInfo:{hasNextPage:true,endCursor:null}}}}));
  await assert.rejects(new GitHubClient("fixture",stalled).repositories("demo"),/Invalid pagination cursor/);
});
