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

export const UNKNOWN_LANGUAGE_COLOR="#87929c";

// GitHub GraphQL's primaryLanguage.color is our source of truth. Never require
// a hard-coded language whitelist: rare/new languages must still be counted.
export function normalizeLanguageColor(value: string | null | undefined): string | null {
  if(!value) return null;
  if(/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
  if(/^#[0-9a-f]{3}$/i.test(value)) {
    return "#"+[...value.slice(1).toLowerCase()].map(x=>x+x).join("");
  }
  return null;
}

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
    const validColor=normalizeLanguageColor(lang.color);
    if(old) {
      old.count+=count;
      if(old.color===UNKNOWN_LANGUAGE_COLOR && validColor) old.color=validColor;
    } else {
      result.set(key,{name:lang.name,color:validColor??UNKNOWN_LANGUAGE_COLOR,count});
    }
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

export function percentLabel(ratio: number): string {
  const percent=ratio*100;
  if(ratio>0 && percent<0.05) return "<0.1%";
  if(ratio<1 && percent>99.95) return ">99.9%";
  return percent.toFixed(1)+"%";
}
export function cardSubtitle(all: LanguageStat[], opts: Options): string {
  if (all.length <= opts.topN) return all.length + (all.length === 1 ? " language" : " languages");
  return "Top " + opts.topN + " of " + all.length + " languages" + (opts.showOthers ? " + Others" : "");
}
function xml(s:string):string {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
}
export function shorten(s:string,maxWidth:number):string {
  const chars=Array.from(s);
  const glyphWidth=(char:string):number=>{
    const code=char.codePointAt(0)??0;
    if(code>=0x2e80) return 14;
    if(/[MW@]/.test(char)) return 12;
    if(/[ilI1.,:;' ]/.test(char)) return 5;
    return 8;
  };
  const total=chars.reduce((sum,char)=>sum+glyphWidth(char),0);
  if(total<=maxWidth) return s;
  let width=0;
  const result:string[]=[];
  for(const char of chars) {
    const advance=glyphWidth(char);
    if(width+advance+14>maxWidth) break;
    result.push(char);
    width+=advance;
  }
  return result.join("")+"…";
}
export function renderSvg(title:string, all:LanguageStat[], opts:Options, chart:GraphStyle, theme:CardTheme):string {
  const items=topN(all,opts);
  const isCommit=title.toLowerCase().includes("commit");
  const metric=isCommit ? "commits" : "repos";
  const palette=theme==="dark"
    ? {bg:"#21262d",fg:"#e6edf3",faint:"#a6b3c1",border:"#3d444d",rail:"#30363d",heading:"#58c7f5"}
    : {bg:"#ffffff",fg:"#1f2328",faint:"#57606a",border:"#d0d7de",rail:"#f0f2f5",heading:"#0969da"};
  const h=Math.max(310,112+items.length*31);
  const w=780;
  const total=all.reduce((sum,entry)=>sum+entry.count,0);
  const fmt=(n:number)=>n.toLocaleString("en-US");
  const centerSize=fmt(total).length>11?16:fmt(total).length>8?19:22;
  const languageMaxWidth=chart==="donut"?289:198;
  const p:string[]=[
    '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+xml(title)+'">',
    '<title>'+xml(title)+'</title>',
    '<rect x="0.5" y="0.5" width="'+(w-1)+'" height="'+(h-1)+'" rx="12" fill="'+palette.bg+'" stroke="'+palette.border+'"/>',
    '<text x="24" y="40" font-size="23" font-family="system-ui, sans-serif" font-weight="650" fill="'+palette.heading+'">'+xml(title)+'</text>',
    '<text x="24" y="64" font-size="13" font-family="system-ui, sans-serif" fill="'+palette.faint+'">'+cardSubtitle(all,opts)+'</text>'
  ];
  if(!items.length) {
    p.push('<text x="24" y="140" font-size="16" font-family="system-ui, sans-serif" fill="'+palette.fg+'">No public language data available</text>');
    p.push('</svg>');
    return p.join("\n")+"\n";
  }
  // Explicit table headings distinguish absolute counts from the share of all
  // languages. The rows remain aligned even with large counts or long names.
  const tableColumns=chart==="donut"
    ? {count:374,percent:466}
    : {count:675,percent:755};
  p.push('<text x="24" y="90" font-size="11" font-family="system-ui, sans-serif" font-weight="600" fill="'+palette.faint+'">LANGUAGE</text>');
  p.push('<text x="'+tableColumns.count+'" y="90" text-anchor="end" font-size="11" font-family="system-ui, sans-serif" font-weight="600" fill="'+palette.faint+'">'+(isCommit?"COMMITS":"REPOS")+'</text>');
  p.push('<text x="'+tableColumns.percent+'" y="90" text-anchor="end" font-size="11" font-family="system-ui, sans-serif" font-weight="600" fill="'+palette.faint+'">SHARE</text>');
  // Keep long language names away from the numeric columns and bars, even
  // when an unusually wide glyph exceeds the estimated label width.
  p.push('<defs><clipPath id="language-label-region"><rect x="24" y="102" width="'+(chart==="donut"?326:201)+'" height="'+(h-112)+'"/></clipPath></defs>');
  if(chart==="donut") {
    const cx=621,cy=Math.round(h/2)+3,r=94,circumference=2*Math.PI*r;
    p.push('<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+palette.rail+'" stroke-width="40"/>');
    let start=0;
    for(const item of items) {
      const length=item.ratio*circumference;
      p.push('<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+(normalizeLanguageColor(item.color)??UNKNOWN_LANGUAGE_COLOR)+'" stroke-width="40" stroke-dasharray="'+length.toFixed(3)+' '+(circumference-length).toFixed(3)+'" stroke-dashoffset="'+(-start).toFixed(3)+'" transform="rotate(-90 '+cx+' '+cy+')"/>');
      start+=length;
    }
    p.push('<text x="'+cx+'" y="'+(cy+1)+'" text-anchor="middle" font-size="'+centerSize+'" font-family="system-ui, sans-serif" font-weight="650" fill="'+palette.fg+'">'+fmt(total)+'</text>');
    p.push('<text x="'+cx+'" y="'+(cy+23)+'" text-anchor="middle" font-size="12" font-family="system-ui, sans-serif" fill="'+palette.faint+'">'+metric+'</text>');
    items.forEach((item,i)=>{
      const y=120+i*31;
      p.push('<rect x="24" y="'+(y-13)+'" width="12" height="12" rx="2" fill="'+(normalizeLanguageColor(item.color)??UNKNOWN_LANGUAGE_COLOR)+'"/>');
      p.push('<text x="45" y="'+y+'" clip-path="url(#language-label-region)" font-size="14" font-family="system-ui, sans-serif" fill="'+palette.fg+'"><title>'+xml(item.name)+'</title>'+xml(shorten(item.name,languageMaxWidth))+'</text>');
      p.push('<text x="'+tableColumns.count+'" y="'+y+'" text-anchor="end" font-size="14" font-family="system-ui, sans-serif" fill="'+palette.fg+'">'+fmt(item.count)+'</text>');
      p.push('<text x="'+tableColumns.percent+'" y="'+y+'" text-anchor="end" font-size="14" font-family="system-ui, sans-serif" fill="'+palette.faint+'">'+percentLabel(item.ratio)+'</text>');
    });
  } else {
    const max=Math.max(...items.map(entry=>entry.count),1);
    items.forEach((item,i)=>{
      const y=120+i*31;
      const width=Math.max(2,335*item.count/max);
      p.push('<text x="24" y="'+y+'" clip-path="url(#language-label-region)" font-size="14" font-family="system-ui, sans-serif" fill="'+palette.fg+'"><title>'+xml(item.name)+'</title>'+xml(shorten(item.name,languageMaxWidth))+'</text>');
      p.push('<rect x="245" y="'+(y-13)+'" width="335" height="17" rx="3" fill="'+palette.rail+'"/>');
      p.push('<rect x="245" y="'+(y-13)+'" width="'+width.toFixed(2)+'" height="17" rx="3" fill="'+(normalizeLanguageColor(item.color)??UNKNOWN_LANGUAGE_COLOR)+'"/>');
      p.push('<text x="'+tableColumns.count+'" y="'+y+'" text-anchor="end" font-size="14" font-family="system-ui, sans-serif" fill="'+palette.fg+'">'+fmt(item.count)+'</text>');
      p.push('<text x="'+tableColumns.percent+'" y="'+y+'" text-anchor="end" font-size="14" font-family="system-ui, sans-serif" fill="'+palette.faint+'">'+percentLabel(item.ratio)+'</text>');
    });
  }
  p.push("</svg>");
  return p.join("\n")+"\n";
}
