// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const electron = require('electron')
const shell = electron.shell
const app = electron.ipcRenderer
const BrowserWindow = electron.remote.BrowserWindow

onload = () => {
    let webview = document.getElementById('webview');
    webview.addEventListener('console-message', (e) => {
        console.log('Guest page logged a message:', e.message)
    })
    webview.addEventListener('new-window', function(e) {
        e.preventDefault();
        this.loadURL(e.url);
    });
}

const downloadSucess = (event, message) => {
    let obj = JSON.parse(message);
    let webview = document.getElementById('webview');
    webview.send('downloadSucess', message);
    console.log(obj.id + obj.message)
};
const downloadProgress = (event, message) => {
    let obj = JSON.parse(message);
    let webview = document.getElementById('webview');
    webview.send('downloadProgress', message);
    console.log("下载任务" + obj.id + ":" + obj.progress)
};
const downloadStart = (event, message) => {
    let obj = JSON.parse(message);
    let webview = document.getElementById('webview');
    webview.send('downloadStart', message);
    console.log(obj.id + obj.message)
};
const downloadFailed = (event, message) => {
    let obj = JSON.parse(message);
    let webview = document.getElementById('webview');
    webview.send('downloadFailed', message);
    console.log(obj.id + obj.message)
};


app.on('downloadProgress', downloadProgress)
app.on('downloadStart', downloadStart)
app.on('downloadSucess', downloadSucess)
app.on('downloadFailed', downloadFailed)
