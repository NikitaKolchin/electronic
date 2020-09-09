const electron = require("electron");
const ipcRenderer = require("electron").ipcRenderer;
let crypto = require("crypto");
let fs = require("fs");
let fileList = [];
let jsonList = [];

const handleFile = document.getElementById("handle");
const handlePDF = document.getElementById("pdf");
const deletePDF = document.getElementById("delete");
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
      let fileName = crypto.createHash("md5").update(token3).digest("hex");
      makeDirIfNotExist("./pdf/");
      makeDirIfNotExist("./output/"); 
      fs.writeFileSync("./pdf/" + fileName + ".pdf", new Buffer(result5));
      fileList.push(fileName);
      console.log("fileName = " + fileName);
      return "downloaded: " + fileName + ".pdf";
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
  const today = formatDate(new Date());
  for (const item of fileList) {
    const pdf = require("electron").remote.require("pdf-parse");

    let dataBuffer = fs.readFileSync("./pdf/" + item + ".pdf");

    const data = await pdf(dataBuffer);
    const text = data.text;
    // console.log(data.text);
    const egrulItem = {
      Name: getPlaneSubstrByKeys(
        text,
        "Наименование",
        "Сокращенное наименование",
        "ГРН и дата внесения в ЕГРЮЛ записи,"
      ).replace(/\n/g, " "),
      Inn: getPlaneSubstrByKeys(
        text,
        "Сведения об учете в налоговом органе",
        "ИНН",
        "КПП"
      )
        .replace(/\n/g, " ")
        .substring(0, 10),
      Region: getRegion(text).replace(/\n/g, " "),
      TerminationMethod: getPlaneSubstrByKeys(
        text,
        "Сведения о прекращении",
        "Способ прекращения",
        "Дата прекращения"
      ).replace(/\n/g, " "), //Сведения о прекращении. Способ прекращения
      TerminationDate: getPlaneSubstrByKeys(
        text,
        "Сведения о прекращении",
        "Дата прекращения",
        "Наименование органа, внесшего запись о"
      ).replace(/\n/g, " "), //Сведения о прекращении. Дата прекращения
      AdditionalInformationArr: getAdditionalInformation(text), //Сведения о недостоверности  - Дополнительная информация
      ULStateDecision: getPlaneSubstrByKeys(
        text,
        "Сведения о состоянии юридического лица",
        "Состояние",
        "Дата принятия решения о предстоящем"
      ).replace(/\n/g, " "), //Сведения о состоянии ЮЛ. Принято решение о прекращении
      ULStateDecisionDate: getPlaneSubstrByKeys(
        text,
        "Сведения о состоянии юридического лица",
        "Дата принятия решения о предстоящем\nисключении недействующего\nюридического лица из ЕГРЮЛ",
        "Сведения о публикации решения о"
      ).replace(/\n/g, " "), //Сведения о состоянии ЮЛ. Дата принятия решения
      ULStateDecisionPublic: getULStateDecisionPublic(text).replace(/\n/g, " "), //Сведения о состоянии ЮЛ. Сведения о публикации решения
      ULStateProcessInfo: getULStateProcess(text, "Info").replace(/\n/g, " "), //Сведения о состоянии ЮЛ. Находится в стадии ликвидации
      ULStateProcessGrnNo: getULStateProcess(text, "GrnNo").replace(/\n/g, " "), //Сведения о состоянии ЮЛ. Номер ГРН внесения в ЕГРЮЛ
      ULStateProcessGrnDate: getULStateProcess(text, "GrnDate").replace(
        /\n/g,
        " "
      ), //Сведения о состоянии ЮЛ. Дата ГРН
      StatementGrnInfo: getStatement(text).grnInfo.replace(/\n/g, " "), //Предоствлены документы в связи с исключением юридического лица из ЕГРЮЛ - номер ГРН
      StatementGrnDate: getStatement(text).grnDate.replace(/\n/g, " "), //Предоствлены документы в связи с исключением юридического лица из ЕГРЮЛ - дата ГРН
      UpdateDate: today,
    };

    jsonList.push(egrulItem);
    //   console.log(egrulItem);
  }
  let json = await JSON.stringify(jsonList);
  console.log(json);
  fs.writeFile("./output/output"+today+".json", json, (error) => {
    if (error) throw error; // если возникла ошибка
    alert("запись файла завершена");
  });
});

const getPlaneSubstrByKeys = (text, chapterKey, startKey, endKey) => {
  const indexOfChapterKey = text.indexOf(chapterKey);
  const indexOfEndOfChapterKey = indexOfChapterKey + chapterKey.length;
  const indexOfStartKey = text.indexOf(startKey, indexOfEndOfChapterKey);
  const indexOfEndOfStartKey = indexOfStartKey + startKey.length;
  if (indexOfStartKey === -1 || indexOfChapterKey === -1)
    return "Данные отсутствуют";
  else return getPlaneSubstrByIndexes(text, indexOfEndOfStartKey, endKey);
};

