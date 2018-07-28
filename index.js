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
const path = require('path')
const fs = require('fs')

let running = false

let recentResults = []

export function provideLinter() {
  return {
    name: 'elm-analyse',
    scope: 'project',
    lintsOnChange: true,
    grammarScopes: ['source.elm'],
    lint(textEditor) {
      if (running) {
        return recentResults
      } else {
        const cwd = atom.project.getPaths()[0]
        return new Promise(function(resolve, reject) {
          running = true
          child_process.exec('elm-analyse --format=json', {cwd: cwd, env: process.env}, function(error, stdout, stderr) {
            if (error) {
              try {
                const result = JSON.parse(lastline(stdout.toString()))
                const nestedLintMessages = result.messages.map(function(m) { return formatResult(m, cwd) })
                const lintMessages = [].concat(...nestedLintMessages)
                resolveWithMutableState(resolve, lintMessages)
              } catch (e) {
                atom.notifications.addError("linter-elm-analyse", {
                  description: stdout.toString(),
                  dismissable: true,
                  stack: e.stack
                })
                resolveWithMutableState(resolve, [], false)
              }
            } else {
              resolveWithMutableState(resolve, [])
            }
          })
        })
      }
    }
  }
}

function lastline(stdout) {
  const lines = stdout.trim().split("\n")
  return lines[lines.length - 1]
}

function formatResult({file, type, data}, cwd) {
  if (data.properties.range) {
    const [l1, c1, l2, c2] = data.properties.range
    return [ singleMessage(type, file, data.description, data.properties, [[l1, c1], [l2, c2]], cwd) ]
  } else if (data.properties.ranges) {
    const ranges = data.properties.ranges
    return duplicateByRanges(type, file, data.description, data.properties, ranges, cwd)
  } else if (data.properties.range1 && data.properties.range2) {
    const [l11, c11, l12, c12] = data.properties.range1
    const [l21, c21, l22, c22] = data.properties.range2
    return [
      singleMessage(type, file, data.description, data.properties, [[l11, c11], [l12, c12]], cwd),
      singleMessage(type, file, data.description, data.properties, [[l21, c21], [l22, c22]], cwd)
    ]
  } else {
    // Fall back to the origin; could not find line-column pairs. Logging for improvement
    console.log('[linter-elm-analyse] Could not parse line-column pairs:')
    console.dir(data)
    return [ singleMessage(type, file, data.description, data.properties, [[0, 0], [0, 0]], cwd) ]
  }
}

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

function resolveWithMutableState(resolve, results, updateRecent = true) {
  running = false
  if (updateRecent) {
    recentResults = results
  }
  resolve(results)
}
