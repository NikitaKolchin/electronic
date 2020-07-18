const {Builder, By, Key, until} = require('selenium-webdriver');

(async function example() {
    require("chromedriver")

    let driver = await new Builder().forBrowser('chrome').build();
    try {
        
        // Navigate to Url
        await driver.get('https://egrul.nalog.ru/index.html');
        let b = await driver.findElement(By.id('uni_text_0'));
        // Enter text "cheese" and perform keyboard action "Enter"
        await (await driver.findElement(By.id('uni_text_0'))).click();
        
        await driver.findElement(By.name('query')).sendKeys('5258101316', Key.ENTER);
        await driver.wait(until.elementLocated(By.className('op-excerpt')), 3000);
    
        await (await driver.findElement(By.className('op-excerpt'))).click();
    }
    finally{
      //  driver.quit();
    }
})();
  