const getPlaneSubstrByIndexes = (text, indexOfEndOfStartKey, endKey) => {
  let indexOfEndKey;
  switch (endKey) {
    case null:
      const indexOfTown = text.indexOf(
        "Город (волость и т.п.)",
        indexOfEndOfStartKey
      );
      const indexOfDistrict = text.indexOf(
        "Район (улус и т.п.)",
        indexOfEndOfStartKey
      );

      if (indexOfDistrict === -1) {
        indexOfEndKey = indexOfTown;
      } else if (indexOfTown === -1) {
        indexOfEndKey = indexOfDistrict;
      } else {
        indexOfEndKey = indexOfDistrict;
      }
      break;
    case "":
      indexOfEndKey = indexOfEndOfStartKey + 24;
      break;
    default:
      indexOfEndKey = text.indexOf(endKey, indexOfEndOfStartKey);
  }
  const indexOfEndOfString = text.indexOf("\n", indexOfEndKey - 4);
  if (indexOfEndKey === -1) return "Данные отсутствуют";
  else return text.substring(indexOfEndOfStartKey, indexOfEndOfString).trim();
};

const getRegion = (text) => {
  const candidate = getPlaneSubstrByKeys(
    text,
    "Адрес (место нахождения)",
    "Субъект Российской Федерации",
    null
  );
  let region;
  if (candidate.toUpperCase().indexOf("САРАТОВСКАЯ") !== -1) {
    region = "ОБЛАСТЬ САРАТОВСКАЯ";
  } else if (candidate.toUpperCase().indexOf("МАРИЙ") !== -1) {
    region = "РЕСПУБЛИКА МАРИЙ ЭЛ";
  } else if (candidate.toUpperCase().indexOf("ТАТАРСТАН") !== -1) {
    region = "РЕСПУБЛИКА ТАТАРСТАН";
  } else if (candidate.toUpperCase().indexOf("ЧУВАШ") !== -1) {
    region = "ЧУВАШСКАЯ РЕСПУБЛИКА";
  } else if (candidate.toUpperCase().indexOf("НИЖЕГОРОДСКАЯ") !== -1) {
    region = "ОБЛАСТЬ НИЖЕГОРОДСКАЯ";
  } else if (candidate.toUpperCase().indexOf("САМАРСКАЯ") !== -1) {
    region = "ОБЛАСТЬ САМАРСКАЯ";
  } else if (candidate.toUpperCase().indexOf("УДМУРТСКАЯ") !== -1) {
    region = "УДМУРТСКАЯ РЕСПУБЛИКА";
  } else if (candidate.toUpperCase().indexOf("УЛЬЯНОВСКАЯ") !== -1) {
    region = "ОБЛАСТЬ УЛЬЯНОВСКАЯ";
  } else if (candidate.toUpperCase().indexOf("КИРОВСКАЯ") !== -1) {
    region = "ОБЛАСТЬ КИРОВСКАЯ";
  } else if (candidate.toUpperCase().indexOf("ПЕНЗЕНСКАЯ") !== -1) {
    region = "ОБЛАСТЬ ПЕНЗЕНСКАЯ";
  } else if (candidate.toUpperCase().indexOf("МОРДОВИЯ") !== -1) {
    region = "РЕСПУБЛИКА МОРДОВИЯ";
  } else {
    region = "РЕГИОН НЕ ОПРЕЛЕЛЕН";
  }
  return region;
};

const getAdditionalInformation = (text) => {
  let addInf = [];
  let matches = text.matchAll(/Дополнительные сведения/g);
  matches = Array.from(matches);
  matches.forEach((element) => {
    let elementIndex = element.index + "Дополнительные сведения".length;
    let nameOfGrnItem = getPlaneSubstrByIndexes(
      text,
      elementIndex,
      "ГРН и дата внесения в ЕГРЮЛ записи,"
    ).replace(/\n/g, " ");
    let grnIndex =
      elementIndex +
      nameOfGrnItem.length +
      "ГРН и дата внесения в ЕГРЮЛ записи, \nсодержащей указанные сведения"
        .length +
      4;
    let grnArr = getPlaneSubstrByIndexes(text, grnIndex, "").split("\n");
    let grnItem = {
      name: nameOfGrnItem,
      grnInfo: grnArr[0],
      grnDate: grnArr[1],
    };
    addInf.push(grnItem);
  });
  return addInf;
};

