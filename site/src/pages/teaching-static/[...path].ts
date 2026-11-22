import fs from 'node:fs';
import type { APIRoute } from 'astro';
import { buildTeachingCatalog, teachingStaticFiles } from '../../lib/teaching.mjs';

export function getStaticPaths() {
  const catalog = buildTeachingCatalog();
  return teachingStaticFiles(catalog).map((file) => ({
    params: { path: file.rel },
    props: { abs: file.abs },
  }));
}

export const GET: APIRoute = ({ props }) => {
  const abs = String(props.abs || '');
  const type = abs.endsWith('.js')
    ? 'text/javascript; charset=utf-8'
    : abs.endsWith('.svg')
      ? 'image/svg+xml'
      : abs.endsWith('.png')
        ? 'image/png'
        : abs.endsWith('.webp')
          ? 'image/webp'
          : abs.endsWith('.gif')
            ? 'image/gif'
            : 'image/jpeg';
  return new Response(fs.readFileSync(abs), { headers: { 'content-type': type } });
};
