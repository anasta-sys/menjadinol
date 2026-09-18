const ALLOWED_TAGS = new Set([
  "b","strong","i","em","u","s","strike","p","div","br","span","blockquote",
  "h2","h3","ul","ol","li","a","hr","table","thead","tbody","tr","th","td",
  "figure","figcaption","img"
]);

const ALLOWED_ALIGN = new Set(["left","center","right","justify"]);
const ALLOWED_QUOTE_COLORS = new Set(["gold","green","dark-green","gray","brown","red","blue"]);
const ALLOWED_TEXT_COLORS = new Set([
  "#111111","#666666","#17613f","#0f4d34","#a67c00","#7a5230","#b42318","#175cd3"
]);
const ALLOWED_FONTS = new Set(["Arial","Georgia","Times New Roman","Verdana","Trebuchet MS"]);

function getAttr(attrs:string,name:string) {
  const re = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>]+))`,"i");
  const m = attrs.match(re);
  return m?.[1] ?? m?.[2] ?? m?.[3] ?? "";
}
function esc(v:string) {
  return v.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function safeUrl(raw:string) {
  const v=raw.trim();
  if(v.startsWith("/")) return v;
  try {
    const u=new URL(v);
    return u.protocol==="https:" || u.protocol==="http:" ? u.toString() : "";
  } catch { return ""; }
}
function safeStyle(attrs:string) {
  const raw=getAttr(attrs,"style");
  const out:string[]=[];
  const align=raw.match(/text-align\s*:\s*(left|center|right|justify)/i)?.[1]?.toLowerCase();
  if(align && ALLOWED_ALIGN.has(align)) out.push(`text-align:${align}`);
  const size=raw.match(/font-size\s*:\s*(\d{1,2})px/i)?.[1];
  if(size && Number(size)>=10 && Number(size)<=48) out.push(`font-size:${Number(size)}px`);
  const color=raw.match(/color\s*:\s*(#[0-9a-f]{6})/i)?.[1]?.toLowerCase();
  if(color && ALLOWED_TEXT_COLORS.has(color)) out.push(`color:${color}`);
  const family=raw.match(/font-family\s*:\s*([^;]+)/i)?.[1]?.trim().replace(/^["']|["']$/g,"");
  if(family && ALLOWED_FONTS.has(family)) out.push(`font-family:${family}`);

  // Penting: execCommand("bold") dapat menghasilkan span font-weight:normal
  // ketika teks normal berada di dalam wrapper <b>/<strong> lama.
  // Preview browser mempertahankan style ini. Server juga harus
  // mempertahankannya agar hasil publish sama dengan preview.
  const weight=raw.match(/font-weight\s*:\s*(normal|400)\b/i)?.[1]?.toLowerCase();
  if(weight) out.push("font-weight:normal");

  return out.length ? ` style="${out.join(";")}"` : "";
}

export function sanitizeRichText(input:string,maxLength=50000) {
  let value=String(input??"").slice(0,maxLength)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi,"")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi,"")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,"")
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi,"")
    .replace(/<embed[\s\S]*?>/gi,"")
    .replace(/<!--[\s\S]*?-->/g,"");

  return value.replace(/<\/?([a-z0-9]+)([^>]*)>/gi,(full,rawTag:string,attrs:string)=>{
    const tag=rawTag.toLowerCase();
    if(!ALLOWED_TAGS.has(tag)) return "";
    if(full.startsWith("</")) return ["br","hr","img"].includes(tag) ? "" : `</${tag}>`;
    if(tag==="br") return "<br>";
    if(tag==="hr") return "<hr>";

    const alignAttr=getAttr(attrs,"align").toLowerCase();
    const style=ALLOWED_ALIGN.has(alignAttr) ? ` style="text-align:${alignAttr}"` : safeStyle(attrs);

    if(tag==="blockquote"){
      const c=getAttr(attrs,"data-quote-color").toLowerCase();
      const qc=ALLOWED_QUOTE_COLORS.has(c) ? ` data-quote-color="${c}"` : "";
      return `<blockquote${style}${qc}>`;
    }
    if(tag==="a"){
      const href=safeUrl(getAttr(attrs,"href"));
      if(!href) return "<span>";
      const blank=getAttr(attrs,"target")==="_blank";
      return `<a href="${esc(href)}"${blank?' target="_blank" rel="noopener noreferrer"':""}>`;
    }
    if(tag==="img"){
      const src=safeUrl(getAttr(attrs,"src"));
      if(!src) return "";
      return `<img src="${esc(src)}" alt="${esc(getAttr(attrs,"alt").slice(0,200))}" loading="lazy">`;
    }
    if(tag==="div" && getAttr(attrs,"class")==="jp-table-wrap") return `<div class="jp-table-wrap"${style}>`;
    if(tag==="figure" && getAttr(attrs,"class")==="jp-rich-media") return `<figure class="jp-rich-media">`;
    if(tag==="p" && getAttr(attrs,"class")==="jp-rich-file") return `<p class="jp-rich-file"${style}>`;
    if(tag==="span") return `<span${safeStyle(attrs)}>`;
    return `<${tag}${style}>`;
  });
}

export function richTextHasContent(value:string) {
  return String(value??"").replace(/<br\s*\/?>/gi," ").replace(/<[^>]+>/g,"").replace(/&nbsp;/gi," ").trim().length>0;
}
