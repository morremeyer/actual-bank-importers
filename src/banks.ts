// This file has been initially taken from https://github.com/FridoE/actual-bank-importer/blob/68fe4a2dc2d80c75441722c2906a81c09aacbeb5/import.js and modified thereafter

import { parseAmountCents } from "./helpers.js"
import { Transaction } from "./types.js"
import { createHash } from "crypto"

// ── Bank adapters ─────────────────────────────────────────────────────────────
//
// To add a new bank: append one object to this array. No other code changes needed.
//   name: Used to match the parser
//   encoding: iconv-lite encoding to decode the raw CSV buffer
//   parse(content) → Transaction[] – parse decoded CSV string into transactions

export const banks = [
  // ── comdirect ──────────────────────────────────────────────────────────────
  {
    name: "comdirect",
    encoding: "win1252",

    parse(content: string): Transaction[] {
      const transactions = []
      let inData = false

      for (const line of content.split(/\r?\n/)) {
        if (!line.trim()) continue
        const row = line.split(";").map(f => f.trim().replace(/^"|"$/g, ""))
        const first = row[0]

        if (first === "Buchungstag") {
          inData = true
          continue
        }
        if (!inData) continue
        if (first === "Alter Kontostand" || first === "Neuer Kontostand") break
        if (row.length < 5) continue

        const buchungstag = row[0] || ""
        const vorgang = row[2] || ""
        const buchungstext = row[3] || ""
        const umsatzRaw = row[4] || ""

        if (buchungstag === "offen") {
          console.log(`  [skipped – pending] ${buchungstext.slice(0, 60)}`)
          continue
        }

        const [d, m, y] = buchungstag.split(".")
        if (!d || !m || !y) continue
        const date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`

        const amount = parseAmountCents(umsatzRaw)
        if (isNaN(amount)) {
          console.log(`  [skipped – invalid amount] ${umsatzRaw}`)
          continue
        }

        // Extract payee from Buchungstext
        let payee
        const senderMatch = buchungstext.match(
          /(?:Auftraggeber|Empf[äÄ]nger):\s*(.+?)(?:\s{2,}|Kto\/IBAN|BLZ\/BIC|Buchungstext|$)/i
        )
        if (senderMatch) {
          payee = senderMatch[1]!.trim()
        } else {
          const textMatch = buchungstext.match(/Buchungstext:\s*([^,/\n]+)/i)
          payee = textMatch ? textMatch[1]!.trim() : vorgang.trim()
        }

        const notesMatch = buchungstext.match(/Buchungstext:\s*(.+)Ref./i)
        const notes =
          (notesMatch ? notesMatch[1]!.trim() : buchungstext).slice(0, 500) ||
          ""

        const refMatch = buchungstext.match(/Ref\.\s+([A-Z0-9/]+)/)
        const imported_id = refMatch
          ? refMatch[1]
          : createHash("sha1")
              .update(`${date}:${amount}:${buchungstext.slice(0, 80)}`)
              .digest("hex")
              .slice(0, 20)

        const transaction: Transaction = {
          date: date,
          amount: amount,
          payee_name: payee.slice(0, 255),
          notes: notes,
          imported_id: imported_id!,
          account: "",
        }

        transactions.push(transaction)
      }

      return transactions
    },
  },
]
