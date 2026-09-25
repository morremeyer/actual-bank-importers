import "dotenv/config"

import api from "@actual-app/api"
import iconv from "iconv-lite"
import { banks } from "./banks.js"
import { Bank } from "./types.js"
import fs from "fs"
import { Transaction } from "./types.js"

;(async () => {
  const args = process.argv.slice(2)
  const bank = args[0] || ""
  const file = args[1] || ""
  const budget = args[2] || ""
  const account = args[3] || ""

  let error = false

  if (bank == "") {
    console.log("bank must be specified")
    error = true
  }

  if (file == "") {
    console.log("file must be specified")
    error = true
  }

  if (budget == "") {
    console.log("budget must be specified")
    error = true
  }

  if (account == "") {
    console.log("account must be specified")
    error = true
  }

  if (error) {
    return false
  }

  // Now, find the correct adapter
  const parser = banks.find((a: Bank) => a.name === bank)
  if (parser === undefined) {
    const banksList = banks.map((b: Bank) => b.name).join(", ")
    console.log(
      `The bank you specified can't be parsed. Available banks are: ${banksList}`
    )

    return false
  }

  const transactions = parse(parser, file)

  await api.init({
    dataDir: "data",
    serverURL: process.env.SERVER_URL || "",
    password: process.env.SERVER_PASSWORD || "",
  })
  await performImport(budget, account, transactions)
  await api.shutdown()
})()

function parse(parser: Bank, file: string): Transaction[] {
  const rawBuffer = fs.readFileSync(file)
  const content = iconv.decode(rawBuffer, parser.encoding)

  console.log(`Parsing ${file} with ${parser.name}`)
  return parser.parse(content)
}

async function performImport(
  budgetName: string,
  accountName: string,
  transactions: Transaction[]
) {
  const budgets = await api.getBudgets()

  // Filter the budget list for the correct one, don't accept duplicates.
  // Once downloaded, the budget will show up both remote and local, therefore
  // we exclude the local copy by excluding any with an ID set.
  //
  // api.downloadBudget will use the local copy anyways.
  const budget = budgets.filter(b => b.name === budgetName && !b.id)
  if (budget.length === 0) {
    console.log("There is no budget with the name you specified")
    return
  } else if (budget.length > 1) {
    console.log("There are multiple budgets with the name you specified")
    return
  }

  await api.downloadBudget(budget[0]!.groupId)

  const accounts = await api.getAccounts()
  const account = accounts.find(a => a.name === accountName)

  if (account === undefined) {
    console.log("No account with this name exists")
    return
  }

  await api.importTransactions(account.id, transactions, {
    dryRun: false,
    reimportDeleted: true,
    payeeNameNormalization: "original",
  })

  await api.sync()
}
