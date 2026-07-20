// Segunda mitad del login del panel: GitHub devuelve aqui con un codigo de un
// solo uso, esta funcion lo cambia por el token real y se lo pasa a la
// ventana del panel con el saludo que Decap CMS espera (postMessage).

function pagina(res, estado, contenido) {
  // El panel abre esto en una ventana emergente: primero se saluda
  // ("authorizing:github") y, cuando el panel contesta, se le manda el
  // resultado. El origen se toma del mensaje del panel, no de un comodin.
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!doctype html>
<html lang="es"><body>
<p>Entrando al panel…</p>
<script>
  (function () {
    function recibir(e) {
      window.removeEventListener('message', recibir, false);
      e.source.postMessage(
        'authorization:github:${estado}:' + JSON.stringify(${JSON.stringify(contenido)}),
        e.origin
      );
    }
    window.addEventListener('message', recibir, false);
    window.opener.postMessage('authorizing:github', '*');
  })();
</script>
</body></html>`);
}

export default async function handler(req, res) {
  const clientId = process.env.OAUTH_GITHUB_CLIENT_ID;
  const clientSecret = process.env.OAUTH_GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    res.status(500).send('Faltan OAUTH_GITHUB_CLIENT_ID / OAUTH_GITHUB_CLIENT_SECRET en Vercel.');
    return;
  }

  const { code, state } = req.query;
  const cookieState = (req.headers.cookie ?? '')
    .split(/;\s*/)
    .find((c) => c.startsWith('oauth_state='))
    ?.slice('oauth_state='.length);

  if (!code || !state || state !== cookieState) {
    pagina(res, 'error', { error: 'El login no salió de esta página. Vuelve a intentarlo.' });
    return;
  }

  const respuesta = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });
  const datos = await respuesta.json();

  if (datos.error || !datos.access_token) {
    pagina(res, 'error', { error: datos.error_description ?? 'GitHub no entregó el token.' });
    return;
  }

  pagina(res, 'success', { token: datos.access_token, provider: 'github' });
}
