#!/usr/bin/env node
/**
 * Windows 배포 ZIP용 폴더를 만듭니다.
 * 실행: npm run package:windows
 * 결과: release/Timetable/ (이 폴더를 ZIP으로 배포)
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import https from "node:https";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const RELEASE = path.join(ROOT, "release", "Timetable");
const NODE_VERSION = "22.16.0";
const NODE_ZIP = `node-v${NODE_VERSION}-win-x64.zip`;
const NODE_URL = `https://nodejs.org/dist/v${NODE_VERSION}/${NODE_ZIP}`;
const CACHE_DIR = path.join(ROOT, ".cache");
const NODE_CACHE = path.join(CACHE_DIR, NODE_ZIP);
const NODE_DIR = path.join(RELEASE, "node");

function run(cmd, env = {}) {
  execSync(cmd, {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}

function rmrf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.cpSync(src, dest, { recursive: true, dereference: true });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          file.close();
          fs.unlinkSync(dest);
          download(res.headers.location, dest).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`다운로드 실패: ${res.statusCode} ${url}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", reject);
  });
}

async function installWinBetterSqlite(appDir) {
  // Node 22.x ABI (node-v127). Mac에서 npm --os=win32 로는 Windows 바이너리가 내려오지 않아 GitHub prebuild 사용.
  const BS_VERSION = "11.10.0";
  const NODE_ABI = "127";
  const asset = `better-sqlite3-v${BS_VERSION}-node-v${NODE_ABI}-win32-x64.tar.gz`;
  const url = `https://github.com/WiseLibs/better-sqlite3/releases/download/v${BS_VERSION}/${asset}`;
  const tarPath = path.join(CACHE_DIR, asset);
  const extractDir = path.join(CACHE_DIR, "better-sqlite3-win32-extract");

  if (!fs.existsSync(tarPath)) {
    console.log("\n▶ Windows용 better-sqlite3 다운로드 중...");
    await download(url, tarPath);
  }

  rmrf(extractDir);
  fs.mkdirSync(extractDir, { recursive: true });
  run(`tar -xzf "${tarPath}" -C "${extractDir}"`);

  const winNode = path.join(extractDir, "build", "Release", "better_sqlite3.node");
  if (!fs.existsSync(winNode)) {
    throw new Error(`Windows용 better_sqlite3.node 을 찾을 수 없습니다: ${winNode}`);
  }

  function walkReplace(dir) {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (name === "better_sqlite3.node") {
        fs.copyFileSync(winNode, full);
        continue;
      }
      const st = fs.statSync(full);
      if (st.isDirectory() && !name.startsWith(".")) walkReplace(full);
    }
  }

  walkReplace(path.join(appDir, "node_modules"));
  walkReplace(path.join(appDir, ".next"));

  rmrf(extractDir);
  console.log("   Windows용 SQLite 네이티브 모듈 적용 완료");
}

async function ensureNodeWin() {
  if (!fs.existsSync(NODE_CACHE)) {
    console.log(`\n▶ Node.js ${NODE_VERSION} (Windows) 다운로드 중...`);
    await download(NODE_URL, NODE_CACHE);
  }
  rmrf(NODE_DIR);
  fs.mkdirSync(NODE_DIR, { recursive: true });
  const tmp = path.join(CACHE_DIR, "node-extract");
  rmrf(tmp);
  fs.mkdirSync(tmp, { recursive: true });
  run(`unzip -q -o "${NODE_CACHE}" -d "${tmp}"`);
  const extracted = path.join(tmp, `node-v${NODE_VERSION}-win-x64`);
  fs.copyFileSync(path.join(extracted, "node.exe"), path.join(NODE_DIR, "node.exe"));
  rmrf(tmp);
}

async function createTemplateDb() {
  const templateDir = path.join(RELEASE, "template");
  const templateDb = path.join(templateDir, "timetable.db");
  rmrf(templateDir);
  fs.mkdirSync(templateDir, { recursive: true });
  console.log("\n▶ 빈 데이터베이스 템플릿 생성 중...");
  run(`npx prisma migrate deploy`, {
    DATABASE_URL: `file:${templateDb}`,
  });
}

async function main() {
  console.log("=== Windows 배포 패키지 빌드 ===\n");

  run("npx prisma generate");
  run("npm run build");

  const standalone = path.join(ROOT, ".next", "standalone");
  const staticDir = path.join(ROOT, ".next", "static");
  const publicDir = path.join(ROOT, "public");

  if (!fs.existsSync(standalone)) {
    throw new Error(".next/standalone 이 없습니다. next.config.ts에 output: 'standalone'을 확인하세요.");
  }

  console.log("\n▶ 배포 폴더 구성 중...");
  rmrf(RELEASE);
  const appDir = path.join(RELEASE, "app");
  copyDir(standalone, appDir);
  copyDir(staticDir, path.join(appDir, ".next", "static"));
  if (fs.existsSync(publicDir)) copyDir(publicDir, path.join(appDir, "public"));

  await installWinBetterSqlite(appDir);

  fs.mkdirSync(path.join(RELEASE, "data"), { recursive: true });
  fs.copyFileSync(
    path.join(ROOT, "scripts", "windows", "시작.bat"),
    path.join(RELEASE, "시작.bat")
  );
  fs.copyFileSync(
    path.join(ROOT, "scripts", "windows", "사용안내.txt"),
    path.join(RELEASE, "사용안내.txt")
  );

  await createTemplateDb();
  await ensureNodeWin();

  console.log("\n✅ 완료!");
  console.log(`   폴더: ${RELEASE}`);
  console.log("   이 폴더를 ZIP으로 압축해 배포하세요.");
  console.log("   수신자는 압축 해제 후 '시작.bat'을 더블클릭하면 됩니다.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
