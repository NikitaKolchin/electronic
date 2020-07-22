const electron = require("electron");
const ipcRenderer = require("electron").ipcRenderer;

var handleFile = document.getElementById("handle");
var inns = document.getElementById("inns");
// Defining a Global file path Variable to store
// user-selected file
global.filepath = undefined;
// Importing dialog module using remote
const dialog = electron.remote.dialog;

ipcRenderer.on("menu", function (event, message) {
  if (message === "read-file") {
    dialog
      .showOpenDialog({
        title: "Select the File to be uploaded",
        // defaultPath: path.join(__dirname, "../assets/"),
        buttonLabel: "Upload",
        // Restricting the user to only Text Files.
        filters: [
          {
            name: "Text Files",
            extensions: ["csv"],
          },
        ],
        // Specifying the File Selector Property
        properties: ["openFile"],
      })
      .then((file) => {
        // Stating whether dialog operation was
        // cancelled or not.
        console.log(file.canceled);
        if (!file.canceled) {
          // Updating the GLOBAL filepath variable
          // to user-selected file.
          global.filepath = file.filePaths[0].toString();
          console.log(global.filepath);
          const fs = require("fs");
          if (global.filepath && !file.canceled) {
            fs.readFile(global.filepath, { encoding: "utf-8" }, function (
              err,
              data
            ) {
              if (!err) {
                inns.value = data;
                console.log("received data: " + data);
              } else {
                console.log(err);
              }
            });
          }
        }
      })
      .catch((err) => {
        console.log(err);
      });
  }
});

handleFile.addEventListener("click", () => {
  var myHeaders = new Headers();
  myHeaders.append("Accept", "application/json, text/javascript, */*; q=0.01");
  myHeaders.append("Accept-Encoding", "gzip, deflate, br");
  myHeaders.append("Accept-Language", "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7");
  myHeaders.append("Connection", "keep-alive");
  myHeaders.append("Content-Length", "75");
  myHeaders.append("Content-Type", "application/x-www-form-urlencoded");
  myHeaders.append("Host", "egrul.nalog.ru");
  myHeaders.append("Origin", "https://egrul.nalog.ru");
  myHeaders.append("Referer", "https://egrul.nalog.ru/index.html");

  var raw =
    "vyp3CaptchaToken=&page=&query=1202004842&region=&PreventChromeAutocomplete=";

  var requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: raw,
  };

  fetch("https://egrul.nalog.ru/", requestOptions)
    .then((response) => response.text())
    .then((result) => {
      let token1 = JSON.parse(result).t;
      console.log(token1);
      fetch(
        "https://egrul.nalog.ru/search-result/"+token1,
        {method:"GET"},
      )
        .then((response) => response.text())
        .then((result) => {
          let token2 = JSON.parse(result)['rows'][0].t;
          console.log(token2);
          fetch(
            "https://egrul.nalog.ru/vyp-request/"+token2,
            {method:"GET"},
          )
            .then((response) => response.text())
            .then((result) => {
            let token3 = JSON.parse(result).t;
            console.log(token3);
            fetch(
              "https://egrul.nalog.ru/vyp-status/"+token3,
              {method:"GET"},
            )
              .then((response) => response.text())
              .then((result) => {
              console.log(JSON.parse(result).status);
              if(JSON.parse(result).status === "ready"){
                fetch(
                  "https://egrul.nalog.ru/vyp-download/"+token3,
                  {method:"GET"},
                )
                  .then((response) => response.text())
                  .then((result) => {
                  console.log(result); 
                  }) 
                  .catch((error) => console.log("error", error));
              }   
              }) 
              .catch((error) => console.log("error", error));
            }) 
            .catch((error) => console.log("error", error));
        })  
        .catch((error) => console.log("error", error));
    })
    .catch((error) => console.log("error", error));
});

// handleFile.addEventListener("click", async () => {
//   // If the platform is 'win32' or 'Linux'
//   // Resolves to a Promise<Object>
//   require("chromedriver");

//   let driver = await new Builder().forBrowser("chrome").build(); //1001241307
//   let inn_arr = inns.value.split("\n");
//   driver.get("https://egrul.nalog.ru/index.html");
//    inn_arr.forEach(async (element) => {

//    // await (await driver.findElement(By.id('uni_text_0'))).click();

//     let query = await  driver.findElement(By.name('query'))
//     let sendKeys = await query.sendKeys(element, Key.ENTER);
//     let wait = await driver.wait(until.elementLocated(By.className('op-excerpt')), 3000);
//     let btn_dowload = await driver.findElement(By.className('op-excerpt'));
//     let btn_dowload_clk = btn_dowload.click();
//     console.log("loop"+element);

//   });
// });
