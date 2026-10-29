export interface Labels {
  filter: string
  filterColumn: (column: string) => string
  filterActive: (column: string, selected: number, total: number) => string
  search: string
  selectAll: string
  selectNone: string
  resetColumn: string
  done: string
  close: string
  selected: (selected: number, total: number) => string
  emptyValue: string
  emptyHeader: (index: number) => string
  noMatches: string
  rows: (visible: number, total: number) => string
  noRows: string
  clearAll: string
  resetAllCommand: string
  group: string
}

const zh: Labels = {
  filter: "筛选",
  filterColumn: (column) => `筛选“${column}”`,
  filterActive: (column, selected, total) => `筛选“${column}”（已选 ${selected}/${total}）`,
  search: "搜索值…",
  selectAll: "全选",
  selectNone: "全不选",
  resetColumn: "重置",
  done: "完成",
  close: "关闭",
  selected: (selected, total) => `已选 ${selected} / ${total}`,
  emptyValue: "（空）",
  emptyHeader: (index) => `第 ${index} 列`,
  noMatches: "没有匹配的值",
  rows: (visible, total) => `显示 ${visible} / ${total} 行`,
  noRows: "没有符合筛选条件的行",
  clearAll: "清除全部筛选",
  resetAllCommand: "清除所有表格筛选",
  group: "表格",
}

const en: Labels = {
  filter: "Filter",
  filterColumn: (column) => `Filter “${column}”`,
  filterActive: (column, selected, total) => `Filter “${column}” (${selected}/${total} selected)`,
  search: "Search values…",
  selectAll: "Select all",
  selectNone: "Select none",
  resetColumn: "Reset",
  done: "Done",
  close: "Close",
  selected: (selected, total) => `${selected} of ${total} selected`,
  emptyValue: "(empty)",
  emptyHeader: (index) => `Column ${index}`,
  noMatches: "No matching values",
  rows: (visible, total) => `Showing ${visible} of ${total} rows`,
  noRows: "No rows match the current filters",
  clearAll: "Clear all filters",
  resetAllCommand: "Clear all table filters",
  group: "Table",
}

export function labelsFor(locale: string): Labels {
  return locale.toLowerCase().startsWith("zh") ? zh : en
}
