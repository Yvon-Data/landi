const puppeteer = require('puppeteer-extra')
const {executablePath} = require('puppeteer')


// add recaptcha plugin and provide it your 2captcha token (= their apiKey)
// 2captcha is the builtin solution provider but others would work as well.
// Please note: You need to add funds to your 2captcha account for this to work
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha')
puppeteer.use(
    RecaptchaPlugin({
        provider: {
            id: '2captcha',
            token: '08dadea261f5c7e89ac3cc19f15512fb' // REPLACE THIS WITH YOUR OWN 2CAPTCHA API KEY ⚡
        },
        visualFeedback: true // colorize reCAPTCHAs (violet = detected, green = solved)
    })
)

const chromeOptions = {
    headless: false,
    executablePath: executablePath(),
    slowMo: 10
}

// puppeteer usage as normal
puppeteer.launch(chromeOptions).then(async browser => {
    const page = await browser.newPage()
    await page.goto('https://li-public.fmcsa.dot.gov/LIVIEW/pkg_carrquery.prc_carrlist')

    await page.type('#usdot_number', '21800');

    // That's it, a single line of code to solve reCAPTCHAs 🎉
    await page.solveRecaptchas()

    await Promise.all([
        page.waitForNavigation(),
        page.click(`body > font > center:nth-child(17) > form > input[type=submit]:nth-child(4)`)
    ])

    await page.goto('https://li-public.fmcsa.dot.gov/LIVIEW/pkg_carrquery.prc_activeinsurance?pv_apcant_id=5405')

    // await browser.close()
})