const electron = require("electron");
const ipcRenderer = require("electron").ipcRenderer;

let fs = require("fs");
let fileList = [];
const handleFile = document.getElementById("handle");
const handlePDF = document.getElementById("pdf");
const inns = document.getElementById("inns");
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

handleFile.addEventListener("click", async () => {
  let inn_arr = inns.value.split("\n");
  for (const item of inn_arr) {
    if (item.length === 10) {
      await delay(1000);
      let status = await downloadFromEgrul(item);
      inns.value = inns.value.replace(item, item + " " + status);
    }
  }
});

function delay(sec) {
  return new Promise((resolve) => setTimeout(resolve, sec));
}

const downloadFromEgrul = async (inn) => {
  var myHeaders1 = new Headers();
  myHeaders1.append("Accept", "application/json, text/javascript, */*; q=0.01");
  myHeaders1.append("Accept-Encoding", "gzip, deflate, br");
  myHeaders1.append("Accept-Language", "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7");
  myHeaders1.append("Connection", "keep-alive");
  myHeaders1.append("Content-Length", "75");
  myHeaders1.append("Content-Type", "application/x-www-form-urlencoded");
  myHeaders1.append("Host", "egrul.nalog.ru");
  myHeaders1.append("Origin", "https://egrul.nalog.ru");
  myHeaders1.append("Referer", "https://egrul.nalog.ru/index.html");

  var raw1 =
    "vyp3CaptchaToken=&page=&query=" +
    inn +
    "&region=&PreventChromeAutocomplete=";

  var requestOptions1 = {
    method: "POST",
    headers: myHeaders1,
    body: raw1,
  };

  let token1, token2, token3, rs;

  try {
    let response1 = await fetch("https://egrul.nalog.ru/", requestOptions1);
    if (response1.ok) {
      let result1 = await response1.text();
      token1 = JSON.parse(result1).t;
      console.log("token1 = " + token1);
    } else {
      console.log("HTTP error 1: " + response1.status);
      return "error: " + error;
    }

    await delay(1000);

    let response2 = await fetch(
      "https://egrul.nalog.ru/search-result/" + token1,
      { method: "GET" }
    );
    if (response2.ok) {
      let result2 = await response2.text();
      token2 = JSON.parse(result2)["rows"][0].t;
      console.log("token2 = " + token2);
    } else {
      console.log("HTTP error 2: " + response2.status);
      return "error: " + error;
    }

    await delay(1000);

    let response3 = await fetch(
      "https://egrul.nalog.ru/vyp-request/" + token2,
      { method: "GET" }
    );
    if (response3.ok) {
      let result3 = await response3.text();
      token3 = JSON.parse(result3).t;
      console.log("token3 = " + token3);
    } else {
      console.log("HTTP error 3: " + response2.status);
      return "error: " + error;
    }

    await delay(1000);

    while (rs !== "ready") {
      // обработать когда последняя строчка пусатя
      let response4 = await fetch(
        "https://egrul.nalog.ru/vyp-status/" + token3,
        { method: "GET" }
      );
      if (response4.ok) {
        let result4 = await response4.text();
        rs = JSON.parse(result4).status;
        console.log("result status = " + rs);
      } else {
        console.log("HTTP error 4: " + response2.status);
        return "error: " + error;
      }
    }

    await delay(1000);

    let response5 = await fetch(
      "https://egrul.nalog.ru/vyp-download/" + token3,
      { method: "GET" }
    );
    if (response5.ok) {
      let result5 = await response5.arrayBuffer();
      fs.writeFileSync("./pdf/" + token3 + ".pdf", new Buffer(result5));
      fileList.push(token3);
      console.log("fileName = " + token3);
      return "downloaded: " + token3 + ".pdf";
    } else {
      console.log("HTTP error 5: " + response2.status);
      return "HTTP error 5: " + response2.status;
    }
  } catch (error) {
    console.log("error", error);
    return "error: " + error;
  }
};

handlePDF.addEventListener("click", async () => {
  item = '5F8DA8D56110EB8B47D9D372781B1B7F27F92726AEA5AC2444EAEF68EDB499428BC5D35E46CCA883C28D8E3CD1197F85547E69A8E36C6AEEF2DC11D73BADA47B';

  const pdf = require('electron').remote.require('pdf-parse');
 
  let dataBuffer = fs.readFileSync("./pdf/" + item + ".pdf");
   
  pdf(dataBuffer).then(function(data) {
   
      // number of pages
      console.log(data.numpages);
      // number of rendered pages
      console.log(data.numrender);
      // PDF info
      console.log(data.info);
      // PDF metadata
      console.log(data.metadata); 
      // PDF.js version
      // check https://mozilla.github.io/pdf.js/getting_started/
      console.log(data.version);
      // PDF text
      console.log(data.text); 
          
  });
});
