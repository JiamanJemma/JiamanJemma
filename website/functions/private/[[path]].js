function unauthorized() {
  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Jemma Private", charset="UTF-8"',
      'Cache-Control': 'no-store'
    }
  });
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function onRequest(context) {
  const auth = context.request.headers.get('Authorization') || '';
  const expectedUser = context.env.PRIVATE_USER;
  const expectedPass = context.env.PRIVATE_PASS;

  if (!expectedUser || !expectedPass || !auth.startsWith('Basic ')) {
    return unauthorized();
  }

  let decoded = '';
  try {
    decoded = atob(auth.slice(6));
  } catch {
    return unauthorized();
  }

  const separator = decoded.indexOf(':');
  if (separator === -1) return unauthorized();

  const user = decoded.slice(0, separator);
  const pass = decoded.slice(separator + 1);

  if (!timingSafeEqual(user, expectedUser) || !timingSafeEqual(pass, expectedPass)) {
    return unauthorized();
  }

  return context.next();
}
