const path = require('path')
const fs = require('fs')
const { app, BrowserWindow, Menu, shell } = require('electron')
const { spawn } = require('child_process')
const appMenu = require('./menu')
const config = require('./config')
const pkg = require('./package')

require('electron-debug')()
require('electron-context-menu')()

const isDev = typeof process.env.NODE_ENV === 'string'
  ? (process.env.NODE_ENV === 'development')
  : require('electron-is-dev')

let mainWindow
let isQuitting = false
let cmd

// Set title of the app that will use shown in window titlebar
app.setName(pkg.productName)

const isAlreadyRunning = app.makeSingleInstance(() => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }

    mainWindow.show()
  }
})

if (isAlreadyRunning) {
  app.quit()
}

function createMainWindow() {
  const lastWindowState = config.get('lastWindowState')

  const win = new BrowserWindow({
    title: app.getName(),
    x: lastWindowState.x,
    y: lastWindowState.y,
    width: lastWindowState.width,
    height: lastWindowState.height,
    show: false
  })

  win.webContents.on('new-window', (e, url) => {
    e.preventDefault()
    shell.openExternal(url)
  })

  const RE = /Ready on http:\/\/localhost:(\d+)/

  cmd = spawn('vue', ['ui', '--headless'], {
    env: Object.assign({}, process.env, {
      PATH: require('shell-path').sync()
    })
  })
  cmd.stdout.on('data', chunk => {
    const str = chunk.toString()
    if (RE.test(str)) {
      const [, port] = RE.exec(str)
      win.loadURL(`http://localhost:${port}/project/select`)
      win.show()
    }
  })

  win.on('close', e => {
    if (!isQuitting) {
      e.preventDefault()

      if (process.platform === 'darwin') {
        app.hide()
      } else {
        win.hide()
      }
    }
  })

  return win
}

app.on('ready', () => {
  Menu.setApplicationMenu(appMenu)
  mainWindow = createMainWindow()
})

app.on('activate', () => {
  mainWindow.show()
})

app.on('before-quit', () => {
  isQuitting = true

  cmd && cmd.kill()
  if (!mainWindow.isFullScreen()) {
    config.set('lastWindowState', mainWindow.getBounds())
  }
})
