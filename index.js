const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const loginDetails = require('./login-details.json');

const readTheNews = async () => {
    try {
        const oldNews = JSON.parse(await fs.readFile('newsfeed.json'));

        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto('https://jenseneducation.learnpoint.se/NewsFeedForms/NewsFeed.aspx');

        //Login if not already logged in
        if (await page.$('#ctl00_MainContentPlaceHolder_ctlUserLoginControl_txtUserName')) {
            await page.type('#ctl00_MainContentPlaceHolder_ctlUserLoginControl_txtUserName', loginDetails.learnpoint.username);
            await page.type('#ctl00_MainContentPlaceHolder_ctlUserLoginControl_txtPassword', loginDetails.learnpoint.password);
            await page.click('#ctl00_MainContentPlaceHolder_ctlUserLoginControl_btnLogin');
        
            await page.waitForNavigation();
        }
        
        //On newsfeed page
        const news = await page.evaluate(() => {
            return [...document.querySelectorAll('.ascx-group-posts__item')].map(post => post.innerText);
        });
        
        // Something new?
        if (news[0] !== oldNews[0]) {
            console.log('New stuff on Learnpoint');

            //Send email if something new
            let emailTransporter = nodemailer.createTransport({
                host: "smtp-mail.outlook.com",
                port: 587,
                secure: false, // upgrade later with STARTTLS
                auth: {
                    user: loginDetails.email.username,
                    pass: loginDetails.email.password,
                },
            });
            let emailSend = await emailTransporter.sendMail({
                from: `${loginDetails.email.sendername} <${loginDetails.email.emailaddress}>`,
                to: loginDetails.email.emailaddress,
                subject: 'Nytt på Learnpoint',
                text: `3 senaste posterna: \n\n
                ${news[0]}\n\n
                ${news[1]}\n\n
                ${news[2]}
                `
            })
            console.log('email sent, messageID: ' + emailSend.messageId);
        }

        //Update newsfeed JSON
        await fs.writeFile('newsfeed.json', JSON.stringify(news));
      
        await browser.close(); 
    } catch (error) {
        console.error(error);
        console.error(error.stack);
        console.error(error.line);
        console.error(error.lineNumber);
    }
};

//Read the news every half hour
setInterval(readTheNews, 1800000);