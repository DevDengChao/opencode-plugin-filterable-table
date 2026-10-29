import type { Labels } from "./labels"
import { openFilterPopover, type FilterPopoverHandle } from "./popover"

const WRAPPER_SELECTOR = '[data-component="markdown-table"]'
const TIMELINE_SELECTOR = '[data-slot="session-timeline-scroll"]'
const OWN_UI_ATTRIBUTE = "data-ft-ui"
const MAX_REMEMBERED_TABLES = 200

export interface FilterOption {
  value: string
  count: number
}

export interface FilterableTablesOptions {
  labels: () => Labels
  debug?: boolean
  scopeSelector?: string
  root?: Document | HTMLElement
}

export interface FilterableTablesController {
  scan(): void
  resetAll(): void
  dispose(): void
  count(): number
}

interface ColumnState {
  header: string
  selected: Set<string> | null
}

interface TableState {
  headers: string[]
  columns: ColumnState[]
}

interface RowSnapshot {
  row: HTMLTableRowElement
  values: string[]
}

interface TableModel {
  headers: string[]
  headerCells: HTMLTableCellElement[]
  rows: RowSnapshot[]
  options: FilterOption[][]
}

class StateStore {
  private readonly states = new Map<string, TableState>()

  get(key: string, headers: string[]): TableState | null {
    const saved = this.states.get(key)

    if (!saved || !sameStrings(saved.headers, headers)) return null

    this.states.delete(key)
    this.states.set(key, saved)

    return cloneState(saved)
  }

  set(key: string | null, state: TableState): void {
    if (!key) return

    if (!hasActiveFilters(state)) {
      this.states.delete(key)
      return
    }

    this.states.delete(key)
    this.states.set(key, cloneState(state))

    while (this.states.size > MAX_REMEMBERED_TABLES) {
      const oldest = this.states.keys().next().value

      if (oldest === undefined) break
      this.states.delete(oldest)
    }
  }

  clear(key: string | null): void {
    if (key) this.states.delete(key)
  }

  clearAll(): void {
    this.states.clear()
  }
}

