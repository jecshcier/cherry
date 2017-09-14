/************************
 * 渲染进程监听器              *
 * author: Shayne C     *
 * createTime: 2017.4.5 *
 * updateTime: 2017.8.29 *
 ************************/
const ipc = require('electron').ipcMain
const app = require('electron').app
const dialog = require('electron').dialog
const path = require('path')
const config = require(path.resolve(__dirname, '../../app/config'));
const request = require('request')
const fs = require('fs-extra')
const querystring = require('querystring');
const sqlite3 = require('sqlite3').verbose();
// const db = new sqlite3.Database(path.resolve(__dirname, '../../app/' + config.dbUrl));
// const uuid = require('uuid')
// const moment = require('moment');
const child = require('child_process')
const download_process = path.resolve(__dirname, './download.js')
const upload_process = path.resolve(__dirname, './upload.js')
const downloadPath = path.resolve(__dirname, '../../app/' + config.downloadPath)
const QRCode = require('qrcode')
const archiver = require('archiver');


const appEvent = {
    appListener: () => {

        // post请求,json

        ipc.on('httpPost', function (event, data) {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            request.post({
                url: data.url,
                body: data.data,
                json: true
            }, function optionalCallback(err, httpResponse, body) {
                if (err) {
                    info.message = err
                    event.sender.send(data.callback, info);
                    return console.error('error:', err)
                }
                info.flag = true
                info.message = "请求成功"
                info.data = body
                info = JSON.stringify(info)
                event.sender.send(data.callback, info);
            });
        })

        // post请求 - form模式
        ipc.on('httpPost_form', function (event, data) {
            console.log(data)
            let info = {
                flag: false,
                message: '',
                data: null
            }
            request.post({
                url: data.url,
                form: data.data
            }, function optionalCallback(err, httpResponse, body) {
                if (err) {
                    info.message = err
                    event.sender.send(data.callback, info);
                    return console.error('error:', err)
                }
                info.flag = true
                info.message = "请求成功"
                info.data = body
                info = JSON.stringify(info)
                event.sender.send(data.callback, info);
            });
        })

        // get请求
        ipc.on('httpGet', function (event, data) {
            console.log(data.data)
            let info = {
                flag: false,
                message: '',
                data: null
            }
            request.get({
                url: data.url,
                qs: data.data
            }, function optionalCallback(err, httpResponse, body) {
                if (err) {
                    info.message = err;
                    event.sender.send(data.callback, info);
                    return console.error('error:', err)
                }
                info.flag = true
                info.message = "请求成功"
                info.data = body
                info = JSON.stringify(info)
                event.sender.send(data.callback, info);
            });
        })

        // 查找文件是否存在
        ipc.on('fileIsExsit', (event, data) => {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            let filePath
            try {
                filePath = path.normalize(data.filePath)
            } catch (e) {
                info.flag = false
                info.message = "文件路径有误"
                event.sender.send(data.callback, JSON.stringify(info));
                return false
            }
            fs.pathExists(filePath).then((exists) => {
                if (exists) {
                    info.flag = true
                    info.message = "文件已存在"
                    event.sender.send(data.callback, JSON.stringify(info));
                } else {
                    info.flag = false
                    info.message = "文件不存在"
                    event.sender.send(data.callback, JSON.stringify(info));
                }
            })
        })

        //删除进程
        ipc.on('killProcess', (event, data) => {
            "use strict";
            let info = {
                flag: false,
                message: '',
                data: null
            }
            try {
                process.kill(data.pid)
            } catch (e) {
                console.log(e)
                info.message = "错误！"
                event.sender.send(data.callback, JSON.stringify(info));
                return;
            }
            info.message = "成功！"
            event.sender.send(data.callback, JSON.stringify(info));
        })

        //删除文件夹
        ipc.on('deleteDir', (event, data) => {
            "use strict";
            let info = {
                flag: false,
                message: '',
                data: null
            }
            let dirPath
            try {
                dirPath = path.normalize(data.dirPath)
            } catch (e) {
                info.message = "删除失败" + e
                event.sender.send(data.callback, JSON.stringify(info));
            }
            fs.emptyDir(dirPath).then(() => {
                return fs.rmdir(dirPath)
            }, (err) => {
                info.message = "删除失败" + err
                event.sender.send(data.callback, JSON.stringify(info));
            }).then(() => {
                info.flag = true
                info.message = "删除成功"
                event.sender.send(data.callback, JSON.stringify(info));
            }, (err) => {
                info.message = "删除失败" + err
                event.sender.send(data.callback, JSON.stringify(info));
            })
        })

        //获取配置文件的服务器地址
        ipc.on('getServerUrl', (event, data) => {
            "use strict";
            let info = {
                flag: true,
                message: '',
                data: null
            }
            info.message = "成功！"
            info.data = config.serverUrl
            event.sender.send(data.callback, JSON.stringify(info));
        })

        //创建二维码
        ipc.on('createQRcode', (event, data) => {
            let string = data.data.string
            let outputDir = data.data.outputDir
            let fileName = data.data.fileName
            let options = data.data.options
            let filePath = path.normalize(outputDir + '/' + fileName)
            let info = {
                flag: false,
                message: '',
                data: null
            }
            QRCode.toFile(filePath, string, options, function (err) {
                if (err) {
                    console.log(err)
                    info.message = "失败！"
                    event.sender.send(data.callback, JSON.stringify(info));
                }
                else {
                    console.log('done')
                    info.message = "成功！"
                    event.sender.send(data.callback, JSON.stringify(info));
                }
            })
        })

        //获取文件夹路径
        ipc.on('chooseDir', (event, data) => {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            dialog.showOpenDialog({
                'properties': ['openDirectory', 'createDirectory']
            }, (dirPath) => {
                if (dirPath) {
                    info.flag = true
                    info.message = "成功！"
                    info.data = dirPath[0]
                    event.sender.send(data.callback, JSON.stringify(info));
                }
            })
        })

        //获取文件路径队列
        ipc.on('chooseFiles', (event, data) => {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            dialog.showOpenDialog({
                'properties': ['openFile', 'multiSelections']
            }, (filePath) => {
                if (filePath) {
                    info.flag = true
                    info.message = "成功！"
                    info.data = filePath
                    event.sender.send(data.callback, JSON.stringify(info));
                }
            })
        })

        //获取文件夹下所有文件
        ipc.on('getFolderFiles', (event, data) => {
            let dirPath = data.dirPath
            let info = {
                flag: false,
                message: '',
                data: null
            }
            fs.readdir(dirPath, function (err, files) {
                if (err) {
                    info.message = "错误！==>" + err
                    event.sender.send(data.callback, JSON.stringify(info));
                }
                let filesArr = []
                files.forEach(function (filename, index) {
                    let truePath = path.join(dirPath, filename);
                    fs.stat(truePath, function (err, stats) {
                        if (err) {
                            return false
                            info.message = "错误！==>" + err
                            event.sender.send(data.callback, JSON.stringify(info))
                        }
                        //文件
                        if (stats.isFile()) {
                            filesArr.push({
                                fileName: filename,
                                path: truePath,
                                stats: stats
                            })
                        } else if (stats.isDirectory()) {

                        }

                        if (index === files.length - 1) {
                            info.flag = true
                            info.message = "成功！"
                            info.data = filesArr
                            console.log(filesArr)
                            event.sender.send(data.callback, JSON.stringify(info));
                        }
                    });
                });

            })

        })

        //打开文件
        ipc.on('openFile', (event, data) => {
            let info = {
                flag: false,
                message: '',
                data: null
            }
            let url = data.fileUrl
            url = path.normalize(url)
            fs.pathExists(url).then((exists) => {
                "use strict";
                if (!exists) {
                    info.flag = false
                    info.message = "文件路径不存在"
                    event.sender.send(data.callback, JSON.stringify(info));
                    return false;
                }
            })
            let p;
            if (process.platform !== "darwin") {
                url = '"' + url + '"'
                p = child.exec('start "" ' + url, (error, stdout, stderr) => {
                    if (error) {
                        console.log(error)
                        info.flag = false
                        info.message = "错误！ ->" + error
                        event.sender.send(data.callback, JSON.stringify(info));
                    }
                });
            }
            else {
                p = child.execFile('open', [url], (error, stdout, stderr) => {
                    if (error) {
                        console.log(error)
                        info.flag = false
                        info.message = "错误！ ->" + error
                        event.sender.send(data.callback, JSON.stringify(info));
                    }
                    console.log(stdout);
                });
            }
            p.on('close', (code) => {
                "use strict";
                console.log('线程结束标识：' + code)
                if (!code) {
                    info.flag = true
                    info.message = "打开成功"
                    event.sender.send(data.callback, JSON.stringify(info));
                }
            })
        })

        // 主动下载文件监听
        ipc.on('downloadFile', function (event, data) {
            let p = child.fork(download_process, [], {})

            p.on('message', function (m) {
                console.log(m)
                if (m.flag === "start") {
                    let startObj = {
                        'id': p.pid,
                        'itemName': m.itemName,
                        'message': m.message
                    }
                    event.sender.send('downloadStart', JSON.stringify(startObj));
                }
                else if (m.flag === "fail") {
                    let stopObj = {
                        'id': p.pid,
                        'itemName': m.itemName,
                        'message': m.message
                    }
                    event.sender.send('downloadFailed', JSON.stringify(stopObj));
                }
                else if (m.flag === "success") {
                    let successObj = {
                        'id': p.pid,
                        'itemName': m.itemName,
                        'message': m.message
                    }
                    event.sender.send('downloadSuccess', JSON.stringify(successObj))
                }
                else if (m.flag === "progress") {
                    let progressObj = {
                        'id': p.pid,
                        'progress': m.data
                    }
                    event.sender.send('downloadProgress', JSON.stringify(progressObj));
                }
            })

            p.on('close', (code) => {
                console.log("process EXIT code:" + code)
            })

            if (!data.url) {
                return false;
            }
            if (data.dialog) {
                dialog.showOpenDialog({
                    'properties': ['openDirectory', 'createDirectory']
                }, (dirPath) => {
                    if (dirPath) {
                        p.send({
                            type: 1,
                            url: data.url,
                            newName: data.newName,
                            dirPath: dirPath[0]
                        })
                    } else {
                        console.log("用户取消下载")
                    }
                })
            } else {
                p.send({
                    type: 1,
                    url: data.url,
                    newName: data.newName,
                    dirPath: downloadPath
                })
            }
            // 设置下载路径
        })

        // 上传文件监听
        ipc.on('uploadFiles', function (event, data) {

            let p = child.fork(upload_process, [], {})

            p.on('message', function (m) {
                if (m.flag === "start") {
                    let startObj = {
                        'id': p.pid,
                        'message': m.message
                    }
                    event.sender.send('uploadStart', JSON.stringify(startObj));
                }
                else if (m.flag === "fail") {
                    let stopObj = {
                        'id': p.pid,
                        'message': m.message
                    }
                    event.sender.send('uploadFailed', JSON.stringify(stopObj));
                }
                else if (m.flag === "success") {
                    let successObj = {
                        'id': p.pid,
                        'message': m.message,
                        'data': m.data
                    }
                    event.sender.send('uploadSuccess', JSON.stringify(successObj))
                }
                else if (m.flag === "progress") {
                    let progressObj = {
                        'id': p.pid,
                        'progress': m.data
                    }
                    event.sender.send('uploadProgress', JSON.stringify(progressObj));
                }
            })

            p.on('close', (code) => {
                console.log("process EXIT code:" + code)
            })
            dialog.showOpenDialog({
                properties: ['openFile', 'multiSelections']
            }, (files) => {
                if (files) {
                    p.send({
                        data: data,
                        files: files
                    })
                } else {
                    console.log("用户取消了上传");
                }
            })
        })

        ipc.on('zipFile', (event, data) => {
            let dir = data.dirPath
            dialog.showOpenDialog({
                'properties': ['openDirectory', 'createDirectory']
            }, (dirPath) => {

                let outPath = path.normalize(dirPath + '/' + '66666.zip')
                let output = fs.createWriteStream(outPath);
                let archive = archiver('zip', {
                    zlib: { level: 9 } // Sets the compression level.
                });
                output.on('close', function () {
                    console.log(archive.pointer() + ' total bytes');
                    console.log('archiver has been finalized and the output file descriptor has closed.');
                });
                archive.on('warning', function (err) {
                    if (err.code === 'ENOENT') {
                        // log warning
                    } else {
                        // throw error
                        throw err;
                    }
                });

                // good practice to catch this error explicitly
                archive.on('error', function (err) {
                    throw err;
                });

                // pipe archive data to the file
                archive.pipe(output);
                archive.directory(dir, false);
                archive.finalize();
                console.log("ok")
            })
        })

    },
    windowListener: (win) => { // 程序最小化

        ipc.on('minimize', function (event) {
            win.minimize()
            console.log("ok")
        })

        // 程序最大化

        ipc.on('Maximization', function (event) {
            win.maximize()
        })

        // 退出程序
        ipc.on('exit', function (event) {
            app.quit();
        })

        // 全屏
        ipc.on('fullscreen', function (event) {
            if (!win.isFullScreen()) {
                win.setFullScreen(true)
            } else {
                win.setFullScreen(false)
            }
        })

        // 开发者工具
        ipc.on('developTools', function (event) {
            win.webContents.toggleDevTools()

        })

        // 监听window默认下载事件
        win.webContents.session.on('will-download', (event, item, webContents) => {
            event.preventDefault();
            let itemName = item.getFilename();
            let itemUrl = item.getURL();
            let itemSize = item.getTotalBytes();

            let p = child.fork(download_process, [], {})

            p.on('message', function (m) {
                console.log(m)
                if (m.flag === "start") {
                    let startObj = {
                        'id': p.pid,
                        'itemName': itemName,
                        'message': m.message
                    }
                    win.webContents.send('downloadStart', JSON.stringify(startObj));
                }
                else if (m.flag === "fail") {
                    let stopObj = {
                        'id': p.pid,
                        'itemName': itemName,
                        'message': m.message
                    }
                    win.webContents.send('downloadFailed', JSON.stringify(stopObj));
                }
                else if (m.flag === "success") {
                    let successObj = {
                        'id': p.pid,
                        'itemName': itemName,
                        'message': m.message
                    }
                    win.webContents.send('downloadSuccess', JSON.stringify(successObj))
                }
                else if (m.flag === "progress") {
                    let progressObj = {
                        'id': p.pid,
                        'progress': m.data
                    }
                    win.webContents.send('downloadProgress', JSON.stringify(progressObj));
                }
            })

            p.on('close', (code) => {
                console.log("process EXIT code:" + code)
            })

            // 设置下载路径
            dialog.showOpenDialog({
                'properties': ['openDirectory', 'createDirectory']
            }, (dirPath) => {
                if (dirPath) {
                    let filePath = path.normalize(dirPath[0] + '/' + itemName);
                    p.send({
                        type: 0,
                        itemUrl: itemUrl,
                        dirPath: dirPath,
                        filePath: filePath,
                        itemName: itemName,
                        itemSize: itemSize
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

module.exports = appEvent