const getULStateDecisionPublic = (text) => {
  return (
    getPlaneSubstrByKeys(
      text,
      "Сведения о состоянии юридического лица",
      "Сведения о публикации решения о",
      "едстоящем исключении недействующего"
    ) +
    (getPlaneSubstrByKeys(
      text,
      "Сведения о состоянии юридического лица",
      "предстоящем исключении недействующего",
      "идического лица из ЕГРЮЛ в журнале"
    ) === "Данные отсутствуют"
      ? ""
      : getPlaneSubstrByKeys(
          text,
          "Сведения о состоянии юридического лица",
          "предстоящем исключении недействующего",
          "идического лица из ЕГРЮЛ в журнале"
        )) +
    (getPlaneSubstrByKeys(
      text,
      "Сведения о состоянии юридического лица",
      "юридического лица из ЕГРЮЛ в журнале",
      "естник государственной регистрации»"
    ) === "Данные отсутствуют"
      ? ""
      : getPlaneSubstrByKeys(
          text,
          "Сведения о состоянии юридического лица",
          "юридического лица из ЕГРЮЛ в журнале",
          "естник государственной регистрации»"
        )) +
    (getPlaneSubstrByKeys(
      text,
      "Сведения о состоянии юридического лица",
      "«Вестник государственной регистрации»",
      "ГРН и дата внесения в ЕГРЮЛ записи,"
    ) === "Данные отсутствуют"
      ? ""
      : getPlaneSubstrByKeys(
          text,
          "Сведения о состоянии юридического лица",
          "«Вестник государственной регистрации»",
          "ГРН и дата внесения в ЕГРЮЛ записи,"
        ))
  );
};

const getULStateProcess = (text, suff) => {
  const uLStateDecision = getPlaneSubstrByKeys(
    text,
    "Сведения о состоянии юридического лица",
    "Состояние",
    "Дата принятия решения о предстоящем"
  );
  if (uLStateDecision !== "Данные отсутствуют") return "Данные отсутствуют";
  let grn = getPlaneSubstrByKeys(
    text,
    "Сведения о состоянии юридического лица",
    "содержащей указанные сведения",
    ""
  ).split("\n");

  if (grn.length > 1) {
    switch (suff) {
      case "Info":
        return getPlaneSubstrByKeys(
          text,
          "Сведения о состоянии юридического лица",
          "Состояние",
          "ГРН и дата внесения в ЕГРЮЛ записи,"
        );
      case "GrnNo":
        return grn[0];
      case "GrnDate":
        return grn[1];
    }
  } else return "Данные отсутствуют";
};

const getStatement = (text) => {
  let matches = text.matchAll(
    /Представление заявления лицом, чьи права\nи законные интересы затрагиваются в связи\nс исключением юридического лица из\nЕГРЮЛ/g
  );
  let grnItem;
  matches = Array.from(matches);
  if (matches.length > 0) {
    let match = matches[matches.length - 1];
    let indexOfEndKey = match.index;
    grnItem = {
      name: match.value,
      grnInfo: text.substring(indexOfEndKey - 59, indexOfEndKey - 46).trim(),
      grnDate: text.substring(indexOfEndKey - 45, indexOfEndKey - 35).trim(),
    };
  } else {
    grnItem = {
      name: "Данные отсутствуют",
      grnInfo: "Данные отсутствуют",
      grnDate: "Данные отсутствуют",
    };
  }

  return grnItem;
};

function formatDate(d) {
  var month = "" + (d.getMonth() + 1),
    day = "" + d.getDate(),
    year = d.getFullYear();

  if (month.length < 2) month = "0" + month;
  if (day.length < 2) day = "0" + day;

  return [day, month, year].join(".");
}

const makeDirIfNotExist = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
};

deletePDF.addEventListener("click", async () => {

  const dir = "./pdf";
  
  // delete directory recursively
  fs.rmdir(dir, { recursive: true }, (err) => {
      if (err) {
          throw err;
      }
      alert(`Каталог ${dir} удалён!`);
      console.log(`${dir} is deleted!`);
  });
});

// private GrnInformation GetStatement()
// {
//     GrnInformation grnInformation;
//     Regex regex = new Regex("Представление заявления лицом, чьи права\nи законные интересы затрагиваются в связи\nс исключением юридического лица из\nЕГРЮЛ");
//     MatchCollection matches = regex.Matches(Text);
//     if (matches.Count > 0)
//     {
//         Match match = matches[matches.Count - 1];
//         int indexOfEndtKey = match.Index;
//         grnInformation.name = match.Value;
//         grnInformation.grnInfo = Text.Substring(indexOfEndtKey - 61, 13).Trim();
//         grnInformation.grnDate = Text.Substring(indexOfEndtKey - 47, 10).Trim();
//     }
//     else
//     {
//         grnInformation.name = grnInformation.grnInfo = grnInformation.grnDate = "Данные отсутствуют";
//     }
//     return grnInformation;

// }
