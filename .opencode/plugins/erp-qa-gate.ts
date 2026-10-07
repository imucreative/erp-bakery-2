/**
 * .opencode/plugins/erp-qa-gate.ts
 *
 * Transliterasi `.kiro/hooks/qa-after-dev.json` (hook Kiro yang memang berjalan,
 * hanya dinonaktifkan sementara — koreksi atas asumsi lama di ADR 55 §1.1).
 *
 *   Kiro     : trigger "Stop"        -> action { type: "agent", prompt }
 *   opencode : event "session.idle"  -> client.session.promptAsync()
 *
 * Kesetaraan semantik ~90% — lihat knowledge-base/55 §4.2.
 *
 * Perbedaan yang disengaja (lebih ketat dari hook Kiro):
 *   - Deteksi perubahan pakai `client.session.diff()` + agregasi
 *     `session.children()` — BUKAN menebak dari isi percakapan.
 *   - "Diam kalau tidak ada perubahan" dipaksakan oleh KODE, bukan kepatuhan
 *     model membaca instruksi.
 *   - Hanya sesi ROOT yang dinudge (filter `parentID`) sehingga satu rangkaian
 *     Task = satu reminder, bukan satu per sub-agent.
 *   - Gagal mendeteksi perubahan = BLOCKED, bukan diam (fail-closed).
 *
 * Plugin ini TIDAK PERNAH menulis/mengubah file apa pun. `backend/**` dan
 * `frontend-tailadmin/**` hanya dibaca lewat session.diff — tidak pernah ditulis.
 *
 * Sakelar:
 *   - permanen  : ubah `ENABLED` di bawah
 *   - sementara : set env var ERP_QA_GATE=off (atau on). Env var menang atas konstanta.
 */

import * as nodePath from "node:path"
import type { Plugin } from "@opencode-ai/plugin"

// ============================================================================
// SAKELAR UTAMA — ubah `true` <-> `false` di sini untuk on/off permanen.
// Untuk on/off sementara tanpa edit file, set environment variable
// ERP_QA_GATE=off (atau =on). Env var selalu menang atas konstanta ini.
// ============================================================================
const ENABLED = true

const ENV_KEY = "ERP_QA_GATE"
const OFF_VALUES = new Set(["off", "0", "false", "no", "disabled"])
const ON_VALUES = new Set(["on", "1", "true", "yes", "enabled"])

/** Path yang memicu QA gate. `frontend/` ikut dipantau untuk keamanan (ADR 54). */
const DEFAULT_CODE_PATHS = ["backend/", "frontend-tailadmin/", "frontend/"]

/** TTL latch per sesi (anti double-nudge). */
const DEFAULT_LATCH_TTL_MS = 12 * 60 * 60 * 1000

/** Batas file yang ditampilkan di reminder. */
const MAX_LISTED_FILES = 20

/** Tool yang mengubah isi file (sinyal cadangan). */
const MUTATING_TOOLS = new Set(["write", "edit", "patch", "multiedit"])

const LOG_SERVICE = "erp-qa-gate"

/** Penanda unik untuk mendeteksi echo prompt kita sendiri (anti-loop). */
const MARKER = "[erp-qa-gate]"

const REMINDER_TEMPLATE = [
  MARKER,
  "",
  "Sesi eksekusi baru saja selesai, dan opencode mendeteksi file KODE yang berubah",
  "pada sesi ini:",
  "",
  "${files}",
  "",
  "Sebelum menyatakan tugas selesai ke user, lakukan verifikasi QA:",
  "1. Delegasikan verifikasi ke sub-agent `qa-engineer`, sebutkan scope perubahan",
  "   (modul / endpoint / halaman yang tersentuh) dan gate mana yang perlu",
  "   dijalankan (lihat knowledge-base/21.definition-of-done.md dan",
  "   knowledge-base/22.repository-quality-gates.md).",
  "2. Perubahan backend (`backend/**`): pastikan `npx tsc --noEmit` dan unit test lulus.",
  "3. Perubahan frontend (`frontend-tailadmin/**`): pastikan type-check/build lulus",
  "   sesuai stack yang disepakati.",
  "4. Tunggu Laporan QA (status tiap gate + verdict DONE / NOT DONE) sebelum",
  "   menyatakan tugas selesai ke user.",
  "",
  "Kalau ternyata perubahan di atas hanya dokumentasi (`knowledge-base/**`) atau",
  "tidak relevan, sebutkan singkat alasan QA dilewati — jangan diamkan.",
].join("\n")

