import { createServer } from 'http';

const PORT = process.env.PORT || 4000;
const users = new Map();

function sendJSON(res, data, status = 200) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  res.writeHead(status, headers);
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      if (!body) return resolve(null);
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  const { method, url } = req;

  // handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  try {
    if (url === '/api/auth/signup' && method === 'POST') {
      const payload = await parseJsonBody(req).catch(() => null);
      if (!payload || !payload.email || !payload.password || !payload.confirmPassword) {
        return sendJSON(res, { error: 'Missing required fields: email, password and confirmPassword' }, 400);
      }
      if (String(payload.password) !== String(payload.confirmPassword)) {
        return sendJSON(res, { error: 'Passwords do not match' }, 400);
      }
      const email = String(payload.email).trim().toLowerCase();
      if (users.has(email)) return sendJSON(res, { error: 'User already exists' }, 409);
      const id = String(Date.now());
      const role = payload.role === 'Admin' ? 'Admin' : 'Sales Employee';
      const user = { id, email, name: payload.name ?? '', password: payload.password, role };
      users.set(email, user);
      return sendJSON(
        res,
        { id, email: user.email, name: user.name, token: `fake-token-${id}`, role },
        201,
      );
    }

    if (url === '/api/auth/signin' && method === 'POST') {
      const payload = await parseJsonBody(req).catch(() => null);
      if (!payload || !payload.email || !payload.password) {
        return sendJSON(res, { error: 'Missing required fields: email and password' }, 400);
      }
      const email = String(payload.email).trim().toLowerCase();
      const user = users.get(email);
      if (!user || user.password !== payload.password) return sendJSON(res, { error: 'Invalid credentials' }, 401);
      return sendJSON(res, { id: user.id, email: user.email, name: user.name, token: `fake-token-${user.id}`, role: user.role }, 200);
    }

    // fallback
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  } catch (err) {
    sendJSON(res, { error: 'Server error' }, 500);
  }
});

server.listen(PORT, () => {
  console.log(`Local API server listening on http://localhost:${PORT}`);
});
