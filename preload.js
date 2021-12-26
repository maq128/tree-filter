const { contextBridge } = require('electron')
const { readdir } = require('fs/promises')
const { lstatSync, readFileSync, writeFileSync } = require('fs')
const path = require('path')

contextBridge.exposeInMainWorld('native', {
  listDir: fullpath => readdir(fullpath, {withFileTypes:true}).then((dir) => {
    var list = []
    for (var item of dir) {
      var info = {
        fullpath: path.join(fullpath, item.name),
        title: item.name,
        isDir: item.isDirectory(),
        size: 0
      }
      if (item.isFile()) {
        var stat = lstatSync(info.fullpath)
        info.size = stat.size
      }
      list.push(info)
    }
    list.sort((a, b) => {
      if (a.isDir != b.isDir) {
        // 目录排在前面
        return a.isDir ? -1 : 1
      }
      return a.title < b.title ? -1 : 1
    })
    return list
  }),

  loadData: () => {
    var json = readFileSync('recs.json', {encoding:'utf-8'})
    var data = JSON.parse(json)
    return data
  },

  saveData: data => {
    writeFileSync('recs.json', JSON.stringify(data))
  }
})
