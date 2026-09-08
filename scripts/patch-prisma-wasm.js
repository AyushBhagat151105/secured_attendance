import fs from "node:fs";
import path from "node:path";

const targetFiles = [
  "node_modules/@prisma/client/runtime/query_compiler_fast_bg.postgresql.js",
  "node_modules/@prisma/client/runtime/query_compiler_fast_bg.postgresql.mjs",
];

for (const rel of targetFiles) {
  const fullPath = path.resolve(process.cwd(), rel);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, "utf8");
  const targetMin = "return(p===null||p.byteLength===0)&&(p=new Uint8Array(o.memory.buffer)),p";
  const replacementMin =
    "return(p===null||p.byteLength===0||p.buffer!==o.memory.buffer)&&(p=new Uint8Array(o.memory.buffer)),p";

  if (content.includes(targetMin)) {
    content = content.replaceAll(targetMin, replacementMin);
    fs.writeFileSync(fullPath, content, "utf8");
    console.log(`[Patch] Applied Wasm memory fix to ${rel}`);
  }
}
