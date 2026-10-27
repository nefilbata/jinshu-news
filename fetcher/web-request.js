import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execute = promisify(execFile);
const marker = '\n__JINSHU_RESPONSE_META__';

// Only public HTTPS GETs. curl retains its default CA and hostname verification.
export async function requestWeb(url, options, { request = fetch, run = execute } = {}) {
  if (new URL(url).protocol !== 'https:') throw new Error('Web transport requires HTTPS');
  try { return await request(url, options); }
  catch (primaryError) {
    const args = ['--silent', '--show-error', '--location', '--proto', '=https', '--proto-redir', '=https', '--max-time', '18', '--max-filesize', '8388608'];
    for (const [name, value] of Object.entries(options.headers || {})) args.push('--header', `${name}: ${value}`);
    args.push('--write-out', `${marker}%{http_code}\t%{content_type}`, '--url', url);
    try {
      const { stdout } = await run(process.platform === 'win32' ? 'curl.exe' : 'curl', args, {encoding: 'buffer', maxBuffer: 9 * 1024 * 1024, timeout: 20000});
      const split = stdout.lastIndexOf(Buffer.from(marker));
      if (split < 0) throw new Error('curl response metadata missing');
      const [status, type] = stdout.subarray(split + Buffer.byteLength(marker)).toString().split('\t');
      console.log(`[fetch] verified HTTPS fallback succeeded: ${new URL(url).hostname}`);
      return new Response(stdout.subarray(0, split), {status: Number(status), headers: {'content-type': type || 'text/html'}});
    } catch (fallbackError) {
      throw new Error(`Primary request: ${primaryError.message}; HTTPS fallback: ${(fallbackError.stderr?.toString() || fallbackError.message).slice(0,400)}`, {cause: primaryError.cause || primaryError});
    }
  }
}