export function installFilterableTables(options: FilterableTablesOptions): FilterableTablesController {
  const root = options.root ?? document
  const scopeSelector = options.scopeSelector ?? TIMELINE_SELECTOR
  const store = new StateStore()
  const controllers = new Map<HTMLElement, TableController>()
  const pending = new Set<TableController>()

  let disposed = false
  let scheduled = false
  let observer: MutationObserver | null = null

  function collectWrappers(): HTMLElement[] {
    if (root instanceof Document) {
      return Array.from(root.querySelectorAll<HTMLElement>(`${scopeSelector} ${WRAPPER_SELECTOR}`))
    }

    if (root.matches(scopeSelector)) {
      return Array.from(root.querySelectorAll<HTMLElement>(WRAPPER_SELECTOR))
    }

    const scope = root.closest(scopeSelector)
    if (scope) return Array.from(scope.querySelectorAll<HTMLElement>(WRAPPER_SELECTOR))

    return Array.from(root.querySelectorAll<HTMLElement>(`${scopeSelector} ${WRAPPER_SELECTOR}`))
  }

  function scan(): void {
    if (disposed) return

    const wrappers = collectWrappers()
    const seen = new Set<HTMLElement>()

    for (const wrapper of wrappers) {
      if (!wrapper.isConnected) continue

      const table = wrapper.querySelector<HTMLTableElement>(":scope > table") ?? wrapper.querySelector("table")
      if (!table) continue

      seen.add(wrapper)

      const existing = controllers.get(wrapper)
      if (existing) {
        if (existing.table === table) continue
        existing.dispose()
        controllers.delete(wrapper)
      }

      try {
        controllers.set(wrapper, new TableController(wrapper, table, options, store))
      } catch (error) {
        console.error("[filterable-table] failed to attach to table", error)
      }
    }

    for (const [wrapper, controller] of controllers) {
      if (seen.has(wrapper) && wrapper.isConnected) continue
      controller.dispose()
      controllers.delete(wrapper)
    }

    if (options.debug) {
      console.info(`[filterable-table] ${controllers.size} table(s) active`)
    }
  }

  function tick(): void {
    if (disposed) return

    for (const controller of pending) {
      if (!controller.isConnected()) continue

      try {
        controller.refresh()
      } catch (error) {
        console.error("[filterable-table] failed to refresh table", error)
      }
    }

    pending.clear()
    scan()
  }

  function schedule(): void {
    if (scheduled || disposed) return

    scheduled = true
    queueMicrotask(() => {
      scheduled = false
      tick()
    })
  }

  observer = new MutationObserver((records) => {
    let needScan = false

    for (const record of records) {
      if (isOwnMutation(record)) continue

      if (record.type === "characterData") {
        const wrapper = elementOf(record.target)?.closest<HTMLElement>(WRAPPER_SELECTOR)
        const controller = wrapper ? controllers.get(wrapper) : null
        if (controller) pending.add(controller)
        continue
      }

      if (record.type !== "childList") continue

      const nodes = [...record.addedNodes, ...record.removedNodes]

      for (const node of nodes) {
        if (!(node instanceof Element)) continue
        if (node.matches(WRAPPER_SELECTOR) || node.querySelector(WRAPPER_SELECTOR)) {
          needScan = true
          break
        }
      }

      const wrapper = elementOf(record.target)?.closest<HTMLElement>(WRAPPER_SELECTOR)
      if (!wrapper) continue

      const controller = controllers.get(wrapper)
      if (!controller) {
        needScan = true
        continue
      }

      const currentTable = wrapper.querySelector<HTMLTableElement>(":scope > table")
      if (currentTable && currentTable !== controller.table) {
        needScan = true
        continue
      }

      pending.add(controller)
    }

    if (needScan || pending.size > 0) schedule()
  })

  const observationTarget = root instanceof Document ? document.documentElement : root
  observer.observe(observationTarget, { childList: true, subtree: true, characterData: true })

  scan()

  if (options.debug) {
    console.info(`[filterable-table] installed for ${scopeSelector}`)
  }

  return {
    scan,
    resetAll() {
      for (const controller of controllers.values()) controller.resetAll()
      store.clearAll()
    },
    dispose() {
      if (disposed) return
      disposed = true
      observer?.disconnect()
      observer = null
      pending.clear()

      for (const controller of controllers.values()) controller.dispose()
      controllers.clear()
      store.clearAll()
    },
    count() {
      return controllers.size
    },
  }
}

class TableController {
  readonly wrapper: HTMLElement
  readonly table: HTMLTableElement

  private readonly options: FilterableTablesOptions
  private readonly store: StateStore
  private readonly key: string | null
  private readonly debug: boolean

  private state: TableState
  private model: TableModel | null = null
  private buttons: HTMLButtonElement[] = []
  private status: HTMLElement | null = null
  private popover: FilterPopoverHandle | null = null
  private openColumn: number | null = null
  private disposed = false

  constructor(wrapper: HTMLElement, table: HTMLTableElement, options: FilterableTablesOptions, store: StateStore) {
    this.wrapper = wrapper
    this.table = table
    this.options = options
    this.store = store
    this.key = stateKey(wrapper)
    this.debug = options.debug === true

    const model = readModel(table, this.labels())
    this.model = model
    this.state = this.restore(model.headers)

    this.decorate(model)
    this.refresh()

    if (this.debug) {
      console.info(`[filterable-table] attached table with ${model.headers.length} column(s) and ${model.rows.length} row(s)`)
    }
  }

  isConnected(): boolean {
    return !this.disposed && this.wrapper.isConnected && this.table.isConnected
  }

