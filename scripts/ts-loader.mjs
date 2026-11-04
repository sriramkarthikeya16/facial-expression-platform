import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import esbuild from '../frontend/node_modules/esbuild/lib/main.js';

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND' && (specifier.startsWith('.') || specifier.startsWith('/'))) {
      const parent = context.parentURL ? fileURLToPath(context.parentURL) : process.cwd();
      const parentDir = path.dirname(parent);
      const targetPath = specifier.startsWith('/') ? specifier : path.resolve(parentDir, specifier);

      const candidates = [
        targetPath + '.ts',
        targetPath + '.tsx',
        path.join(targetPath, 'index.ts'),
        path.join(targetPath, 'index.tsx'),
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          return {
            url: pathToFileURL(cand).href,
            shortCircuit: true,
          };
        }
      }
    }
    throw err;
  }
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.ts') || url.endsWith('.tsx')) {
    const filePath = fileURLToPath(url);
    const source = fs.readFileSync(filePath, 'utf8');
    const { code } = esbuild.transformSync(source, {
      loader: url.endsWith('.tsx') ? 'tsx' : 'ts',
      format: 'esm',
      target: 'es2022',
      sourcemap: 'inline',
    });
    return {
      format: 'module',
      source: code,
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}
