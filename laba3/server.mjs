import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const port = 5500;
const root = process.cwd();

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"]
]);

function safePath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split("?")[0] ?? "/");
  const requestedPath = decodedPath === "/" ? "/index.html" : decodedPath;
  const normalizedPath = normalize(requestedPath).replace(/^([/\\])+/, "");
  return join(root, normalizedPath);
}

const server = createServer(async (request, response) => {
  try {
    const filePath = safePath(request.url ?? "/");
    const data = await readFile(filePath);
    const contentType = mimeTypes.get(extname(filePath)) ?? "application/octet-stream";
    response.writeHead(200, { "Content-Type": contentType });
    response.end(data);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("404 Not Found");
  }
});

server.listen(port, () => {
  console.log(`http://localhost:${port}`);
});
