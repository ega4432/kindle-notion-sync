import { launch, Page } from 'puppeteer'
import dotenv from 'dotenv'

import { GetToken } from './cmd'

dotenv.config()

const KINDLE_EMAIL = process.env.KINDLE_EMAIL || ''
const KINDLE_PASSWORD = process.env.KINDLE_PASSWORD || ''
const KINDLE_URL =
  'https://read.amazon.co.jp/kindle-library?tabView=all&&sortType=acquisition_desc&seriesSortType=acquisition_desc&resourceType=EBOOK'

const SECRET_KEY = process.env.SECRET_KEY || ''
let SESSION_TOKEN: string

const login = async (page: Page): Promise<void> => {
  // login
}

const scrape = async () => {
  //
}

interface Book {
  // id: number
  asin: string
  title: string
  author: string
}

const main = async () => {
  if (KINDLE_EMAIL === '' || KINDLE_PASSWORD === '' || SECRET_KEY === '') {
    throw new Error('credentials are empty')
  }

  const browser = await launch({
    headless: process.env.NODE_ENV === 'production' || process.env.CI === 'true'
  })
  const page = await browser.newPage()

  await page.setViewport({ width: 1200, height: 750 })
  await page.goto(KINDLE_URL, { waitUntil: 'domcontentloaded' })

  // login
  await page.type('input[type=email]', KINDLE_EMAIL)
  await page.type('input[type=password]', KINDLE_PASSWORD)
  await Promise.all([
    page.waitForNavigation({ waitUntil: ['load', 'networkidle0'] }),
    page.click('#signInSubmit')
  ])

  await Promise.all([
    page.type('#auth-mfa-otpcode', SESSION_TOKEN),
    page.waitForNavigation({ waitUntil: ['load', 'networkidle0'] })
  ])

  const coverDom = await page.$('#cover')
  if (!coverDom) {
    throw new Error('Failed to get dom id "#cover"')
  }

  const itemList = await coverDom.$$('li')
  const books: Book[] = []

  for (const item of itemList) {
    const asin = await item.$eval('div', (element) =>
      element.getAttribute('data-asin')
    )

    if (!asin) {
      continue
    }

    const details = await item.$$('div > div:nth-child(2) > div')
    let title = '',
      author = ''

    for (const detail of details) {
      const idSelector = await (await detail.getProperty('id')).jsonValue()
      const p = await detail.$('p')

      if (!p) {
        continue
      }

      const textContent = await (await p.getProperty('textContent')).jsonValue()

      if (textContent) {
        if (idSelector.includes('title')) {
          title = textContent
        }

        if (idSelector.includes('author')) {
          author = textContent
        }
      }
    }

    if (asin !== '' && title !== '' && author !== '') {
      books.push({ asin, title, author })
    }
  }

  await page.close()
  await browser.close()

  console.log(JSON.stringify(books, null, 2))
}

SESSION_TOKEN = GetToken(SECRET_KEY)

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
