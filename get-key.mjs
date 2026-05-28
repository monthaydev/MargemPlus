/**
 * Captura a apikey real usada pelo app em localhost:3000
 * interceptando os requests do Supabase feitos pelo Next.js
 */
import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

let chaveCapturada = null

page.on('request', req => {
  const apikey = req.headers()['apikey']
  if (apikey && req.url().includes('supabase.co')) {
    chaveCapturada = apikey
  }
})

await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {})
await page.waitForTimeout(3000)
await browser.close()

if (chaveCapturada) {
  console.log('APIKEY=' + chaveCapturada)
} else {
  console.log('APIKEY=NOT_FOUND')
}