  refresh(): void {
    if (this.disposed || !this.isConnected()) return

    const model = readModel(this.table, this.labels())
    if (model.headers.length === 0) return

    if (!sameStrings(model.headers, this.state.headers)) {
      this.store.clear(this.key)
      this.state = emptyState(model.headers)
      this.decorate(model)
    } else if (this.needsDecoration(model)) {
      this.decorate(model)
    }

    this.model = model
    this.pruneState(model)
    this.store.set(this.key, this.state)
    this.updateButtons()
    const counts = this.applyFilters()

    if (this.popover && this.openColumn !== null) {
      const options = model.options[this.openColumn]
      const column = this.state.columns[this.openColumn]

      if (!options || !column) {
        this.popover.close(false)
      } else {
        this.popover.update({
          options,
          selected: column.selected,
          visibleRows: counts.visible,
          totalRows: counts.total,
        })
      }
    }
  }

  resetAll(): void {
    if (this.disposed) return

    for (const column of this.state.columns) column.selected = null
    this.store.clear(this.key)
    this.updateButtons()
    this.applyFilters()
    this.popover?.close(false)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true

    this.popover?.close(false)
    this.popover = null
    this.openColumn = null

    for (const button of this.buttons) button.remove()
    for (const cell of this.model?.headerCells ?? []) cell.removeAttribute("data-ft-header")
    this.buttons = []

    this.status?.remove()
    this.status = null

    for (const row of this.model?.rows ?? []) clearRowState(row.row)
  }

  private labels(): Labels {
    return this.options.labels()
  }

  private restore(headers: string[]): TableState {
    return (this.key ? this.store.get(this.key, headers) : null) ?? emptyState(headers)
  }

  private needsDecoration(model: TableModel): boolean {
    if (this.buttons.length !== model.headerCells.length) return true

    return this.buttons.some((button, index) => button.parentElement !== model.headerCells[index])
  }

  private decorate(model: TableModel): void {
    for (const button of this.buttons) button.remove()

    const labels = this.labels()
    const buttons: HTMLButtonElement[] = []

    model.headerCells.forEach((cell, index) => {
      const button = document.createElement("button")
      button.type = "button"
      button.className = "ft-trigger"
      button.dataset.ftUi = "trigger"
      button.dataset.column = String(index)
      button.setAttribute("aria-haspopup", "dialog")
      button.setAttribute("aria-expanded", "false")
      button.title = labels.filterColumn(model.headers[index])
      button.setAttribute("aria-label", labels.filterColumn(model.headers[index]))
      button.append(funnelIcon())
      button.addEventListener("pointerdown", (event) => event.stopPropagation())
      button.addEventListener("click", (event) => {
        event.preventDefault()
        event.stopPropagation()
        this.toggle(index, button)
      })

      cell.setAttribute("data-ft-header", "")
      cell.append(button)
      buttons.push(button)
    })

    this.buttons = buttons
  }

  private pruneState(model: TableModel): void {
    const columns: ColumnState[] = []

    for (let index = 0; index < model.headers.length; index++) {
      const header = model.headers[index]
      const current = this.state.columns[index]
      const column: ColumnState = current
        ? { header, selected: current.selected ? new Set(current.selected) : null }
        : { header, selected: null }
      const values = new Set(model.options[index].map((option) => option.value))

      if (column.selected) {
        for (const value of [...column.selected]) {
          if (!values.has(value)) column.selected.delete(value)
        }

        if (values.size === 0 || column.selected.size === values.size) column.selected = null
      }

      columns.push(column)
    }

    this.state = { headers: [...model.headers], columns }
  }

  private updateButtons(): void {
    if (this.disposed) return

    const labels = this.labels()
    const model = this.model
    if (!model) return

    this.buttons.forEach((button, index) => {
      const column = this.state.columns[index]
      const options = model.options[index] ?? []
      const chosen = column?.selected === null || column === undefined ? options.length : column.selected.size
      const active = !!column && column.selected !== null && options.length > 0
      const label = active
        ? labels.filterActive(model.headers[index], chosen, options.length)
        : labels.filterColumn(model.headers[index])

      button.disabled = options.length === 0
      button.title = label
      button.setAttribute("aria-label", label)

      if (active) button.setAttribute("data-active", "true")
      else button.removeAttribute("data-active")

      button.setAttribute("aria-expanded", this.openColumn === index && this.popover ? "true" : "false")
    })
  }

