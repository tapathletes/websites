#!/usr/bin/env node
// Thin wrapper kept so `npm run build:jsonld` from this folder still works.
// The generator now lives in the websites repo at shared/jsonld/build.mjs and
// the page data in ../site.config.mjs. From the repo root the equivalent is:
//   node shared/jsonld/build.mjs tapathletes.com

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildJsonLd } from '../../shared/jsonld/build.mjs';

await buildJsonLd(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
