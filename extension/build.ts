import { Glob } from "bun";
import { mkdir } from "node:fs/promises";
import { watch } from "fs";
import path from "node:path"
import { parseArgs } from "util";
import { Env } from "@extension/../../env"

const { values } = parseArgs({
    args: Bun.argv,
    options: {
        watch: { type: "boolean" },
        src: { type: "string" },
        outdir: { type: "string" },
    },
    strict: true,
    allowPositionals: true,
});
const { watch: watching, src, outdir } = values;

if (!src || !outdir) {
    throw new Error("Both --src and --outdir must be specified.");
}

async function transpileTypescript(dir: string, outDir: string) {
    const tsGlob = new Glob(`${dir}/**/*.ts`);
    const tsEntries: string[] = [];
    for await (const file of tsGlob.scan(".")) tsEntries.push(file);

    await Bun.build({
        entrypoints: tsEntries,
        outdir: outDir,
        target: "browser",
        env: "PUBLIC_*",
        define: {
            "process.env.PUBLIC_SERVER_URL": JSON.stringify(Env.PUBLIC_SERVER_URL),
            "process.env.PUBLIC_EXTENSION_TOKEN": JSON.stringify(Env.PUBLIC_EXTENSION_TOKEN),
        },
    });
}

async function copyOverStaticFiles(dir: string, outDir: string) {
    const staticGlob = new Glob(`${dir}/**/*.{json,html,css,png,svg,jpg,jpeg,gif}`);
    for await (const srcPath of staticGlob.scan(".")) {
        const rel = path.relative(dir, srcPath);
        const destPath = path.join(outDir, rel);

        await mkdir(path.dirname(destPath), { recursive: true });
        await Bun.write(destPath, Bun.file(srcPath));
    }
}

async function buildDir(dir: string, outDir: string) {
    try {
        await transpileTypescript(dir, outDir);
    } catch (err) {
        console.error("Error during transpilation:", err);
    }

    try {
        await copyOverStaticFiles(dir, outDir);
    } catch (err) {
        console.error("Error during static file copying:", err);
    }
}

// Initial build
await buildDir(src, outdir);

// Watching
if (watching) {
    const watcher = watch(src, { recursive: true }, async (eventType, filename) => {
        if (!filename) return;

        
        console.log(`Detected ${eventType} on ${filename}. Rebuilding...`);
        await buildDir(src, outdir);
        console.clear();
        console.log("Watching...");
    });

    process.on("SIGINT", () => {
        watcher.close();
        process.exit(0);
    });
}
