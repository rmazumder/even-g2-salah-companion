/**
 * Generate the sideload QR pointing at this machine's LAN IP (NOT localhost).
 *
 * The glasses/phone scan the QR and open the URL themselves, so it must be an
 * address reachable from the phone on the same Wi-Fi — `localhost` would resolve
 * to the phone itself. We prefer the macOS Wi-Fi interface (en0/en1) and fall
 * back to the first private IPv4 we can find.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { networkInterfaces } from 'node:os'

const PORT = process.env.PORT ?? '5173'

function fromIfconfig() {
  for (const iface of ['en0', 'en1']) {
    try {
      const ip = execFileSync('ipconfig', ['getifaddr', iface], { encoding: 'utf8' }).trim()
      if (ip) return ip
    } catch {
      // interface not present / not connected
    }
  }
  return null
}

function fromNodeOs() {
  const addrs = []
  for (const list of Object.values(networkInterfaces())) {
    for (const i of list ?? []) {
      if (i.family === 'IPv4' && !i.internal) addrs.push(i.address)
    }
  }
  // Prefer common home/Wi-Fi ranges; skip .1 (usually a VM/bridge gateway).
  const isPrivate = (a) => /^(192\.168|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a)
  return addrs.find((a) => isPrivate(a) && !a.endsWith('.1')) ?? addrs.find(isPrivate) ?? addrs[0]
}

const ip = fromIfconfig() ?? fromNodeOs()
if (!ip) {
  console.error('Could not determine a LAN IP. Connect to Wi-Fi, or run:')
  console.error('  npx evenhub qr --http --port ' + PORT + ' --ip <your-ip>')
  process.exit(1)
}

console.log(`Sideload URL: http://${ip}:${PORT}  (phone must be on the same Wi-Fi)`)
const r = spawnSync('npx', ['evenhub', 'qr', '--http', '--port', PORT, '--ip', ip], {
  stdio: 'inherit',
})
process.exit(r.status ?? 0)
