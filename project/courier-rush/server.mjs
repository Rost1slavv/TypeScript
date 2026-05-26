import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const port = 5500;
const root = fileURLToPath(new URL("./", import.meta.url));

const contentTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
  [".svg", "image/svg+xml; charset=utf-8"]
]);

function resolvePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0] ?? "/");
  const safePath = normalize(decoded).replace(/^\.\.(?:[/\\]|$)/, "");
  const candidate = join(root, safePath === "/" ? "index.html" : safePath);
  if (!candidate.startsWith(root)) {
    return join(root, "index.html");
  }
  if (existsSync(candidate)) {
    return candidate;
  }
  return join(root, "index.html");
}

const server = createServer(async (request, response) => {
  try {
    const url = request.url ?? "/";
    const filePath = resolvePath(url);
    const ext = extname(filePath).toLowerCase();
    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes.get(ext) ?? "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(`Server error: ${message}`);
  }
});

server.listen(port, () => {
  console.log(`Courier Rush is running: http://localhost:${port}`);
});
