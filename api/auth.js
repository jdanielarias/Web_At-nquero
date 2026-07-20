// Primera mitad del login del panel (/admin/): manda al navegador a GitHub
// para que Enosh autorice. GitHub devuelve a /api/callback, que es quien
// termina el intercambio. Necesita en Vercel las variables de entorno
// OAUTH_GITHUB_CLIENT_ID y OAUTH_GITHUB_CLIENT_SECRET (mira el README).
import crypto from 'node:crypto';

export default function handler(req, res) {
  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  if (!clientId) {
    res.status(500).send('Falta la variable OAUTH_GITHUB_CLIENT_ID en Vercel.');
    return;
  }

  const host = req.headers['x-forwarded-host'] ?? req.headers.host;

  // El "state" evita que otro sitio inicie el login por nosotros: se guarda
  // en una cookie y /api/callback comprueba que GitHub devuelva el mismo.
  const state = crypto.randomBytes(16).toString('hex');
  res.setHeader(
    'Set-Cookie',
    `oauth_state=${state}; Path=/api; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
  );

  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', `https://${host}/api/callback`);
  url.searchParams.set('scope', 'repo,user');
  url.searchParams.set('state', state);

  res.redirect(302, url.toString());
}
