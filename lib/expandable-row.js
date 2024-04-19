function normalizeMD(md) {
  if (typeof md === 'string') {
    return md
      .replace(/(?<!\\)<(?!br\/{0,1}>)/g, '\\<')
      .replace(/]([^(])|(?<!\\)]$/g, '\\]$1')
      .replace(/(?<!\\)\|/g, '\\|')
  }
  return md
}

function uniqueAttrJoin(token, name, value) {
  const prevTokenValue = token.attrGet(name)
  const isClass = name === 'class'
  const hasClassValue = isClass && new RegExp(`(\\s|^)${value}\\b`).test(prevTokenValue)
  if (!(prevTokenValue && hasClassValue && prevTokenValue.includes(value))) {
    token.attrJoin(name, value)
  }
}

function resolveSubtable(md, tokens = [], tokenIndexes = [], flag) {
  if (tokens.length && tokenIndexes.length) {
    // 1 为 flag @（标识符） 的列，需要去掉
    const FlagColumnCount = 1
    // 2 table token 新行开始时固定的 tr_open td_open 数量
    const TableTROpenTDOpenTokenCount = 2
    // 3 每个 inline 都会伴随一个 td_close、td_open（行最后一列 inline 会伴随 td_close tr_close）
    const InlineTDCloseTDOpenTokenCount = 3

    tokenIndexes.forEach(tokenIndex => {
      if (Array.isArray(tokenIndex) && tokenIndex.length > 2) {
        const tableOpenIndex = tokenIndex.shift()
        const tableCloseIndex = tokenIndex.pop()
        let deleteOffset = 0

        tokenIndex.forEach(subtableIndexes => {
          const subtableOpenIndex = subtableIndexes.shift() + deleteOffset
          // const subtableColumnCount = (subtableIndexes[0] + deleteOffset - subtableOpenIndex - TableTROpenTDOpenTokenCount) / InlineTDCloseTDOpenTokenCount - FlagColumnCount; // 子 table 列数
          let subtableCloseIndex = subtableIndexes.pop() + deleteOffset
          for (let index = subtableCloseIndex; index < tableCloseIndex; index++) {
            const token = tokens[index]
            if (token.type === 'tr_close') {
              subtableCloseIndex = index - TableTROpenTDOpenTokenCount
              break
            }
          }
          const subtableTokens = tokens.slice(subtableOpenIndex - 1, subtableCloseIndex + 1)
          let tableColumnCount = 0 // 父 table 列数
          for (let i = tableOpenIndex; i < tableCloseIndex; i++) {
            const token = tokens[i]
            if (i < subtableOpenIndex) {
              if (token.type === 'th_open') {
                tableColumnCount++
              } else if (token.type === 'thead_close') {
                break
              }
            }
          }

          let subtableMD = subtableTokens
            .map(token => {
              if (token.type === 'inline' && (!flag.includes(token.content) || token.content === '')) {
                return normalizeMD(token.content.replace(flag, ''))
              } else if (token.type === 'tr_close') {
                return '\n'
              }
            })
            .filter(i => typeof i !== 'undefined')
          const subtableLevel = subtableTokens[0].level
          const newTokens = md.parse(`|${subtableMD.join('|')}|`)
          newTokens.forEach(token => {
            token.content = '' // 和 children 内容重复
            token.level = token.level + subtableLevel
          })
          uniqueAttrJoin(newTokens[0], 'class', 'children-table')
          const childrenTableTokenIndex = subtableOpenIndex - TableTROpenTDOpenTokenCount
          const subtablePrevTrOpenIndex =
            childrenTableTokenIndex - tableColumnCount * InlineTDCloseTDOpenTokenCount - TableTROpenTDOpenTokenCount
          uniqueAttrJoin(tokens[tableOpenIndex], 'class', 'have-children-table') // table
          uniqueAttrJoin(tokens[subtablePrevTrOpenIndex], 'class', 'have-children-tr') // table tr_open

          // table td_open
          const haveChildrenTrTdToken = tokens[subtablePrevTrOpenIndex + 1]
          uniqueAttrJoin(haveChildrenTrTdToken, 'class', 'have-children-tr-td')
          uniqueAttrJoin(haveChildrenTrTdToken, 'style', ';text-wrap: nowrap')

          uniqueAttrJoin(tokens[childrenTableTokenIndex], 'class', 'children-table-tr') // subtable tr_open

          uniqueAttrJoin(tokens[subtableOpenIndex - 1], 'colspan', tableColumnCount) // subtable td_open
          const deleteCount = subtableCloseIndex - subtableOpenIndex + 1
          tokens.splice(subtableOpenIndex, deleteCount, ...newTokens)
          deleteOffset = deleteOffset + newTokens.length - deleteCount
        })
      }
    })
  }
}

function process(md, tokens, flag) {
  const subtableMinTokenCount = 3
  if (
    Array.isArray(tokens) &&
    tokens.length &&
    tokens.some(token => token.content.includes(flag) && token.type === 'inline')
  ) {
    const tableOpenTokenIndex = tokens.findIndex(token => token.type === 'table_open')
    if (tableOpenTokenIndex > -1) {
      /**
       * [
       * 	table_open index,
       * 	[] // subtable indexes,
       * 	table_close index
       * ]
       */
      let tableTokensIndexes = [[]]
      let tableIndex = 0
      let subtableIndex = 1
      tokens.forEach((token, index) => {
        if (token.type === 'table_open' && tableTokensIndexes[tableIndex].length === 0) {
          tableTokensIndexes[tableIndex].push(index)
        }
        if (tableTokensIndexes[tableIndex] && typeof tableTokensIndexes[tableIndex][0] !== 'undefined') {
          if (token.type === 'inline') {
            if (new RegExp(`^\\s*(${flag})+\\s*$`).test(token.content)) {
              ;(
                tableTokensIndexes[tableIndex][subtableIndex] || (tableTokensIndexes[tableIndex][subtableIndex] = [])
              ).push(index)
            } else if (tokens[index - 2].type === 'tr_open') {
              tableTokensIndexes[tableIndex][++subtableIndex] = []
            }
          }
        }
        if (token.type === 'table_close') {
          subtableIndex = 1
          tableTokensIndexes[tableIndex].push(index)
          tableTokensIndexes[++tableIndex] = []
        }
      })
      tableTokensIndexes.forEach((subtableTokensIndex, index) => {
        tableTokensIndexes[index] = subtableTokensIndex.filter(
          i => typeof i === 'number' || (Array.isArray(i) && i.length >= subtableMinTokenCount)
        )
      })
      tableTokensIndexes = tableTokensIndexes.filter(i => i.length)
      if (tableTokensIndexes.length) {
        resolveSubtable(md, tokens, tableTokensIndexes, flag)
      }
    }
  }
}

module.exports = {
  process,
  markdownIt: function subTablePlugin(md, options = {}) {
    const { flag = '@' } = options
    md.block.ruler.before('table', 'subtable', (state, startLine, endLine, silent) => {
      let plugin
      let pluginName = md.block.ruler.disable('raw-table', true)[0]
      if (!pluginName) {
        md.block.ruler.disable('table', true)[0]
        plugin = require('markdown-it-raw-table/lib/table.js')
      } else if (pluginName) {
        const pluginIndex = md.block.ruler.__find__(pluginName)
        plugin = md.block.ruler.__rules__[pluginIndex].fn
      }
      if (plugin) {
        const pluginReturn = plugin(state, startLine, endLine, silent)
        if (pluginReturn) {
          process(md, state.tokens, flag)
        }
        return pluginReturn
      }
    })
  },
}