const BLOCKED_TEMPLATE = [
  MARKER,
  "",
  "GATE QA: BLOCKED.",
  "",
  "opencode tidak berhasil membaca daftar file yang berubah pada sesi ini",
  "(endpoint session.diff / session.children tidak tersedia atau error).",
  "Karena itu gate tidak bisa memutuskan sendiri apakah ada perubahan kode.",
  "",
  "Tindakan yang WAJIB dilakukan:",
  "1. Jalankan `git status --short` dan `git diff --stat` untuk melihat sendiri",
  "   apa yang berubah di sesi ini.",
  "2. Kalau ada perubahan di `backend/**` atau `frontend-tailadmin/**`,",
  "   delegasikan verifikasi ke sub-agent `qa-engineer` sebelum menyatakan selesai.",
  "3. Kalau tidak ada perubahan kode, sebutkan singkat bahwa gate ter-blockir",
  "   namun tidak ada kode yang tersentuh.",
].join("\n")

type Options = {
  enabled?: boolean
  codePaths?: string[]
  latchTtlMs?: number
  reminder?: string
  blockedNotice?: string
}

/** Baca env var sakelar. Env var menang atas konstanta ENABLED. */
const envToggle = (): boolean | undefined => {
  const raw = (process.env[ENV_KEY] ?? "").trim().toLowerCase()
  if (raw === "") return undefined
  if (OFF_VALUES.has(raw)) return false
  if (ON_VALUES.has(raw)) return true
  return undefined
}

