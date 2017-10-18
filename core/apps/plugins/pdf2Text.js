const fs = require('fs-extra'),
    PDFParser = require("pdf2json");

const pdfParser = new PDFParser();
const path = require('path')
let info = {
    flag: false,
    message: "",
    data: null
}

let inputPath = ''
let outputPath = ''

process.on('message', (m) => {
    inputPath = m.inputPath
    outputPath = m.outputPath
    console.log(inputPath)
    console.log(outputPath)
    fs.readdir(inputPath).then((files) => {
        readPdf(files, 0, outputPath)
    }, (err) => {
        info.message = "文件读取失败:" + err
        process.send(info)
        process.exit(0)
    })
})



pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError));

function readPdf(fileArr, index, outputPath) {
    if(!fileArr[index])
    {
        if(!index){
            info.message = "目录下没有文件"
            process.send(info)
            process.exit(0)
        }
        else{
            info.message = "生成完成"
            info.flag = true
            process.send(info)
            process.exit(0)
        }
    }
    let pdfPath = path.normalize(inputPath + '/' + fileArr[index])
    console.log(pdfPath)
    let spArr = fileArr[index].split(".")
    let pos = spArr[spArr.length - 1]
    if (pos !== "pdf") {
        info.message = "后缀名不正确"
        process.send(info)
        process.exit(0)
    }
    let dirName = fileArr[index].replace(/.pdf/g, '')
    pdfParser.once("pdfParser_dataReady", pdfData => {
        // let data = pdfParser.getRawTextContent()
        // console.log(data)
        let bookList = []
        //获取所有页面
        let pages = pdfData['formImage'].Pages
        //遍历页面
        let savePath = path.normalize(outputPath + '/' + dirName)
        fs.ensureDir(savePath, (err) => {
            if (err) {
                info.message = "文件夹生成错误" + err
                process.send(info)
                process.exit(0)
            }
            for (let pNum in pdfData['formImage'].Pages) {
                bookList[pNum] = ''
                //当前页
                let currentPage = pages[pNum].Texts
                let currentY = 0;
                let temp = false
                for (let i = 0; i < currentPage.length; i++) {
                    let str = decodeURIComponent(currentPage[i].R[0].T)
                    let reg = new RegExp("[\\u4E00-\\u9FFF]+", "g");
                    let reg2 = /^[0-9]+.?[0-9]*$/;
                    if (!reg.test(str) || reg2.test(str)) {
                        if (!temp) {
                            bookList[pNum] += '   '
                            temp = true
                        }
                        continue;
                    }
                    temp = false
                    if (currentPage[i].y !== currentY && currentY !== 0) {
                        bookList[pNum] += '\n'
                    }
                    bookList[pNum] += str
                    currentY = currentPage[i].y
                }

                try {
                    fs.writeFileSync(path.normalize(savePath + '/' + pNum + '.txt'), bookList[pNum])
                }
                catch (e) {
                    info.message = "文件写入出错:" + e
                    process.send(info)
                    process.exit(0)
                }
                console.log("写入完成")
                console.log(pNum)
                console.log(pdfData['formImage'].Pages.length)
                if (parseInt(pNum) === pdfData['formImage'].Pages.length - 1) {
                    let num = index + 1;
                    console.log('test')
                    readPdf(fileArr, num, outputPath)
                }
            }
        })
        console.log(bookList)
        console.log(bookList.length)
        // fs.writeFile(exportPath, JSON.stringify(pdfData));
        // fs.writeFile(exportPath, JSON.stringify(pdfData));
    });
    pdfParser.loadPDF(pdfPath);
}