  private applyFilters(): { visible: number; total: number } {
    const model = this.model
    if (!model) return { visible: 0, total: 0 }

    let visible = 0
    let lastVisible: HTMLTableRowElement | null = null

    for (const snapshot of model.rows) {
      let show = true

      for (let index = 0; index < this.state.columns.length; index++) {
        const selected = this.state.columns[index]?.selected
        if (selected === null || selected === undefined) continue

        if (!selected.has(snapshot.values[index] ?? "")) {
          show = false
          break
        }
      }

      if (show) {
        visible++
        lastVisible = snapshot.row
      }

      if (show) snapshot.row.removeAttribute("data-ft-hidden")
      else snapshot.row.setAttribute("data-ft-hidden", "")

      snapshot.row.removeAttribute("data-ft-last-visible")
    }

    if (lastVisible) lastVisible.setAttribute("data-ft-last-visible", "")

    this.updateStatus(visible, model.rows.length)

    return { visible, total: model.rows.length }
  }

  private updateStatus(visible: number, total: number): void {
    if (this.disposed) return

    if (!hasActiveFilters(this.state)) {
      this.status?.remove()
      this.status = null
      return
    }

    const labels = this.labels()
    let status = this.status

    if (!status) {
      status = document.createElement("div")
      status.className = "ft-status"
      status.dataset.ftUi = "status"
      status.setAttribute("role", "status")
      status.setAttribute("aria-live", "polite")

      const text = document.createElement("span")
      text.className = "ft-status-text"
      text.dataset.ftUi = "status-text"

      const clear = document.createElement("button")
      clear.type = "button"
      clear.className = "ft-status-clear"
      clear.dataset.ftUi = "status-clear"
      clear.addEventListener("click", (event) => {
        event.preventDefault()
        event.stopPropagation()
        this.resetAll()
      })

      status.append(text, clear)
      this.status = status
    }

    const text = status.querySelector<HTMLElement>(".ft-status-text")
    const clear = status.querySelector<HTMLButtonElement>(".ft-status-clear")

    if (text) {
      text.textContent = visible === 0 ? `${labels.noRows} · ${labels.rows(0, total)}` : labels.rows(visible, total)
    }

    if (clear) clear.textContent = labels.clearAll

    if (status.parentElement !== this.wrapper) this.wrapper.append(status)
  }

  private toggle(index: number, anchor: HTMLButtonElement): void {
    if (this.disposed) return

    if (this.popover && this.openColumn === index) {
      this.popover.close(true)
      return
    }

    const model = this.model
    const column = this.state.columns[index]
    const options = model?.options[index]

    if (!model || !column || !options || options.length === 0) return

    const counts = this.currentCounts()
    const handle = openFilterPopover({
      anchor,
      column: model.headers[index],
      options,
      selected: column.selected,
      visibleRows: counts.visible,
      totalRows: counts.total,
      labels: this.labels(),
      onChange: (selected) => {
        const next = this.state.columns[index]
        if (!next) return

        next.selected = selected ? new Set(selected) : null
        this.store.set(this.key, this.state)
        this.updateButtons()
        const nextCounts = this.applyFilters()
        this.popover?.setCounts(nextCounts.visible, nextCounts.total)
      },
      onClose: () => {
        this.popover = null
        this.openColumn = null
        if (!this.disposed) this.updateButtons()
      },
    })

    this.popover = handle
    this.openColumn = index
    this.updateButtons()
  }

  private currentCounts(): { visible: number; total: number } {
    const model = this.model
    if (!model) return { visible: 0, total: 0 }

    let visible = 0

    for (const snapshot of model.rows) {
      let show = true

      for (let index = 0; index < this.state.columns.length; index++) {
        const selected = this.state.columns[index]?.selected
        if (selected === null || selected === undefined) continue

        if (!selected.has(snapshot.values[index] ?? "")) {
          show = false
          break
        }
      }

      if (show) visible++
    }

    return { visible, total: model.rows.length }
  }
}

