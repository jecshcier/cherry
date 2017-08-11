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
let downloadNum = 0;

const appEvent = {
    appListener: () => {
        // post请求

        ipc.on('httpPost', function(event, data) {
            request.post({
                url: config.serverUrl + data.url,
                body: data.data,
                json: true
            }, function optionalCallback(err, httpResponse, body) {
                if (err) {
                    return console.error('error:', err)
                }
                console.log(body)
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
                    let download_id = downloadNum;
                    // 文件重命名
                    fileAutoRename(dirPath, filePath, itemName, 0, (newFilePath) => {
                        let writerStream = fs.createWriteStream(newFilePath)
                        writerStream.on('error', (err) => {
                            let stopObj = {
                                'id': download_id,
                                'itemName': itemName,
                                'message': "文件写入失败"
                            }
                            win.webContents.send('downloadFailed', JSON.stringify(stopObj));
                        });
                        let fileSize = 0;
                        let startObj = {
                            'id': download_id,
                            'itemName': itemName,
                            "message": "开始下载"
                        }
                        win.webContents.send('downloadStart', JSON.stringify(startObj));
                        request(itemUrl, (error, response, body) => {
                            if (!error) {
                                let successObj = {
                                    'id': download_id,
                                    'itemName': itemName,
                                    'message': "下载成功"
                                }
                                win.webContents.send('downloadSuccess', JSON.stringify(successObj));
                            } else {
                                let stopObj = {
                                    'id': download_id,
                                    'itemName': itemName,
                                    'message': "网络连接失败"
                                }
                                win.webContents.send('downloadFailed', JSON.stringify(stopObj));
                            }
                            writerStream.end();
                        }).on('data', (data) => {
                            // decompressed data as it is received
                            writerStream.write(data);
                            fileSize += data.length;
                            let progress = fileSize / itemSize
                            let progressObj = {
                                'id': download_id,
                                'progress': progress
                            }
                            win.webContents.send('downloadProgress', JSON.stringify(progressObj));
                        })
                    })
                } else {
                    console.log("用户取消下载")
                }
                downloadNum++;
            })
        })

        // 上传文件监听

        ipc.on('uploadFiles', function(event, data) {
            dialog.showOpenDialog({
                properties: ['openFile', 'multiSelections']
            }, (files) => {
                if (files) {
                    let upload_id = downloadNum;
                    let fileWholeSize = 0;
                    let uploadUrl = data.url
                    delete data.url
                    let fileArr = [];
                    files.forEach((el, index) => {
                        console.log(index);
                        console.log(el);
                        let fileObj = fs.statSync(el)
                        console.log(fileObj.size);
                        fileWholeSize += fileObj.size
                        fileArr.push(fs.createReadStream(files[index]))
                    })
                    data.upload_file = fileArr[0]
                    let timer;
                    let startObj = {
                        'id': upload_id,
                        'message': '开始上传'
                    }
                    win.webContents.send('uploadStart', JSON.stringify(startObj));
                    console.log("上传中...");
                    let requestObj = request.post({
                        url: uploadUrl,
                        formData: data
                    }, function optionalCallback(err, httpResponse, body) {
                        if (err) {
                            let failObj = {
                                'id': upload_id,
                                'message': '上传失败'
                            }
                            win.webContents.send('uploadFailed', JSON.stringify(failObj));
                            return console.error('upload failed:', err);
                        }
                        console.log('上传ok');
                        // clearInterval(timer);
                        let successObj = {
                            'id': upload_id,
                            'message': '上传成功'
                        }
                        win.webContents.send('uploadSuccess', JSON.stringify(successObj));
                    }).on('drain', (data) => {
                        console.log(requestObj.req.connection._bytesDispatched)
                        console.log(fileWholeSize)
                        console.log(requestObj.req.connection._httpMessage._headers['content-length'])
                        let progress = requestObj.req.connection._bytesDispatched / fileWholeSize;
                        let progressObj = {
                            'id': upload_id,
                            'progress': progress
                        }
                        win.webContents.send('uploadProgress', JSON.stringify(progressObj));
                        console.log(progress)
                    })

                } else {
                    console.log("用户取消了上传");
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
