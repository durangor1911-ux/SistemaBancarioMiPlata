import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const ARCHIVOS_PUBLICOS = new Set([
  'index.html',
  'styles.css',
  'src/ui.js',
  'src/localBank.js',
  'src/classes/cuenta.js',
  'src/classes/cuentaAhorros.js',
  'src/classes/cuentaCorriente.js',
  'src/classes/tarjetaCredito.js',
  'src/security/validadores.js',
  'src/security/roles.js',
]);
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

const servidor = http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Método no permitido');
    return;
  }

  let rutaSolicitada;
  try {
    rutaSolicitada = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400);
    res.end('Solicitud inválida');
    return;
  }

  const rutaRelativa = (rutaSolicitada === '/' ? 'index.html' : rutaSolicitada.slice(1)).replaceAll('\\', '/');
  if (!ARCHIVOS_PUBLICOS.has(rutaRelativa)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('No encontrado');
    return;
  }

  try {
    const rutaArchivo = path.join(raiz, rutaRelativa);
    const contenido = await fs.readFile(rutaArchivo);
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[path.extname(rutaArchivo)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(req.method === 'HEAD' ? undefined : contenido);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('No encontrado');
  }
});

servidor.listen(PORT, '127.0.0.1', () => {
  const puertoActivo = servidor.address().port;
  console.log(`Mi Plata local disponible en http://localhost:${puertoActivo}/`);
  console.log('Sin API: las operaciones e historial se guardan en el navegador.');
});
