const { contextBridge, ipcRenderer } = require('electron')
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

  chooseDir: () => {
    return ipcRenderer.invoke('choose-dir-dialog')
  },

  loadJsonFile: () => {
    return ipcRenderer.invoke('load-file-dialog').then(file => {
      var data
      if (file) {
        var json = readFileSync(file, {encoding:'utf-8'})
        data = JSON.parse(json)
      }
      return data
    })
  },

  saveJsonFile: (data) => {
    return ipcRenderer.invoke('save-file-dialog').then(file => {
      if (file) {
        writeFileSync(file, JSON.stringify(data))
      }
    })
  },

  showContextMenu(txt) {
    ipcRenderer.send('show-context-menu', txt)
  }
})
