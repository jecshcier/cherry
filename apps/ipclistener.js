/************************
 * 渲染进程监听器              *
 * author: Shayne C     *
 * createTime: 2017.4.5 *
 * updateTime: 2017.4.5 *
 ************************/

const ipc = require('electron').ipcMain
const app = require('electron').app
const dialog = require('electron').dialog
const config = require('../config')
const request = require('request')
const fs = require('fs-extra')
const path = require('path')

const appEvent = {
    appListener: () => {
        // post请求

        ipc.on('httpPost', function(event, data) {
            request.post({
                url: config.serverUrl + data.url,
                form: data.data
            }, function optionalCallback(err, httpResponse, body) {
                if (err) {
                    return console.error('error:', err)
                }
                event.sender.send(data.callback, body);
            });
        })

        // get请求

        ipc.on('httpGet', function(event, data) {
            request.get({
                url: config.serverUrl + data.url
            }, function optionalCallback(err, httpResponse, body) {
                if (err) {
                    return console.error('error:', err)
                }
                event.sender.send(data.callback, body);
            });
        })

    },
    windowListener: (win) => { // 程序最小化

        ipc.on('minimize', function(event) {
            win.minimize()
            console.log("ok")
        })

        // 程序最大化

        ipc.on('Maximization', function(event) {
            win.maximize()
        })

        // 退出程序
        ipc.on('exit', function(event) {
            app.quit();
        })

        // 全屏
        ipc.on('fullscreen', function(event) {
            if (!win.isFullScreen()) {
                win.setFullScreen(true)
            } else {
                win.setFullScreen(false)
            }
        })

        // 开发者工具
        ipc.on('developTools', function(event) {
            win.webContents.toggleDevTools()

        })

        // 监听下载事件
        win.webContents.session.on('will-download', (event, item, webContents) => {
            event.preventDefault();
            var itemName = item.getFilename();
            var itemUrl = item.getURL();
            var itemSize = item.getTotalBytes();
            // 设置下载路径
            dialog.showOpenDialog({
                'properties': ['openDirectory', 'createDirectory']
            }, (dirPath) => {
                if (dirPath) {
                    let filePath = path.resolve(__dirname, dirPath[0] + '/' + itemName);
                    fileAutoRename(dirPath, filePath, itemName, 0, (newFilePath) => {
                        let writerStream = fs.createWriteStream(newFilePath)
                        writerStream.on('error', (err) => {
                            win.webContents.send('downloadFailed','文件获取失败');
                        });
                        let fileSize = 0;
                        win.webContents.send('downloadStart');
                        request(itemUrl, (error, response, body) => {
                            if (!error) {
                                win.webContents.send('downloadSucess');
                            } else {
                                win.webContents.send('downloadFailed','网络连接失败');
                            }
                            writerStream.end();
                        }).on('data', (data) => {
                            // decompressed data as it is received
                            writerStream.write(data);
                            fileSize += data.length;
                            let progress = fileSize / itemSize
                            win.webContents.send('downloadProgress',progress);
                        })
                    })
                } else {
                    console.log("用户取消下载")
                }
            })
        })
    }
}

const fileDelete = (filePath) => {
    fs.ensureFile(filePath).then(() => {
        return fs.remove(filePath)
    }, (err) => {
        console.error(err)
    }).then(() => {
        console.log("删除成功");
    }, () => {
        console.log("删除失败");
    })
}

// 重名检测
const fileAutoRename = (dirPath, filePath, itemName, num, callback) => {
    if (!num) {
        num = 0;
    }
    fs.pathExists(filePath).then((exists) => {
        if (exists) {
            // console.log(filePath);
            num++;
            filePath = path.resolve(__dirname, dirPath + '/' + '(' + num + ')' + itemName)
            fileAutoRename(dirPath, filePath, itemName, num, callback);
        } else {
            if (callback) {
                callback(filePath)
            }
        }
    })
}

module.exports = appEvent
