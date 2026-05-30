import net from 'net';
import tls from 'tls';

function encodeHeader(value) {
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

function normalizeAddress(value) {
  return String(value || '').trim();
}

function dotStuff(value) {
  return value.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..');
}

function createClient({ host, port, secure }) {
  return new Promise((resolve, reject) => {
    const socket = secure
      ? tls.connect({ host, port, servername: host }, () => resolve(socket))
      : net.connect({ host, port }, () => resolve(socket));
    socket.setTimeout(30000);
    socket.once('error', reject);
    socket.once('timeout', () => reject(new Error('SMTP timeout')));
  });
}

function readResponse(socket) {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const onData = (chunk) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const last = lines[lines.length - 1] || '';
      if (/^\d{3} /.test(last)) {
        socket.off('data', onData);
        const code = Number(last.slice(0, 3));
        if (code >= 400) reject(new Error(buffer.trim()));
        else resolve(buffer.trim());
      }
    };
    socket.on('data', onData);
  });
}

async function command(socket, line) {
  socket.write(`${line}\r\n`);
  return readResponse(socket);
}

async function startTls(socket, host) {
  await command(socket, 'STARTTLS');
  return tls.connect({ socket, servername: host });
}

function buildMessage({ from, to, subject, text, html }) {
  const boundary = `jinshu-${Date.now()}`;
  return [
    `From: ${from}`,
    `To: ${to.join(', ')}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    text,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    html,
    '',
    `--${boundary}--`,
    '',
  ].join('\r\n');
}

export function hasMailConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.MAIL_TO);
}

export async function sendMail({ subject, html, text }) {
  if (!hasMailConfig()) {
    console.log('[mail] SMTP not configured; skipped sending.');
    return { skipped: true };
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = port === 465 || process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = normalizeAddress(process.env.MAIL_FROM || user);
  const recipients = process.env.MAIL_TO.split(',').map(normalizeAddress).filter(Boolean);
  let socket = await createClient({ host, port, secure });

  await readResponse(socket);
  await command(socket, `EHLO ${process.env.SMTP_EHLO || 'jinshu-news.local'}`);
  if (!secure) {
    socket = await startTls(socket, host);
    await command(socket, `EHLO ${process.env.SMTP_EHLO || 'jinshu-news.local'}`);
  }
  await command(socket, 'AUTH LOGIN');
  await command(socket, Buffer.from(user).toString('base64'));
  await command(socket, Buffer.from(pass).toString('base64'));
  await command(socket, `MAIL FROM:<${from.replace(/^.*<|>.*$/g, '')}>`);
  for (const recipient of recipients) await command(socket, `RCPT TO:<${recipient.replace(/^.*<|>.*$/g, '')}>`);
  await command(socket, 'DATA');
  socket.write(`${dotStuff(buildMessage({ from, to: recipients, subject, text, html }))}\r\n.\r\n`);
  await readResponse(socket);
  await command(socket, 'QUIT').catch(() => null);
  socket.end();
  console.log(`[mail] sent to ${recipients.join(', ')}`);
  return { skipped: false, recipients };
}
