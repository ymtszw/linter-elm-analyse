'use babel'

export const config =
  {}

export function activate() {
  // Do nothing currently
}

export function deactivate() {
  // Do nothing currently
}


const child_process = require('child_process')
export function provideLinter() {
  return {
    name: 'elm-analyse',
    scope: 'project',
    lintsOnChange: true,
    grammarScopes: ['source.elm'],
    lint(textEditor) {
      const editorPath = textEditor.getPath()
      const cwd = atom.project.getPaths()[0]

      // Do something async
      return new Promise(function(resolve, reject) {
        child_process.exec('elm-analyse --format=json', {cwd: cwd, env: process.env}, function(error, stdout, stderr) {
          if (error) {
            try {
              const result = JSON.parse(stdout.toString())
              const nestedLintMessages = result.messages.map(function(m) { return formatResult(m, cwd) })
              const lintMessages = [].concat(...nestedLintMessages)
              resolve(lintMessages)
            } catch (e) {
              console.error(e)
              reject(stdout.toString())
            }
          } else {
            resolve([])
          }
        })
      })
    }
  }
}

function formatResult({file, type, data}, cwd) {
  if (data.properties.range) {
    const [l1, c1, l2, c2] = data.properties.range
    return [ singleMessage(type, file, data.description, data.properties, [[l1, c1], [l2, c2]], cwd) ]
  } else if (data.properties.ranges) {
    const ranges = data.properties.ranges
    return duplicateByRanges(type, file, data.description, data.properties, ranges, cwd)
  } else {
    return [ singleMessage(type, file, data.description, data.properties, [[0, 0], [0, 0]], cwd) ]
  }
}

const path = require('path')
function singleMessage(type, file, desc, props, range, cwd) {
  return {
    severity: 'warning',
    excerpt: `${desc} (${type})`,
    url: `https://stil4m.github.io/elm-analyse/#/messages/${type}`,
    location: {
      file: path.join(cwd, file),
      position: range
    }
  }
}

function duplicateByRanges(type, file, desc, ranges, cwd) {
  ranges.map(function([l1, c1, l2, c2]) { singleMessage(type, file, desc, [[l1, c1], [l2, c2]], cwd) })
}