export const ErpQaGate: Plugin = async ({ client, worktree }, rawOptions) => {
  const opts = {
    enabled: ENABLED,
    codePaths: DEFAULT_CODE_PATHS,
    latchTtlMs: DEFAULT_LATCH_TTL_MS,
    reminder: REMINDER_TEMPLATE,
    blockedNotice: BLOCKED_TEMPLATE,
    ...(rawOptions as Options | undefined),
  }
  const env = envToggle()
  if (env !== undefined) opts.enabled = env

  /** sessionID -> timestamp nudge terakhir (anti double-nudge). */
  const latch = new Map<string, number>()
  /** sessionID yang sedang diproses (anti re-entrancy). */
  const inFlight = new Set<string>()
  /** Sesi yang pernah menerima pesan user (menyaring agent tersembunyi). */
  const userInitiated = new Set<string>()
  /** Sinyal cadangan: sessionID -> path relatif yang pernah di-mutate. */
  const touched = new Map<string, Set<string>>()

  const log = async (
    level: "debug" | "info" | "warn" | "error",
    message: string,
    extra?: Record<string, unknown>,
  ) => {
    try {
      await client.app.log({ body: { service: LOG_SERVICE, level, message, extra } })
    } catch {
      // Logging tidak boleh pernah menggagalkan sesi.
    }
  }

  /** Path apa pun -> posix relatif terhadap worktree root. */
  const rel = (raw: unknown): string => {
    if (typeof raw !== "string" || raw.length === 0) return ""
    const abs = nodePath.isAbsolute(raw) ? nodePath.resolve(raw) : nodePath.resolve(worktree, raw)
    const out = nodePath.relative(worktree, abs).split(nodePath.sep).join("/")
    return out.startsWith("./") ? out.slice(2) : out
  }

  const isCodePath = (p: string): boolean =>
    p !== "" && p !== ".." && !p.startsWith("../") && opts.codePaths.some((pre) => p.startsWith(pre))

  const prune = (now: number) => {
    for (const [id, at] of latch) if (now - at > opts.latchTtlMs) latch.delete(id)
    for (const [id, set] of touched) if (set.size === 0) touched.delete(id)
  }

  /** Kumpulkan seluruh sesi anak secara rekursif (sub-agent = sesi anak). */
  const collectSessionTree = async (rootID: string): Promise<string[]> => {
    const seen = new Set<string>([rootID])
    const queue = [rootID]
    while (queue.length > 0) {
      const current = queue.shift()!
      try {
        const res = await client.session.children({ path: { id: current } })
        for (const child of res.data ?? []) {
          if (!seen.has(child.id)) {
            seen.add(child.id)
            queue.push(child.id)
          }
        }
      } catch (err) {
        await log("warn", "session.children gagal", { sessionID: current, error: String(err) })
      }
    }
    return [...seen]
  }

  /**
   * File kode yang berubah di seluruh pohon sesi.
   * Sinyal utama = session.diff. Sinyal cadangan = touched (tool.execute.after).
   * `degraded` = TIDAK ADA sinyal yang bisa dibaca sama sekali -> pemanggil
   * harus fail-closed (BLOCKED), bukan diam.
   */
  const collectTouchedCodeFiles = async (
    rootID: string,
  ): Promise<{ files: string[]; degraded: boolean }> => {
    const tree = await collectSessionTree(rootID)
    const hits = new Set<string>()
    let diffSucceededAtLeastOnce = false
    let touchedSignal = false

    for (const id of tree) {
      try {
        const res = await client.session.diff({ path: { id } })
        diffSucceededAtLeastOnce = true
        for (const d of res.data ?? []) {
          const r = rel(d.file)
          if (isCodePath(r)) hits.add(r)
        }
      } catch (err) {
        await log("warn", "session.diff gagal", { sessionID: id, error: String(err) })
      }
      for (const p of touched.get(id) ?? []) {
        touchedSignal = true
        if (isCodePath(p)) hits.add(p)
      }
    }
    return { files: [...hits].sort(), degraded: !diffSucceededAtLeastOnce && !touchedSignal }
  }

  /**
   * Anti-loop lapis terakhir: apakah pesan user TERAKHIR di sesi ini adalah
   * prompt yang kita suntikkan sendiri? Kalau ya, JANGAN nudge lagi.
   * Ini menutup celah "restart opencode -> latch hilang -> echo -> nudge lagi".
   */
  const lastUserMessageIsOurs = async (sessionID: string): Promise<boolean> => {
    try {
      const res = await client.session.messages({ path: { id: sessionID }, query: { limit: 5 } })
      const msgs = res.data ?? []
      for (let i = msgs.length - 1; i >= 0; i--) {
        const entry = msgs[i]!
        if (entry?.info?.role !== "user") continue
        const text = (entry.parts ?? [])
          .map((p) => (p.type === "text" ? p.text : ""))
          .join("\n")
        return text.includes(MARKER)
      }
    } catch (err) {
      await log("debug", "session.messages gagal; lewati deteksi echo", { error: String(err) })
    }
    return false
  }

  const inject = async (sessionID: string, text: string): Promise<boolean> => {
    // Latch dipasang SEBELUM injeksi: kalau injeksi gagal, tidak ada retry-loop.
    latch.set(sessionID, Date.now())
    try {
      const res = await client.session.promptAsync({
        path: { id: sessionID },
        body: { parts: [{ type: "text", text }] },
      })
      if (res.error) {
        await log("error", "injeksi gagal", { sessionID, error: String(res.error) })
        return false
      }
      return true
    } catch (err) {
      await log("error", "injeksi melempar error", { sessionID, error: String(err) })
      return false
    }
  }

  if (!opts.enabled) {
    await log("info", "erp-qa-gate NON-AKTIF (sakelar off)", { env: process.env[ENV_KEY] ?? null })
  } else {
    await log("info", "erp-qa-gate aktif", {
      codePaths: opts.codePaths,
      env: process.env[ENV_KEY] ?? null,
    })
  }

  return {
    // (1) Re-arm latch saat user mengirim pesan baru. Inilah yang membuat gate
    //     berlaku "sekali per akhir giliran", bukan sekali per proses opencode.
    "chat.message": async (input) => {
      try {
        userInitiated.add(input.sessionID)
        latch.delete(input.sessionID)
      } catch (err) {
        await log("warn", "chat.message gagal", { error: String(err) })
      }
    },

    // (2) Sinyal cadangan: catat file yang di-mutate tool mutating.
    "tool.execute.after": async (input) => {
      try {
        if (!MUTATING_TOOLS.has(input.tool)) return
        const args = (input.args ?? {}) as Record<string, unknown>
        const candidates: unknown[] = [
          args.filePath,
          args.path,
          args.file,
          ...((args.files as string[]) ?? []),
        ]
        const set = touched.get(input.sessionID) ?? new Set<string>()
        for (const candidate of candidates) {
          const r = rel(candidate)
          if (!isCodePath(r)) continue
          set.add(r)
        }
        if (set.size > 0) touched.set(input.sessionID, set)
      } catch (err) {
        await log("debug", "tool.execute.after gagal", { error: String(err) })
      }
    },

    // (3) Trigger utama: padanan terdekat dari Kiro "Stop".
    event: async ({ event }) => {
      if (!opts.enabled) return
      if (event.type !== "session.idle") return

      const sessionID = event.properties?.sessionID
      if (!sessionID) return

      // Lapis anti-loop #1: in-flight guard.
      if (inFlight.has(sessionID)) return
      inFlight.add(sessionID)

      try {
        // Lapis anti-loop #2: latch per sesi.
        const now = Date.now()
        prune(now)
        if (latch.has(sessionID)) return

        const self = await client.session.get({ path: { id: sessionID } })
        const session = self.data
        if (!session) return

        // Hanya sesi ROOT (sub-agent punya parentID).
        if (session.parentID) return

        // Hanya sesi dengan input user nyata (buang compaction/summary/title).
        if (!userInitiated.has(sessionID)) return

        // Lapis anti-loop #3: jangan memicu QA atas prompt QA kita sendiri.
        if (await lastUserMessageIsOurs(sessionID)) {
          await log("debug", "lewati: pesan terakhir adalah prompt gate sendiri", { sessionID })
          return
        }

        const { files, degraded } = await collectTouchedCodeFiles(sessionID)

        // FAIL-CLOSED: tidak bisa membaca sinyal APA PUN -> BLOCKED, jangan diam.
        if (degraded) {
          await log("error", "gate BLOCKED: session.diff & children tidak terbaca", { sessionID })
          await inject(sessionID, opts.blockedNotice)
          return
        }

        // Tidak ada perubahan kode -> diam (murni, tanpa injeksi apa pun).
        if (files.length === 0) return

        const listed =
          files
            .slice(0, MAX_LISTED_FILES)
            .map((f) => `  - \`${f}\``)
            .join("\n") +
          (files.length > MAX_LISTED_FILES
            ? `\n  - ... dan ${files.length - MAX_LISTED_FILES} file lain`
            : "")

        await inject(sessionID, opts.reminder.replace("${files}", listed))
        await log("info", "QA reminder diinjeksi", { sessionID, codeFiles: files.length })
      } catch (err) {
        // Plugin TIDAK BOLEH melempar error; itu bisa merusak sesi.
        await log("error", "erp-qa-gate gagal total", { sessionID, error: String(err) })
      } finally {
        inFlight.delete(sessionID)
      }
    },
  }
}