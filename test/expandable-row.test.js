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
