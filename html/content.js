// jQuery 文档: http://api.jquery.com/
// 三态复选框: https://css-tricks.com/indeterminate-checkboxes/
// Flex 布局教程: http://www.ruanyifeng.com/blog/2015/07/flex-examples.html

$(function () {
  // 读取目录
  $('.btn-load-dir').click(function () {
    native.chooseDir().then(dir => {
      if (!dir) return
      showProgressBar('正在扫描文件夹，请稍候……')
      renderDirNode({ fullpath: dir, title: dir, isDir: true, size: 0 }, $('#tree').empty(), true)
      .then(() => {
        showProgressBar(false)
      })
    })
  })

  // 读取记录
  $('.btn-load-json').click(function () {
    native.loadJsonFile().then(recs => {
      if (recs && recs[0]) {
        showProgressBar('正在读取记录文件，请稍候……')
        setTimeout(function() {
          renderDirRec(recs[0], $('#tree').empty(), true)
          showProgressBar(false)
        }, 100)
      }
    })
  })

  // 保存记录
  $('.btn-save-json').click(function () {
    var recs = collectRecs($('#tree'))
    native.saveJsonFile(recs)
  })

  // 点击 checkbox（勾选文件）
  $('.tree').delegate('.node .cb', 'change', onCheckboxChange)

  // 点击 title（展开/折叠目录）
  $('.tree').delegate('.node.dir .title', 'click', onTitleClick)

  // 右键点击 title
  $('.tree').delegate('.node .title', 'contextmenu', onContextMenu)
})

function collectRecs(container) {
  var recs = []
  container.children('.node').each(function () {
    var node = $(this)
    var item = node.data('data-item')
    var rec = {
      isDir: item.isDir,
      title: item.title,
      size: item.size
    }
    if (item.isDir) {
      rec.subs = collectRecs(node.data('target-div'))
    } else {
      rec.checked = node.children('.cb').prop('checked')
    }
    recs.push(rec)
  })
  return recs
}

function renderDirRec(rec, container, isRoot) {
  var item = {
    title: rec.title,
    isDir: true,
    size: rec.size,
    selectedSize: 0
  }
  var cb = $('<input type="checkbox">').addClass('cb').prop('checked', true)
  var title = $('<div></div>').addClass('title').text(item.title)
  var size = $('<div></div>').addClass('size').text('?')
  var dir = $('<div></div>').addClass('node dir').append(cb).append(title).append(size).appendTo(container)
  var subs = $('<div></div>').addClass('dir-subs').text('loading...').appendTo(container)
  if (isRoot) {
    dir.addClass('root expanded')
  } else {
    subs.css('display', 'none')
  }

  dir.data('data-item', item)

  // 建立 handle-target 联系
  dir.data('target-div', subs)
  subs.data('handle-div', dir)

  subs.empty()
  for (var subrec of rec.subs) {
    if (subrec.isDir) {
      item.selectedSize += renderDirRec(subrec, subs)
    } else {
      item.selectedSize += renderFileRec(subrec, subs)
    }
  }
  size.text(numberWithComma(item.selectedSize))
  if (item.selectedSize == 0) {
    cb.prop('checked', false).prop('indeterminate', false)
  } else if (item.selectedSize < item.size) {
    cb.prop('checked', true).prop('indeterminate', true)
  }
  return item.selectedSize
}

function renderFileRec(rec, container) {
  var item = {
    title: rec.title,
    isDir: false,
    selectedSize: rec.size,
    size: rec.size
  }
  var cb = $('<input type="checkbox">').addClass('cb').prop('checked', rec.checked)
  var title = $('<div></div>').addClass('title').text(item.title)
  var size = $('<div></div>').addClass('size').text(numberWithComma(item.size))
  var file = $('<div></div>').addClass('node file').append(cb).append(title).append(size).appendTo(container)
  file.data('data-item', item)
  return rec.checked ? item.size : 0
}

