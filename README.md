# Actual Bank importers

This repository contains importers for Actual Budget that work with the various output formats of the banks I use.

## How To

Create a `.env` with the needed configuration

Run

```shell
npm start bank_name file_name budget_name account_name
```

For example

```shell
npm start comdirect umsaetze_0123456789_20260901-2000.csv Morre Girokonto
```

## Banks

### comdirect (`comdirect`)

Use the CSV export from the account overview.

### Trade Republic (`traderepublic`)

For Trade Republic, use [pytr](https://github.com/pytr-org/pytr) with the `dl_docs` function, and the `timeline_transactions.json` file as input.
