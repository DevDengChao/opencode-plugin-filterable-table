import type { Labels } from "./labels"
import type { FilterOption } from "./table-filter"

export interface FilterPopoverInput {
  anchor: HTMLElement
  column: string
  options: FilterOption[]
  selected: Set<string> | null
  visibleRows: number
  totalRows: number
  labels: Labels
  onChange: (selected: Set<string> | null) => void
  onClose: () => void
}

export interface FilterPopoverUpdate {
  options: FilterOption[]
  selected: Set<string> | null
  visibleRows: number
  totalRows: number
}

export interface FilterPopoverHandle {
  update(input: FilterPopoverUpdate): void
  setCounts(visible: number, total: number): void
  close(focusAnchor?: boolean): void
}

let current: FilterPopoverHandle | null = null

export function openFilterPopover(input: FilterPopoverInput): FilterPopoverHandle {
  current?.close(false)

  const labels = input.labels
  const anchor = input.anchor
  let options = input.options
  let selected = input.selected ? new Set(input.selected) : null
  let visibleRows = input.visibleRows
  let totalRows = input.totalRows
  let closed = false

  const root = element("div", "ft-popover")
  root.dataset.ftUi = "popover"
  root.setAttribute("role", "dialog")
  root.setAttribute("aria-label", labels.filterColumn(input.column))

  const header = element("div", "ft-popover-header")
  const title = element("span", "ft-popover-title", labels.filterColumn(input.column))
  title.title = input.column

  const closeButton = element("button", "ft-icon-button")
  closeButton.type = "button"
  closeButton.dataset.ftUi = "popover-close"
  closeButton.setAttribute("aria-label", labels.close)
  closeButton.title = labels.close
  closeButton.append(svgIcon())

  header.append(title, closeButton)

  const toolbar = element("div", "ft-popover-toolbar")
  const selectAll = element("button", "ft-text-button", labels.selectAll)
  const selectNone = element("button", "ft-text-button", labels.selectNone)
  const reset = element("button", "ft-text-button", labels.resetColumn)
  selectAll.type = "button"
  selectNone.type = "button"
  reset.type = "button"
  toolbar.append(selectAll, selectNone, reset)

  const search = document.createElement("input")
  search.className = "ft-search"
  search.type = "search"
  search.placeholder = labels.search
  search.setAttribute("aria-label", labels.search)

  const list = element("div", "ft-options")
  list.setAttribute("role", "group")
  list.setAttribute("aria-label", input.column)

  const footer = element("div", "ft-popover-footer")
  const meta = element("div", "ft-popover-meta")
  const selectedText = element("span", "ft-popover-count")
  const rowsText = element("span", "ft-popover-count")
  meta.append(selectedText, rowsText)

  const done = element("button", "ft-button", labels.done)
  done.type = "button"
  footer.append(meta, done)

  root.append(header, toolbar, search, list, footer)
  document.body.append(root)
  anchor.setAttribute("aria-expanded", "true")

  function optionChecked(value: string) {
    return selected === null || selected.has(value)
  }

  function normalize(next: Set<string>): Set<string> | null {
    return next.size === options.length ? null : next
  }

  function syncChecks() {
    list.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.checked = optionChecked(checkbox.dataset.value ?? "")
    })
  }

  function updateMeta() {
    const chosen = selected === null ? options.length : selected.size
    selectedText.textContent = labels.selected(chosen, options.length)
    rowsText.textContent = visibleRows === 0 ? labels.noRows : labels.rows(visibleRows, totalRows)
    selectAll.disabled = selected === null || options.length === 0
    selectNone.disabled = selected !== null && selected.size === 0
    reset.disabled = selected === null
    const hideSearch = options.length <= 8
    if (hideSearch && !search.hidden) search.value = ""
    search.hidden = hideSearch
  }

  function setSelected(next: Set<string> | null) {
    selected = next
    input.onChange(next)
    updateMeta()
    syncChecks()
  }

  function renderList() {
    const query = search.value.trim().toLowerCase()
    const scrollTop = list.scrollTop
    const visible = query
      ? options.filter((option) => displayValue(option.value, labels).toLowerCase().includes(query))
      : options

    list.replaceChildren()

    if (visible.length === 0) {
      list.append(element("div", "ft-empty", labels.noMatches))
      if (root.isConnected) reposition()
      return
    }

    const fragment = document.createDocumentFragment()

    for (const option of visible) {
      const row = element("label", "ft-option")
      const checkbox = document.createElement("input")
      checkbox.type = "checkbox"
      checkbox.className = "ft-checkbox"
      checkbox.dataset.value = option.value
      checkbox.checked = optionChecked(option.value)
      checkbox.setAttribute("aria-label", displayValue(option.value, labels))

      const label = element("span", "ft-option-label", displayValue(option.value, labels))
      label.title = option.value
      const count = element("span", "ft-option-count", String(option.count))
      row.append(checkbox, label, count)
      fragment.append(row)
    }

    list.append(fragment)
    list.scrollTop = scrollTop
    if (root.isConnected) reposition()
  }

  function reposition() {
    if (closed || !root.isConnected) return

    const anchorRect = anchor.getBoundingClientRect()
    const margin = 8
    const width = Math.min(320, window.innerWidth - margin * 2)
    root.style.width = `${width}px`

    const rect = root.getBoundingClientRect()
    const height = rect.height
    const left = Math.max(margin, Math.min(anchorRect.left, window.innerWidth - width - margin))
    let top = anchorRect.bottom + 4

    if (top + height > window.innerHeight - margin) {
      top = Math.max(margin, anchorRect.top - height - 4)
    }

    root.style.left = `${left}px`
    root.style.top = `${top}px`
  }

  function onPointerDown(event: PointerEvent) {
    const target = event.target

    if (!(target instanceof Node)) return
    if (root.contains(target) || anchor.contains(target)) return
    close(false)
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== "Escape") return
    event.preventDefault()
    event.stopPropagation()
    close(true)
  }

  function onViewportChange() {
    if (closed) return

    const rect = anchor.getBoundingClientRect()

    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      close(false)
      return
    }

    reposition()
  }

  function close(focusAnchor = false) {
    if (closed) return
    closed = true

    document.removeEventListener("pointerdown", onPointerDown, true)
    document.removeEventListener("keydown", onKeyDown, true)
    window.removeEventListener("resize", onViewportChange)
    document.removeEventListener("scroll", onViewportChange, true)

    root.remove()
    anchor.setAttribute("aria-expanded", "false")

    if (current === handle) current = null
    input.onClose()

    if (focusAnchor && anchor.isConnected) anchor.focus({ preventScroll: true })
  }

  const handle: FilterPopoverHandle = {
    update(next) {
      options = next.options
      selected = next.selected ? new Set(next.selected) : null
      visibleRows = next.visibleRows
      totalRows = next.totalRows
      updateMeta()
      renderList()
      reposition()
    },
    setCounts(nextVisible, nextTotal) {
      visibleRows = nextVisible
      totalRows = nextTotal
      updateMeta()
    },
    close,
  }

  current = handle

  closeButton.addEventListener("click", () => close(true))
  done.addEventListener("click", () => close(true))
  selectAll.addEventListener("click", () => setSelected(null))
  selectNone.addEventListener("click", () => setSelected(new Set()))
  reset.addEventListener("click", () => setSelected(null))
  search.addEventListener("input", renderList)

  list.addEventListener("change", (event) => {
    const checkbox = event.target

    if (!(checkbox instanceof HTMLInputElement) || checkbox.type !== "checkbox") return

    const value = checkbox.dataset.value ?? ""
    const next = selected === null ? new Set(options.map((option) => option.value)) : new Set(selected)

    if (checkbox.checked) next.add(value)
    else next.delete(value)

    setSelected(normalize(next))
  })

  list.addEventListener("pointerdown", (event) => event.stopPropagation())

  document.addEventListener("pointerdown", onPointerDown, true)
  document.addEventListener("keydown", onKeyDown, true)
  window.addEventListener("resize", onViewportChange)
  document.addEventListener("scroll", onViewportChange, true)

  updateMeta()
  renderList()
  reposition()

  if (search.hidden) {
    const first = list.querySelector<HTMLInputElement>('input[type="checkbox"]')
    ;(first ?? done).focus({ preventScroll: true })
  } else {
    search.focus({ preventScroll: true })
  }

  return handle
}

function displayValue(value: string, labels: Labels) {
  return value === "" ? labels.emptyValue : value
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function svgIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.setAttribute("viewBox", "0 0 16 16")
  svg.setAttribute("width", "12")
  svg.setAttribute("height", "12")
  svg.setAttribute("aria-hidden", "true")
  svg.innerHTML = '<path d="m4 4 8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>'
  return svg
}
