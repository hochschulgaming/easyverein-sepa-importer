#!/usr/bin/env zx

import { parse } from 'csv/sync'

const IMPORT_FILE = 'Lastschriftmandat.csv'
const API_KEY = 'redacted'

const HEADERS = {
    'Authorization': `Token ${API_KEY}`
}
const API_BASE = 'https://easyverein.com/api/v1.6'
const API_MEMBER = `${API_BASE}/member`
const API_CONTACT_DETAILS = `${API_BASE}/contact-details`

async function fetchAllPages(url, options) {
    const ret = []
    do {
        const resp = await fetch(url, options)
        const { results, next } = await resp.json()
        ret.push(...results)
        url = next
    } while (url != null)
    return ret
}

const results = await fetchAllPages(API_MEMBER + '?query={id,contactDetails{id,name,iban,bic}}', { headers: HEADERS })
const csvData = parse(fs.readFileSync(IMPORT_FILE, 'utf-8'), { columns: true })

for (const mandate of csvData) {
    const user = results.find(x => x.contactDetails.name.trim() == `${mandate.Vorname.trim()} ${mandate.Nachname.trim()}`)
    if (user != null) {
        console.log(`Updating ${user.contactDetails.name}`)
        if (user.contactDetails.iban) {
            console.log('User already has a mandate, skipping')
            continue
        }
        const resp = await fetch (`${API_CONTACT_DETAILS}/${user.contactDetails.id}`, {
            method: 'PATCH',
            headers: {
                ...HEADERS,
                'Content-Type': 'application/json'
            }, 
            body: JSON.stringify({
                iban: mandate.IBAN,
                bic: mandate.BIC
            })
        })
        if (resp.status !== 200) {
            console.log(await resp.text())
        }
    } else {
        console.log(`Could not find ${mandate.Vorname.trim()} ${mandate.Nachname.trim()}`)
    }
}
