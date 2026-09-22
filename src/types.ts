export type Transaction = {
  date: string
  amount: number
  payee_name: string
  notes: string
  imported_id: string
  account: string
}

export type Bank = {
  name: string
  encoding: string
  parse: (content: string) => Transaction[]
}