function renderDirNode(item, container, isRoot) {
  var cb = $('<input type="checkbox">').addClass('cb').prop('checked', true)
  var title = $('<div></div>').addClass('title').text(item.title)
  var size = $('<div></div>').addClass('size').text('?')
  var dir = $('<div></div>').addClass('node dir').append(cb).append(title).append(size).appendTo(container)
  var subs = $('<div></div>').addClass('dir-subs').text('loading...').appendTo(container)
  if (isRoot) {
    dir.addClass('root expanded')
  } else {
    subs.css('display', 'none')
  }

  dir.data('data-item', item)

  // 建立 handle-target 联系
  dir.data('target-div', subs)
  subs.data('handle-div', dir)

  return native.listDir(item.fullpath).then(function (list) {
    subs.empty()
    var total = 0
    var ps = []
    for (var subitem of list) {
      if (subitem.isDir) {
        var p = renderDirNode(subitem, subs)
        p.then(sz => {
          total += sz
        })
        ps.push(p)
      } else {
        total += renderFileNode(subitem, subs)
      }
    }
    return Promise.all(ps).then(() => {
      item.size = total
      item.selectedSize = total
      size.text(numberWithComma(item.selectedSize))
      return total
    })
  })
}

function renderFileNode(item, container) {
  var cb = $('<input type="checkbox">').addClass('cb').prop('checked', true)
  var title = $('<div></div>').addClass('title').text(item.title)
  var size = $('<div></div>').addClass('size').text(numberWithComma(item.size))
  var file = $('<div></div>').addClass('node file').append(cb).append(title).append(size).appendTo(container)
  item.selectedSize = item.size
  file.data('data-item', item)
  return item.size
}

function numberWithComma(n) {
  var n = '' + n
  var sep = ''
  var str = ''
  while (n.length > 0) {
    str = n.substr(-3) + sep + str
    sep = ','
    n = n.substr(0, n.length - 3)
  }
  return str
}

function onCheckboxChange() {
  var handle = $(this).parent()
  var overall_checked = $(this).prop('checked')

  $(this).prop('indeterminate', false)

  // 设置下游所有 checkbox 的勾选状态与本节点相同
  if (handle.is('.dir')) {
    handle.data('target-div').find('.node .cb')
      .prop('checked', overall_checked)
      .prop('indeterminate', false)
      .each(function () {
        var node = $(this).parent()
        var item = node.data('data-item')
        if (item.isDir) {
          item.selectedSize = overall_checked ? item.size : 0
          node.children('.size').text(numberWithComma(item.selectedSize))
        }
      })
    var item = handle.data('data-item')
    item.selectedSize = overall_checked ? item.size : 0
    handle.children('.size').text(numberWithComma(item.selectedSize))
  }

  // 更新上游所有 checkbox 的勾选状态
  handle = handle.parent('.dir-subs').data('handle-div')
  while (handle && handle.length > 0) {
    var checked = 0
    var unchecked = 0
    var selectedSize = 0
    var indeterminate = false
    var target = handle.data('target-div')
    target.children('.node').each(function () {
      var item = $(this).data('data-item')
      var cb = $(this).children('.cb')
      if (cb.prop('checked')) {
        selectedSize += item.selectedSize
        checked++
        if (cb.prop('indeterminate')) {
          indeterminate = true
        }
      } else {
        unchecked++
      }
    })
    handle.children('.cb').prop('checked', checked > 0).prop('indeterminate', indeterminate || (checked > 0 && unchecked > 0))
    overall_checked = (checked > 0)
    var item = handle.data('data-item')
    item.selectedSize = selectedSize
    handle.children('.size').text(numberWithComma(item.selectedSize))

    // 上溯
    handle = handle.parent('.dir-subs').data('handle-div')
  }
}

function onTitleClick() {
  var handle = $(this).parent()
  var target = handle.data('target-div')
  if (handle.is('.expanded')) {
    target.css('display', 'none')
    handle.removeClass('expanded')
  } else {
    target.css('display', 'block')
    handle.addClass('expanded')
  }
}

function onContextMenu() {
  var path = []
  var node = $(this).parent()
  while (node) {
    var item = node.data('data-item')
    path.unshift(item.title)
    node = node.parent('.dir-subs').data('handle-div')
  }
  native.showContextMenu(path.join('\\'))
}

function showProgressBar(msg) {
  var mask = $('#progress-mask')
  if (!msg) {
    mask.css('display', 'none').children('.msg').text('')
    return
  }
  mask.css('display', 'flex').children('.msg').text(msg)
}
