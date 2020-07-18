const { app, BrowserWindow, Menu, ipcMain } = require('electron') 
 
let win = null;
let menuTemplate = [
  {
      label: 'Файл',
      submenu: [
        {
          label: 'Загрузить данный из файла',
          click () 
          {
              win.webContents.send('menu', 'read-file');
          }
        },
        {type:'separator'},  
        {
            label:'Выход', 
            click() { 
                app.quit();
            } 
        }
      ]
  },
];


function createWindow () { 
  // Create the browser window. 
  win = new BrowserWindow({ 
    width: 800, 
    height: 600, 
    webPreferences: { 
      nodeIntegration: true
    } 
  }) 
  
  // Load the index.html of the app. 
  win.loadFile('src/index.html') 
  
  // Open the DevTools. 
  //win.webContents.openDevTools() 
} 
  
// This method will be called when Electron has finished 
// initialization and is ready to create browser windows. 
// Some APIs can only be used after this event occurs. 
// This method is equivalent to 'app.on('ready', function())' 
app.whenReady().then(createWindow);
  
// Quit when all windows are closed. 
app.on('window-all-closed', () => { 
  // On macOS it is common for applications and their menu bar 
  // To stay active until the user quits explicitly with Cmd + Q 
  if (process.platform !== 'darwin') { 
    app.quit() 
  } 
});
  
app.on('activate', () => { 
  // On macOS it's common to re-create a window in the   
  // app when the dock icon is clicked and there are no  
  // other windows open. 
  if (BrowserWindow.getAllWindows().length === 0) { 
    createWindow(); 
  } 
});

app.on('ready', () => { 

  let menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

});

  
// In this file, you can include the rest of your  
// app's specific main process code. You can also  
// put them in separate files and require them here.