function readModel(table: HTMLTableElement, labels: Labels): TableModel {
  const headRow = table.tHead?.rows[table.tHead.rows.length - 1] ?? table.querySelector<HTMLTableRowElement>("thead tr")
  const headerCells = headRow ? Array.from(headRow.cells) : []
  const headers = headerCells.map((cell, index) => {
    const text = headerText(cell)
    return text || labels.emptyHeader(index + 1)
  })
  const rows = Array.from(table.tBodies).flatMap((body) =>
    Array.from(body.rows)
      .filter((row) => !row.hasAttribute(OWN_UI_ATTRIBUTE))
      .map((row) => ({
        row,
        values: headers.map((_, index) => normalizeText(row.cells[index]?.textContent ?? "")),
      })),
  )

  const counts = headers.map(() => new Map<string, number>())

  for (const snapshot of rows) {
    for (let index = 0; index < headers.length; index++) {
      const value = snapshot.values[index] ?? ""
      counts[index].set(value, (counts[index].get(value) ?? 0) + 1)
    }
  }

  return {
    headers,
    headerCells,
    rows,
    options: counts.map((values) =>
      Array.from(values, ([value, count]) => ({
        value,
        count,
      })),
    ),
  }
}

function headerText(cell: HTMLTableCellElement): string {
  const clone = cell.cloneNode(true) as HTMLTableCellElement
  clone.querySelectorAll(`[${OWN_UI_ATTRIBUTE}]`).forEach((element) => element.remove())

  return normalizeText(clone.textContent ?? "")
}

function normalizeText(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\u200b/g, "").replace(/\s+/g, " ").trim()
}

function stateKey(wrapper: HTMLElement): string | null {
  const part = wrapper.closest<HTMLElement>("[data-timeline-part-id]")
  const partID = part?.getAttribute("data-timeline-part-id")

  if (part && partID) return `part:${partID}:${indexIn(part, wrapper)}`

  const block = wrapper.closest<HTMLElement>("[data-markdown-key]")
  const blockKey = block?.getAttribute("data-markdown-key")

  if (block && blockKey) return `block:${blockKey}:${indexIn(block, wrapper)}`

  return null
}

function indexIn(scope: Element, wrapper: Element): number {
  const index = Array.from(scope.querySelectorAll<HTMLElement>(WRAPPER_SELECTOR)).indexOf(wrapper as HTMLElement)
  return index >= 0 ? index : 0
}

function emptyState(headers: string[]): TableState {
  return {
    headers: [...headers],
    columns: headers.map((header) => ({ header, selected: null })),
  }
}

function hasActiveFilters(state: TableState): boolean {
  return state.columns.some((column) => column.selected !== null)
}

function cloneState(state: TableState): TableState {
  return {
    headers: [...state.headers],
    columns: state.columns.map((column) => ({
      header: column.header,
      selected: column.selected ? new Set(column.selected) : null,
    })),
  }
}

function sameStrings(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function clearRowState(row: HTMLTableRowElement): void {
  row.removeAttribute("data-ft-hidden")
  row.removeAttribute("data-ft-last-visible")
}

function isOwnMutation(record: MutationRecord): boolean {
  if (isOwnNode(record.target)) return true
  if (record.type !== "childList") return false

  const nodes = [...record.addedNodes, ...record.removedNodes]
  return nodes.length > 0 && nodes.every(isOwnNode)
}

function isOwnNode(node: Node): boolean {
  if (node instanceof Element) return node.closest(`[${OWN_UI_ATTRIBUTE}]`) !== null
  if (node instanceof Text) return node.parentElement?.closest(`[${OWN_UI_ATTRIBUTE}]`) !== null
  return false
}

function elementOf(node: Node): Element | null {
  return node instanceof Element ? node : node.parentElement
}

function funnelIcon(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.setAttribute("viewBox", "0 0 16 16")
  svg.setAttribute("width", "12")
  svg.setAttribute("height", "12")
  svg.setAttribute("aria-hidden", "true")
  svg.innerHTML =
    '<path d="M2.4 3.2h11.2l-4.3 4.9v3.6l-2.6 1.4V8.1L2.4 3.2Z" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/>'
  return svg
}
