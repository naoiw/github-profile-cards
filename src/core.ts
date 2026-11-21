export type Language = { name: string; color: string | null };
export type RepoEntry = {
  nameWithOwner: string;
  primaryLanguage: Language | null;
  isArchived: boolean;
  isPrivate: boolean;
};
export type CommitEntry = RepoEntry & { contributions: number };
export type LanguageStat = { name: string; color: string; count: number; ratio: number };
export type Options = { topN: number; showOthers: boolean; includeArchived: boolean; excludeRepos: string[]; excludeLanguages: string[] };
export type GraphStyle = "donut" | "bars";
export type CardTheme = "dark" | "light";

const fallback: Record<string,string> = {
  TypeScript:"#3178c6", JavaScript:"#f1e05a", C:"#555555", "C++":"#f34b7d",
  Rust:"#dea584", Python:"#3572a5", CoffeeScript:"#244776", HTML:"#e34c26",
  CSS:"#563d7c", Go:"#00add8", Shell:"#89e051", Java:"#b07219"
};

function allowed(repo: RepoEntry, opts: Options): boolean {
  if (repo.isPrivate || !repo.primaryLanguage || (!opts.includeArchived && repo.isArchived)) return false;
  const full = repo.nameWithOwner.toLowerCase();
  const short = full.split("/").at(-1);
  if (opts.excludeRepos.some(name => name.toLowerCase() === full || name.toLowerCase() === short)) return false;
  return !opts.excludeLanguages.some(name => name.toLowerCase() === repo.primaryLanguage!.name.toLowerCase());
}
function tally(rows: { repo: RepoEntry; count: number }[], opts: Options): LanguageStat[] {
  const result = new Map<string,{name:string;color:string;count:number}>();
  for (const {repo,count} of rows) {
    if (!allowed(repo,opts) || count <= 0) continue;
    const lang = repo.primaryLanguage!;
    const key = lang.name.toLowerCase();
    const old = result.get(key);
    if (old) old.count += count;
    else result.set(key,{name:lang.name,color:/^#[0-9a-f]{6}$/i.test(lang.color??"") ? lang.color! : fallback[lang.name]??"#87929c",count});
  }
  const sorted = [...result.values()].sort((a,b)=>b.count-a.count || a.name.localeCompare(b.name));
  const total = sorted.reduce((s,v)=>s+v.count,0);
  return sorted.map(v=>({...v,ratio:total?v.count/total:0}));
}
export function byRepo(rows: RepoEntry[], opts: Options): LanguageStat[] {
  return tally(rows.map(repo=>({repo,count:1})),opts);
}
export function byCommit(rows: CommitEntry[], opts: Options): LanguageStat[] {
  return tally(rows.map(repo=>({repo,count:repo.contributions})),opts);
}
export function topN(all: LanguageStat[], opts: Options): LanguageStat[] {
  const shown=all.slice(0,opts.topN);
  const tail=all.slice(opts.topN);
  const count=tail.reduce((s,x)=>s+x.count,0);
  const ratio=tail.reduce((s,x)=>s+x.ratio,0);
  return opts.showOthers && count ? [...shown,{name:"Others",color:"#778899",count,ratio}] : shown;
}
function xml(s:string):string {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
}
function shorten(s:string):string { return s.length>24 ? s.slice(0,23)+"…" : s; }
export function renderSvg(title:string, all:LanguageStat[], opts:Options, chart:GraphStyle, theme:CardTheme):string {
  const items=topN(all,opts);
  const dark=theme==="dark";
  const bg=dark?"#21262d":"#ffffff", fg=dark?"#e6edf3":"#1f2328";
  const faint=dark?"#a6b3c1":"#57606a", border=dark?"#3d444d":"#d0d7de";
  const rail=dark?"#30363d":"#f0f2f5", heading=dark?"#58c7f5":"#0969da";
  const h=Math.max(300,110+items.length*29), w=780;
  const p:string[]=[
    '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+xml(title)+'">',
    '<title>'+xml(title)+'</title>',
    '<rect x="0.5" y="0.5" width="779" height="'+(h-1)+'" rx="12" fill="'+bg+'" stroke="'+border+'"/>',
    '<text x="24" y="40" font-size="23" font-family="system-ui, sans-serif" font-weight="650" fill="'+heading+'">'+xml(title)+'</text>',
    '<text x="24" y="64" font-size="12" font-family="system-ui, sans-serif" fill="'+faint+'">Top '+opts.topN+' · '+all.length+' languages · '+all.reduce((s,x)=>s+x.count,0).toLocaleString("en-US")+' total</text>'
  ];
  if (!items.length) p.push('<text x="24" y="140" fill="'+fg+'">No public language data available</text>');
  else if(chart==="donut") {
    const x=610,y=Math.round(h/2)+10,r=99,circ=2*Math.PI*r;
    p.push('<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="none" stroke="'+rail+'" stroke-width="43"/>');
    let offset=0;
    for(const item of items) {
      const length=item.ratio*circ;
      p.push('<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="none" stroke="'+item.color+'" stroke-width="43" stroke-dasharray="'+length.toFixed(3)+' '+(circ-length).toFixed(3)+'" stroke-dashoffset="'+(-offset).toFixed(3)+'" transform="rotate(-90 '+x+' '+y+')"/>');
      offset+=length;
    }
    p.push('<text x="'+x+'" y="'+(y+6)+'" text-anchor="middle" font-size="19" font-family="system-ui, sans-serif" fill="'+fg+'">'+items.length+' entries</text>');
    items.forEach((item,i)=>{
      const y=99+i*29;
      p.push('<rect x="24" y="'+(y-12)+'" width="12" height="12" rx="2" fill="'+item.color+'"/>');
      p.push('<text x="46" y="'+y+'" font-size="14" font-family="system-ui, sans-serif" fill="'+fg+'"><title>'+xml(item.name)+'</title>'+xml(shorten(item.name))+'</text>');
      p.push('<text x="440" y="'+y+'" text-anchor="end" font-size="13" font-family="system-ui, sans-serif" fill="'+faint+'">'+item.count.toLocaleString("en-US")+' · '+(item.ratio*100).toFixed(1)+'%</text>');
    });
  } else {
    const max=Math.max(...items.map(x=>x.count),1);
    items.forEach((item,i)=>{
      const y=102+i*29;
      p.push('<text x="24" y="'+y+'" font-size="14" font-family="system-ui, sans-serif" fill="'+fg+'"><title>'+xml(item.name)+'</title>'+xml(shorten(item.name))+'</text>');
      p.push('<rect x="245" y="'+(y-13)+'" width="390" height="16" rx="3" fill="'+rail+'"/>');
      p.push('<rect x="245" y="'+(y-13)+'" width="'+(390*item.count/max).toFixed(1)+'" height="16" rx="3" fill="'+item.color+'"/>');
      p.push('<text x="751" y="'+y+'" text-anchor="end" font-size="13" font-family="system-ui, sans-serif" fill="'+faint+'">'+(item.ratio*100).toFixed(1)+'%</text>');
    });
  }
  p.push("</svg>");
  return p.join("\n")+"\n";
}
