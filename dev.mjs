import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';

const tsconfig = {
  compilerOptions: {
    target: 'es2020',
    module: 'commonjs',
    lib: ['WebWorker', 'ES2020', 'dom.iterable'],
    composite: true,

    // declaration: true,
    // declarationMap: true,

    outDir: './build',
    rootDir: './src',

    removeComments: false,

    downlevelIteration: true,

    strict: true,
    noImplicitAny: true,
    strictNullChecks: true,
    strictFunctionTypes: true,
    strictBindCallApply: true,
    strictPropertyInitialization: true,
    noImplicitThis: true,

    moduleResolution: 'node',

    esModuleInterop: true,

    inlineSourceMap: true,
    inlineSources: true,

    experimentalDecorators: true,
    emitDecoratorMetadata: true,

    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    suppressImplicitAnyIndexErrors: true,
  },
  exclude: ['node_modules', './build'],
  references: [],
};
const jsonClone = (x) => {
  return JSON.parse(JSON.stringify(x));
};

const getSuffixedTsConfig = (suffix) => {
  const cfg = jsonClone(tsconfig);
  cfg.compilerOptions.moduleSuffixes = [`.${suffix}`, ''];
  cfg.compilerOptions.outDir = `./build/${suffix}`;
  return cfg;
};
const tsconfigNode = getSuffixedTsConfig('node');
const tsconfigWeb = getSuffixedTsConfig('web');
// const tsconfigTypings = getSuffixedTsConfig('typings');

const writeJsonConfig = (path, cfg) => {
  writeFileSync(path, JSON.stringify(cfg, null, 2));
};

const generateTsConfig = () => {
  const projects = readdirSync('./packages');
  projects.forEach((x) => {
    writeJsonConfig(`./packages/${x}/tsconfig.web.json`, tsconfigWeb);
    writeJsonConfig(`./packages/${x}/tsconfig.node.json`, tsconfigNode);
    // writeJsonConfig(`./packages/${x}/tsconfig.typings.json`, tsconfigTypings);
    const packageJson = JSON.parse(readFileSync(`./packages/${x}/package.json`));
    packageJson.types = `./src/index.ts`;
    writeJsonConfig(`./packages/${x}/package.json`, packageJson);
  });
  const tsconfigRoot = {
    references: projects
      .map((p) => [
        {
          path: `./packages/${p}/tsconfig.web.json`,
        },
        {
          path: `./packages/${p}/tsconfig.node.json`,
        },
      ])
      .flatMap((x) => x),
  };
  writeJsonConfig('./tsconfig.json', tsconfigRoot);
};

import { exec, execFile } from 'node:child_process';
import { build } from 'esbuild';
import fkill from 'fkill';

const startBnrtcServices = async () => {
  const execIt = (cnofigStr) => {
    execFile('./bnrtc.exe', [cnofigStr], { cwd: `${process.cwd()}/bnrtc/` });
  };

  try {
    await fkill(['bnrtc.exe'], { force: true });
  } catch (e) {}
  rmSync('./bnrtc/logs', { recursive: true, force: true });
  mkdirSync('./bnrtc/logs', { recursive: true });
  execIt('--config=./conf/config.json');
  execIt('--config=./conf/config2.json');
  execIt('--config=./conf/config3.json');
  await new Promise((resolve) => {
    setTimeout(resolve, 3000);
  });
};

const taskAllServer = {
  file: './packages/demo-services/build/cjs/allServer.js',
  cp: undefined,
  name: 'allServer',
  respawn: true,
};
const taskAllClient = {
  file: './packages/demo/build/cjs/allClient.js',
  cp: undefined,
  name: 'allClient',
  respawn: true,
};
const taskFieldDemo = {
  file: './packages/demo/build/cjs/fieldDemo.js',
  cp: undefined,
  name: 'fieldDemo',
  respawn: true,
};

const taskVite = {
  name: 'vite',
  started: false,
  async exec() {
    const vite = exec('npx vite', { cwd: './packages/demo' });
    vite.stdout.on('data', (data) => process.stdout.write(data));
    vite.stderr.on('data', (data) => process.stderr.write(data));
  },
};
const taskBnrtc = {
  name: 'bnrtc',
  started: false,
  async exec() {
    await startBnrtcServices();
  },
};
const tasks = [
  // taskBnrtc, // bnrtc task
  // taskAllClient, // client task
  taskFieldDemo, // fieldDemo task
  // taskAllServer, // server task
  // taskVite, // vite task
];

const run = async () => {
  const tsc = exec('yarn dev');
  const processTscOut = async (data) => {
    process.stdout.write(data);
    if (/Found 0 errors/.test(data)) {
      await build({
        entryPoints: tasks.filter((x) => x.file).map((x) => x.file),
        outdir: './build',
        outbase: './packages',
        platform: 'node',
        bundle: true,
        format: 'cjs',
        plugins: [
          {
            name: 'external marker',
            setup(build) {
              build.onResolve({ filter: /.*/ }, (args) => {
                if (!args.path.startsWith('@cccd') && !args.path.startsWith('.')) {
                  return { external: true };
                }
              });
            },
          },
        ],
      });

      for (const task of tasks) {
        if (task.exec) {
          console.log(`starting ${task.name}`);
          if (!task.started) {
            await task.exec();
            task.started = true;
          }
        } else {
          if (task.respawn && task.cp) {
            task.cp.kill();
            task.cp = undefined;
          }
          if (!task.cp) {
            console.log(`starting ${task.name}`);
            const cp = exec(`node ${task.file.replace('./packages', './build')}`);
            cp.stdout.pipe(process.stdout);
            cp.stderr.pipe(process.stderr);
            task.cp = cp;
            cp.on('exit', (_) => {
              // console.log(`task ${task.name} finished`);
              task.cp = undefined;
            });
          }
        }
      }
    }
  };

  tsc.stdout.on('data', (data) => processTscOut(data));
  tsc.stderr.on('data', (data) => processTscOut(data));
};
run();
