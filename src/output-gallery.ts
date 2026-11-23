import {readFile,stat,writeFile} from "node:fs/promises";
import {resolve} from "node:path";

export type GalleryEntry = Readonly<{
  theme: string;
  title: string;
  chart: string;
  relativePath: string;
}>;

// Only files written in this run are listed, not stale SVGs on disk.
function segments(path:string):string[] {
  const parts=path.split("/");
  if(path.startsWith("/")||path.includes("\\")||parts.some(part=>!part||part==="."||part==="..")) {
    throw new Error("Invalid gallery SVG path: "+path);
  }
  return parts;
}
function label(s:string):string {
  return s.slice(0,1).toUpperCase()+s.slice(1);
}
function pathLink(path:string):string {
  return "./"+segments(path).map(encodeURIComponent).join("/");
}
export function renderOutputGallery(entries:readonly GalleryEntry[]):string {
  if(!entries.length) throw new Error("Cannot create a gallery without generated SVGs");
  const byTheme=new Map<string,GalleryEntry[]>();
  const seen=new Set<string>();
  for(const entry of entries) {
    segments(entry.relativePath);
    if(seen.has(entry.relativePath)) throw new Error("Duplicate gallery SVG path: "+entry.relativePath);
    seen.add(entry.relativePath);
    if(!entry.theme||!entry.title||!entry.chart) throw new Error("Incomplete gallery entry");
    const group=byTheme.get(entry.theme)??[];
    group.push(entry);
    byTheme.set(entry.theme,group);
  }
  const lines=[
    "# Generated profile cards",
    "",
    "Browse the cards from the latest generation and choose a style. Copy a relative SVG path to use it in your profile README.",
    "",
    "Only cards generated during the latest run are listed. Older SVG files may still remain in this directory.",
    ""
  ];
  for(const [theme,cards] of byTheme) {
    lines.push("## "+label(theme),"");
    for(const entry of cards) {
      const themeName=label(theme);
      const chartName=label(entry.chart);
      const link=pathLink(entry.relativePath);
      lines.push(
        "### "+entry.title+" · "+chartName,
        "",
        "!["+entry.title+" — "+themeName+" ("+chartName+")]("+link+")",
        "",
        "[Open SVG]("+link+") · `"+link+"`",
        ""
      );
    }
  }
  return lines.join("\n")+"\n";
}
export async function writeOutputGallery(outputDir:string,entries:readonly GalleryEntry[]):Promise<void> {
  const content=renderOutputGallery(entries);
  for(const entry of entries) {
    const path=resolve(outputDir,...segments(entry.relativePath));
    let isFile:boolean;
    try {
      isFile=(await stat(path)).isFile();
    } catch(error) {
      if((error as NodeJS.ErrnoException).code==="ENOENT") {
        throw new Error("Missing generated SVG: "+entry.relativePath);
      }
      throw error;
    }
    if(!isFile) throw new Error("Expected an SVG file: "+entry.relativePath);
  }
  const readme=resolve(outputDir,"README.md");
  let previous:string|undefined;
  try {
    previous=await readFile(readme,"utf8");
  } catch(error) {
    if((error as NodeJS.ErrnoException).code!=="ENOENT") throw error;
  }
  if(previous!==content) await writeFile(readme,content,"utf8");
}
