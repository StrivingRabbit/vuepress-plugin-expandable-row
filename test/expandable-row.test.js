const assert = require('assert')
const MarkdownIt = require('markdown-it')
const expandableRow = require('../lib/expandable-row')

function render(markdown, options = {}) {
  const md = new MarkdownIt()
  md.use(expandableRow.markdownIt, options)
  return md.render(markdown)
}

function count(content, search) {
  return content.split(search).length - 1
}

const parentTable = `|A|B|
|:-|:-|
|a|b|`

const tests = [
  {
    name: 'converts marked rows into a child table',
    run() {
      const html = render(`${parentTable}
@|C|D|
@|:-|:-|
@|c|d|`)

      assert.ok(html.includes('<table class="have-children-table">'))
      assert.ok(html.includes('<tr class="have-children-tr">'))
      assert.ok(html.includes('<tr class="children-table-tr">'))
      assert.ok(html.includes('<table class="children-table">'))
      assert.ok(html.includes('colspan="2"'))
    },
  },
  {
    name: 'preserves flag characters in child table data',
    run() {
      const html = render(`${parentTable}
@|C|D|
@|:-|:-|
@|mail@example.com|@click|
@|@|value@domain|`)

      assert.ok(html.includes('mail@example.com'))
      assert.ok(html.includes('@click'))
      assert.ok(html.includes('<td style="text-align:left">@</td>'))
      assert.ok(html.includes('value@domain'))
    },
  },
  {
    name: 'only recognizes flags in the first column',
    run() {
      const html = render(`|A|B|
|:-|:-|
|a|@|
|c|@|
|e|@|`)

      assert.strictEqual(count(html, 'children-table'), 0)
      assert.strictEqual(count(html, '>@</td>'), 3)
    },
  },
  {
    name: 'supports flags containing regular expression characters',
    run() {
      const html = render(
        `${parentTable}
*|C|D|
*|:-|:-|
*|c|d|`,
        { flag: '*' }
      )

      assert.ok(html.includes('<table class="children-table">'))
    },
  },
  {
    name: 'supports nested child tables',
    run() {
      const html = render(`${parentTable}
@|C|D|
@|:-|:-|
@|c|d|
@@|E|F|
@@|:-|:-|
@@|e|f|`)

      assert.strictEqual(count(html, '<table'), 3)
      assert.ok(html.includes('class="have-children-table children-table"'))
    },
  },
  {
    name: 'supports multiple child tables in one parent table',
    run() {
      const html = render(`${parentTable}
@|C|D|
@|:-|:-|
@|c|d|
|x|y|
@|E|F|
@|:-|:-|
@|e|f|`)

      assert.strictEqual(count(html, '<table class="children-table">'), 2)
      assert.strictEqual(count(html, '<tr class="have-children-tr">'), 2)
    },
  },
  {
    name: 'supports multiple expandable tables in one document',
    run() {
      const childRows = `@|C|D|
@|:-|:-|
@|c|d|`
      const html = render(`${parentTable}
${childRows}

paragraph

|E|F|
|:-|:-|
|e|f|
${childRows}`)

      assert.strictEqual(count(html, '<table class="have-children-table">'), 2)
      assert.strictEqual(count(html, '<table class="children-table">'), 2)
    },
  },
  {
    name: 'preserves markdown content in child table cells',
    run() {
      const html = render(`${parentTable}
@|C|D|
@|:-|:-|
@|[link](https://example.com)|**bold** and ~~deleted~~|
@|union|string \\| null|`)

      assert.ok(html.includes('<a href="https://example.com">link</a>'))
      assert.ok(html.includes('<strong>bold</strong> and <s>deleted</s>'))
      assert.ok(html.includes('string | null'))
    },
  },
  {
    name: 'leaves marked rows unchanged when there is no parent row',
    run() {
      const html = render(`|A|B|
|:-|:-|
@|C|D|
@|:-|:-|
@|c|d|`)

      assert.strictEqual(count(html, 'children-table'), 0)
      assert.ok(!html.includes('</th class='))
    },
  },
  {
    name: 'does not create a child table from invalid table markdown',
    run() {
      const html = render(`${parentTable}
@|C|D|
@|not-separator|bad|
@|c|d|`)

      assert.strictEqual(count(html, 'children-table'), 0)
      assert.ok(!html.includes('<p class="children-table">'))
    },
  },
  {
    name: 'preserves CompatibilityTable JSON through nested table reparsing',
    run() {
      const data = {
        headers: [{ title: 'Web' }, { title: 'WeChat' }, { title: 'Alipay' }, { title: 'Android' }, { title: 'iOS' }, { title: 'HarmonyOS' }],
        rows: [['4.0', '4.41', '5.31', '4.25', '4.25', '4.61']],
        status: 'SUPPORTED',
      }
      for (const mode of ['', ' mode="table"']) {
        const component = `<CompatibilityTable${mode} table='${JSON.stringify(data)}' />`
        for (const [depth, rawTable] of [[1, false], [2, false], [3, false], [1, true], [2, true], [3, true]]) {
          const md = new MarkdownIt({ html: true })
          if (rawTable) md.use(require('markdown-it-raw-table'))
          md.use(expandableRow.markdownIt)
          const nested = Array.from({ length: depth }, (_, index) => {
            const marker = '@'.repeat(index + 1)
            const cell = index === depth - 1 ? component : 'object'
            return `${marker}|Name|Compatibility|\n${marker}|:-|:-|\n${marker}|value|${cell}|`
          }).join('\n')
          const html = md.render(`${parentTable}\n${nested}`)
          assert.strictEqual(count(html, '<tr class="children-table-tr">'), depth, `depth=${depth}, rawTable=${rawTable}`)
          const payload = html.match(/<CompatibilityTable\b[\s\S]*?table='([^']*)'/)
          assert.ok(payload, `depth=${depth}, rawTable=${rawTable}, mode=${mode}`)
          assert.deepStrictEqual(JSON.parse(payload[1]), data)
          assert.ok(html.includes(component))
        }
      }
    },
  },
  {
    name: 'preserves encoded attributes and legitimate JSON escapes in compatibility cells',
    run() {
      const data = {
        headers: [{ title: 'Android(VDOM)', group: 'Android', subtitle: 'VDOM' }],
        rows: [[String.raw`C:\folder\file`, '"quote"\nnext', 'text | value', '<a href="/x?a=1&b=2">x</a>']],
        status: 'PARTIALLY_SUPPORTED',
      }
      const attribute = JSON.stringify(data).replace(/&/g, '&amp;').replace(/'/g, '&#39;')
        .replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\|/g, '&#124;')
      const component = `<CompatibilityTable mode="table" table='${attribute}' />`
      const md = new MarkdownIt({ html: true }).use(expandableRow.markdownIt)
      const html = md.render(`${parentTable}\n@|Name|Compatibility|\n@|:-|:-|\n@|value|${component}|`)
      assert.ok(html.includes(component))
    },
  },
  {
    name: 'never normalizes compatibility fragments mixed with other cell content',
    run() {
      const data = { headers: [{ title: 'Web' }], rows: [[String.raw`C:\folder\file`, '"quote"\nnext']], status: 'SUPPORTED' }
      const component = `<CompatibilityTable table='${JSON.stringify(data)}' />`
      for (const cell of [`before ${component} after`, `<span>${component}</span>`, `${component}<br/>${component}`]) {
        for (const rawTable of ['none', 'before', 'after']) {
          const md = new MarkdownIt({ html: true })
          if (rawTable === 'before') md.use(require('markdown-it-raw-table'))
          md.use(expandableRow.markdownIt)
          if (rawTable === 'after') md.use(require('markdown-it-raw-table'))
          const html = md.render(`${parentTable}\n@|C|D|\n@|:-|:-|\n@|object|value|\n@@|Name|Compatibility|\n@@|:-|:-|\n@@|value|${cell}|`)
          assert.strictEqual(count(html, '<tr class="children-table-tr">'), 2)
          assert.strictEqual(count(html, component), count(cell, component))
          for (const match of html.matchAll(/<CompatibilityTable\b[\s\S]*?table='([^']*)'/g)) {
            assert.deepStrictEqual(JSON.parse(match[1]), data)
          }
        }
      }
    },
  },
  {
    name: 'keeps the registered raw-table parser for every table and subsequent render',
    run() {
      const md = new MarkdownIt({ html: true }).use(require('markdown-it-raw-table'))
      const rule = md.block.ruler.__rules__[md.block.ruler.__find__('raw-table')]
      const original = rule.fn
      const customParser = (state, startLine, endLine, silent) => {
        const start = state.tokens.length
        const matched = original(state, startLine, endLine, silent)
        if (matched && !silent) {
          state.tokens.slice(start).filter(token => token.type === 'table_open')
            .forEach(token => token.attrSet('data-parser', 'custom'))
        }
        return matched
      }
      md.block.ruler.at('raw-table', customParser)
      md.use(expandableRow.markdownIt)
      const source = `${parentTable}\n@|C|D|\n@|:-|:-|\n@|c|d|\n\n${parentTable}`
      for (let index = 0; index < 2; index++) {
        const html = md.render(source)
        assert.strictEqual(count(html, 'data-parser="custom"'), 3)
        assert.ok(md.block.ruler.getRules('').includes(customParser))
      }
    },
  },
  {
    name: 'silent table detection leaves existing table tokens untouched',
    run() {
      const md = new MarkdownIt({ html: true }).use(require('markdown-it-raw-table')).use(expandableRow.markdownIt)
      const state = new md.block.State('probe', md, {}, [])
      const existing = new MarkdownIt().parse(`${parentTable}\n@|C|D|\n@|:-|:-|\n@|c|d|`, {})
      state.tokens = existing
      const snapshot = JSON.stringify(existing)
      md.block.ruler.at('raw-table', () => true)
      const rule = md.block.ruler.__rules__[md.block.ruler.__find__('subtable')].fn
      assert.strictEqual(rule(state, 0, 1, true), true)
      assert.strictEqual(JSON.stringify(existing), snapshot)
    },
  },
  {
    name: 'does not invoke an explicitly disabled raw-table parser',
    run() {
      const md = new MarkdownIt({ html: true }).use(require('markdown-it-raw-table'))
      md.block.ruler.at('raw-table', () => { throw new Error('disabled raw-table parser was invoked') })
      md.block.ruler.disable('raw-table')
      md.use(expandableRow.markdownIt)
      const html = md.render(`${parentTable}\n@|C|D|\n@|:-|:-|\n@|c|d|`)
      assert.ok(html.includes('<table class="children-table">'))
      assert.strictEqual(md.block.ruler.__rules__[md.block.ruler.__find__('raw-table')].enabled, false)
    },
  },
  {
    name: 'rejects an empty flag',
    run() {
      assert.throws(() => render(parentTable, { flag: '' }), /flag must be a non-empty string/)
    },
  },
]

let failed = 0
tests.forEach(test => {
  try {
    test.run()
    console.log(`ok - ${test.name}`)
  } catch (error) {
    failed++
    console.error(`not ok - ${test.name}`)
    console.error(error.stack)
  }
})

if (failed) {
  process.exitCode = 1
} else {
  console.log(`${tests.length} tests passed`)
}
