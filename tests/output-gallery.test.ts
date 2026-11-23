import assert from "node:assert/strict";
import test from "node:test";
import {mkdtemp,mkdir,readFile,rm,stat,writeFile} from "node:fs/promises";
import {join} from "node:path";
import {renderOutputGallery,writeOutputGallery} from "../src/output-gallery.ts";

const dark={theme:"dark",title:"Top Languages by Repo",chart:"donut",relativePath:"dark/languages-by-repo.svg"};
const light={theme:"light",title:"Top Languages by Commit",chart:"bars",relativePath:"light/languages-by-commit.svg"};

test("gallery keeps current order, previews and SVG links",()=>{
  const rendered=renderOutputGallery([dark,light]);
  assert.ok(rendered.indexOf("## Dark")<rendered.indexOf("## Light"));
  assert.match(rendered,/!\[Top Languages by Repo — Dark \(Donut\)\]\(\.\/dark\/languages-by-repo.svg\)/);
  assert.match(rendered,/!\[Top Languages by Commit — Light \(Bars\)\]\(\.\/light\/languages-by-commit.svg\)/);
  assert.match(rendered,/\[Open SVG\]\(\.\/light\/languages-by-commit.svg\)/);
  assert.match(rendered,/prefix its path with your configured output directory/);
  assert.match(rendered,/\.\/profile-card-output\/dark\/languages-by-repo.svg/);
  assert.equal(renderOutputGallery([dark,light]),rendered);
});
test("gallery rejects missing metadata and invalid or duplicate paths",()=>{
  assert.throws(()=>renderOutputGallery([]),/without generated SVGs/);
  assert.throws(()=>renderOutputGallery([dark,dark]),/Duplicate gallery SVG path/);
  assert.throws(()=>renderOutputGallery([{...dark,relativePath:"../outside.svg"}]),/Invalid gallery SVG path/);
  assert.throws(()=>renderOutputGallery([{...dark,relativePath:"dark\\other.svg"}]),/Invalid gallery SVG path/);
  assert.throws(()=>renderOutputGallery([{...dark,chart:""}]),/Incomplete gallery entry/);
});
test("writer rejects missing files but ignores stale on-disk SVGs",async()=>{
  const root=await mkdtemp("test-gallery-");
  try {
    await mkdir(join(root,"dark"),{recursive:true});
    await writeFile(join(root,"dark","languages-by-repo.svg"),"<svg/>","utf8");
    await writeFile(join(root,"dark","old.svg"),"<svg/>","utf8");
    await assert.rejects(writeOutputGallery(root,[dark,light]),/Missing generated SVG/);
    await writeOutputGallery(root,[dark]);
    const markdown=await readFile(join(root,"README.md"),"utf8");
    assert.match(markdown,/dark\/languages-by-repo.svg/);
    assert.doesNotMatch(markdown,/old.svg|light\//);
    const before=(await stat(join(root,"README.md"))).mtimeMs;
    await writeOutputGallery(root,[dark]);
    assert.equal((await stat(join(root,"README.md"))).mtimeMs,before);
  } finally {
    await rm(root,{recursive:true,force:true});
  }
});
