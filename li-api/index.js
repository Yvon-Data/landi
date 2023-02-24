const { chromium } = require('playwright-extra')
const stealth = require('puppeteer-extra-plugin-stealth')()
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha')
const cheerio = require('cheerio');


module.exports = async function (context, req) {
    const usdot = req.query.usdot;
    const authid = req.query.authid;

    if (usdot && authid) {
        const chromeOptions = {
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: false,
            slowMo: 10
        }

        chromium.use(stealth)
        chromium.use(
            RecaptchaPlugin({
                provider: {
                    id: '2captcha',
                    token: '98f4622f19c0dd50d1d4a7bab741747d' // REPLACE THIS WITH YOUR OWN 2CAPTCHA API KEY ⚡
                },
                visualFeedback: true // colorize reCAPTCHAs (violet = detected, green = solved)
            })
        )

        // puppeteer usage as normal
        const browser = await chromium.launch(chromeOptions)
        const tabs = await browser.newContext();
        const page = await tabs.newPage()
        await page.goto(`https://li-public.fmcsa.dot.gov/LIVIEW/pkg_carrquery.prc_carrlist?n_dotno=${usdot}&s_prefix=MC&n_docketno=&s_legalname=&s_dbaname=&s_state=`)

        // Solve recaptcha
        await page.solveRecaptchas()
        await page.click(`body > font > center:nth-child(17) > form > input[type=submit]:nth-child(4)`)

        // Scrape active insurance
        async function getInsurance() {
            const insurance = await tabs.newPage()
            await insurance.goto(`https://li-public.fmcsa.dot.gov/LIVIEW/pkg_carrquery.prc_activeinsurance?pv_apcant_id=${authid}`)
            const insuranceData = await insurance.content();
            const $insurance = cheerio.load(insuranceData);

            //Scrape table
            const data = [];

            // extract table headers
            $insurance("body > font > table:nth-child(6) > tbody > tr").each((index, element) => {
                if (index === 0) return true;
                const form = $insurance(element).find('th').text().trim();
                const tds = $insurance(element).find('td');
                const type = $insurance(tds[0]).text().trim();
                const carrier = $insurance(tds[1]).text().trim();
                const policy = $insurance(tds[2]).text().trim();
                const postedDate = $insurance(tds[3]).text().trim();
                const coverageFrom = $insurance(tds[4]).text().trim();
                const coverageTo = $insurance(tds[5]).text().trim();
                const effectiveDate = $insurance(tds[6]).text().trim();
                const cancellationDate = $insurance(tds[7]).text().trim();
                const tableRow = {
                    form,
                    type,
                    carrier,
                    policy,
                    postedDate,
                    coverageFrom,
                    coverageTo,
                    effectiveDate,
                    cancellationDate
                };
                data.push(tableRow);
            });

            return data;
        }

        // Scrape active authority
        async function getAuthority() {
            const authority = await tabs.newPage()
            await authority.goto(`https://li-public.fmcsa.dot.gov/LIVIEW/pkg_carrquery.prc_authorityhistory?pv_apcant_id=${authid}`)
            const authorityData = await authority.content();
            const $authority = cheerio.load(authorityData);

            //Scrape table
            const data = [];

            // extract table headers
            $authority("body > font > table:nth-child(6) > tbody > tr").each((index, element) => {
                if (index === 0) return true;
                const ts = $authority(element).find('td, th');
                const type = $authority(ts[0]).text().trim();
                const action = $authority(ts[1]).text().trim();
                const actionDate = $authority(ts[2]).text().trim();
                const disposition = $authority(ts[3]).text().trim();
                const dispositionDate = $authority(ts[4]).text().trim();
                const tableRow = {type, action, actionDate, disposition, dispositionDate};
                data.push(tableRow);
            });

            return data;
        }

        const [insuranceData, authorityData] = await Promise.allSettled([getInsurance(), getAuthority()])
        await browser.close()
        console.log(insuranceData, authorityData)

        context.res = {
            // Return data to endpoint
            body: {insuranceData, authorityData}
        };
    } else {
        context.res = {
            // Return data to endpoint
            body: "Valid Parameters do not exist"
        };
    }
}