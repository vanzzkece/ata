import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion, Browsers } from "@whiskeysockets/baileys"
import P from "pino"

const groupTarget = "1203630xxxxxx@g.us" // ganti dengan JID grup target
const nomorKamu = "628xxxxxx" // nomor WA kamu

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("session")
  const { version } = await fetchLatestBaileysVersion()
  const sock = makeWASocket({
    version,
    auth: state,
    logger: P({ level: "silent" }),
    printQRInTerminal: false, // pakai pairing code, bukan QR
    browser: Browsers.ubuntu("Chrome") // lebih clean
  })

  sock.ev.on("creds.update", saveCreds)

  // Pairing Code
  if (!sock.authState.creds.registered) {
    let code = await sock.requestPairingCode(nomorKamu)
    console.log(`🔗 Pairing Code untuk ${nomorKamu}: ${code}`)
  }

  // Listener pesan masuk
  sock.ev.on("messages.upsert", async ({ messages }) => {
    let m = messages[0]
    if (!m.message || !m.key.remoteJid) return
    const text =
      m.message.conversation ||
      m.message.extendedTextMessage?.text ||
      m.message.imageMessage?.caption ||
      ""

    // cek pesan RMCP (balasan .inv bot lain)
    if (text.includes("Harga 1 Barang")) {
      let match = text.match(/_Diamond :_ Rp\. ([0-9.,]+)/)
      if (match) {
        let harga = parseInt(match[1].replace(/\./g, ""))
        console.log("💎 Harga Diamond:", harga)

        if (harga < 390000) {
          await sock.sendMessage(groupTarget, { text: ".in 3 all" })
          console.log("📈 Diamond murah → membeli...")
        } else if (harga > 390000) {
          await sock.sendMessage(groupTarget, { text: ".ins 3 all" })
          console.log("📉 Diamond mahal → menjual...")
        }
      }
    }
  })

  // Loop tiap 1 menit kirim .inv
  setInterval(async () => {
    await sock.sendMessage(groupTarget, { text: ".inv" })
    console.log("🔄 Mengirim .inv ke grup")
  }, 60 * 1000)
}

startBot()
