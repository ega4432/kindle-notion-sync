import { launch, Page } from 'puppeteer'
import dotenv from 'dotenv'

dotenv.config()

const KINDLE_EMAIL = process.env.KINDLE_EMAIL || ''
const KINDLE_PASSWORD = process.env.KINDLE_PASSWORD || ''
const KINDLE_URL =
  'https://read.amazon.co.jp/kindle-library?tabView=all&&sortType=acquisition_desc&seriesSortType=acquisition_desc&resourceType=EBOOK'

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
  if (KINDLE_EMAIL === '' || KINDLE_PASSWORD === '') {
    throw new Error('credentials are empty')
  }

  const browser = await launch({
    headless: process.env.NODE_ENV === 'production' ? true : false
  })
  const page = await browser.newPage()

  await page.setViewport({ width: 1200, height: 750 })
  await page.goto(KINDLE_URL, { waitUntil: 'domcontentloaded' })

  // login
  await page.type('input[type=email]', KINDLE_EMAIL)
  await page.type('input[type=password]', KINDLE_PASSWORD)
  await Promise.all([
    page.waitForNavigation({ waitUntil: ['load', 'networkidle2'] }),
    page.click('#signInSubmit')
  ])

  // screen shot
  await page.screenshot({ path: './out/image.png', fullPage: true })

  const coverDom = await page.$('#cover')
  if (!coverDom) {
    throw new Error('Failed to get dom')
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

  await browser.close()

  console.log(JSON.stringify(books, null, 2))
}

main()
