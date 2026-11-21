import type {CommitEntry,RepoEntry} from "./core.ts";

type Node = RepoEntry;
type Repos = { user: { repositories: { nodes: Node[]; pageInfo: {hasNextPage:boolean;endCursor:string|null} } } | null };
type Years = { user: { contributionsCollection: {contributionYears:number[]} } | null };
type CommitNode = { repository: RepoEntry; contributions: {totalCount:number} };
type Commits = { user: { contributionsCollection: {commitContributionsByRepository:CommitNode[]} } | null };

const repoQuery="query($login:String!,$cursor:String){user(login:$login){repositories(ownerAffiliations:OWNER,isFork:false,first:100,after:$cursor){nodes{nameWithOwner primaryLanguage{name color} isArchived isPrivate} pageInfo{hasNextPage endCursor}}}}";
const yearsQuery="query($login:String!){user(login:$login){contributionsCollection{contributionYears}}}";
const commitsQuery="query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){contributionsCollection(from:$from,to:$to){commitContributionsByRepository(maxRepositories:100){repository{nameWithOwner primaryLanguage{name color} isArchived isPrivate} contributions{totalCount}}}}}";

export class GitHubClient {
  private token:string;
  private sender:typeof fetch;
  constructor(token:string,sender:typeof fetch=fetch) {
    if(!token) throw new Error("GITHUB_TOKEN is required for live data");
    this.token=token;
    this.sender=sender;
  }
  private async query<T>(query:string,variables:Record<string,unknown>):Promise<T> {
    const res=await this.sender("https://api.github.com/graphql",{
      method:"POST",
      headers:{Authorization:"Bearer "+this.token,"Content-Type":"application/json","User-Agent":"github-profile-cards"},
      body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(30_000)
    });
    if(!res.ok) throw new Error("GitHub GraphQL HTTP "+res.status);
    const body=await res.json() as {data?:T; errors?:{message:string}[]};
    if(body.errors?.length) throw new Error("GitHub GraphQL: "+body.errors.map(x=>x.message).join("; "));
    if(!body.data) throw new Error("GitHub GraphQL returned no data");
    return body.data;
  }
  async repositories(login:string):Promise<RepoEntry[]> {
    const result:RepoEntry[]=[];
    let cursor:string|null=null;
    for(let page=0;page<100;page++) {
      const data:Repos=await this.query(repoQuery,{login,cursor});
      if(!data.user) throw new Error("GitHub user not found: "+login);
      result.push(...data.user.repositories.nodes.filter(Boolean));
      const pageInfo=data.user.repositories.pageInfo;
      if(!pageInfo.hasNextPage) return result;
      if(!pageInfo.endCursor || pageInfo.endCursor===cursor) throw new Error("Invalid pagination cursor");
      cursor=pageInfo.endCursor;
    }
    throw new Error("Repo pagination exceeded safety limit");
  }
  private async commitsWindow(login:string,from:number,to:number,depth=0):Promise<CommitEntry[]> {
    const data:Commits=await this.query(commitsQuery,{login,from:new Date(from).toISOString(),to:new Date(to).toISOString()});
    if(!data.user) throw new Error("GitHub user not found: "+login);
    const rows=data.user.contributionsCollection.commitContributionsByRepository;
    if(rows.length>=100) {
      // Split a year if the GitHub 100-repo limit is hit: never silently drop
      // long-tail contributions.
      if(depth>=10 || to-from<86_400_000) throw new Error("Cannot fully retrieve contributions due to GitHub repository limit");
      const mid=Math.floor((from+to)/2);
      const left=await this.commitsWindow(login,from,mid,depth+1);
      const right=await this.commitsWindow(login,mid+1,to,depth+1);
      return [...left,...right];
    }
    return rows.filter(Boolean).map(row=>({...row.repository,contributions:row.contributions.totalCount}));
  }
  async commitContributions(login:string):Promise<CommitEntry[]> {
    const data:Years=await this.query(yearsQuery,{login});
    if(!data.user) throw new Error("GitHub user not found: "+login);
    const years=[...new Set(data.user.contributionsCollection.contributionYears)].sort();
    const all:CommitEntry[]=[];
    for(const year of years) {
      const start=Date.UTC(year,0,1);
      const end=Date.UTC(year+1,0,1)-1;
      all.push(...await this.commitsWindow(login,start,end));
    }
    return all;
  }
}
