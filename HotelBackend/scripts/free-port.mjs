/**
 * Stops a stale node.exe that is still LISTENING on PORT (default 5000).
 * npm run start runs this first so EADDRINUSE from a previous session is avoided.
 */
import { execSync } from 'child_process';

const port = String(process.env.PORT || 5000);

function freeWindows() {
  let netstat;
  try {
    netstat = execSync('netstat -ano', { encoding: 'utf8' });
  } catch {
    return;
  }
  const pids = new Set();
  for (const line of netstat.split(/\r?\n/)) {
    if (!line.includes('LISTENING')) continue;
    const colonPort = `:${port}`;
    if (!line.includes(colonPort)) continue;
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (/^\d+$/.test(pid)) pids.add(pid);
  }
  for (const pid of pids) {
    let img = '';
    try {
      img = execSync(`tasklist /FI "PID eq ${pid}" /NH`, { encoding: 'utf8' });
    } catch {
      continue;
    }
    if (!/node\.exe/i.test(img)) continue;
    try {
      console.log(`[HotelBackend] Port ${port} in use by node.exe (PID ${pid}) — stopping it.`);
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'inherit' });
    } catch {
      /* ignore */
    }
  }
}

function freeUnix() {
  try {
    const out = execSync(`lsof -tiTCP:${port} -sTCP:LISTEN`, { encoding: 'utf8' }).trim();
    if (!out) return;
    for (const pid of out.split(/\n/)) {
      if (!/^\d+$/.test(pid)) continue;
      let cmd = '';
      try {
        cmd = execSync(`ps -p ${pid} -o comm=`, { encoding: 'utf8' }).trim();
      } catch {
        continue;
      }
      if (!/node/i.test(cmd)) continue;
      console.log(`[HotelBackend] Port ${port} in use by ${cmd} (PID ${pid}) — stopping it.`);
      try {
        process.kill(Number(pid), 'SIGTERM');
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* lsof missing or nothing listening */
  }
}

if (process.platform === 'win32') {
  freeWindows();
} else {
  freeUnix();
}
