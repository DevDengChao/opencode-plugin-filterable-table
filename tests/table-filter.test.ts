import { afterEach, describe, expect, it } from "vitest"
import { labelsFor } from "../src/labels"
import { installFilterableTables, type FilterableTablesController } from "../src/table-filter"

const columns = ["环境", "状态", "数量"] as const
const rows = [
  ["测试", "启用", "5"],
  ["测试", "停用", "2"],
  ["正式", "启用", "9"],
  ["正式", "停用", "4"],
] as const

function tableMarkup(rowsToRender: readonly (readonly string[])[] = rows, header: readonly string[] = columns) {
  return `
    <div data-timeline-part-id="part-1" data-markdown-key="block-1">
      <div data-component="markdown">
        <div data-component="markdown-table">
          <table>
            <thead><tr>${header.map((value) => `<th>${value}</th>`).join("")}</tr></thead>
            <tbody>
              ${rowsToRender
                .map((row) => `<tr>${row.map((value) => `<td>${value}</td>`).join("")}</tr>`)
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
}

function setup(markup: string): FilterableTablesController {
  document.body.innerHTML = `<div data-slot="session-timeline-scroll">${markup}</div>`

  return installFilterableTables({
    labels: () => labelsFor("zh-CN"),
  })
}

function triggers(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('[data-ft-ui="trigger"]'))
}

function popover(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-ft-ui="popover"]')
}

function optionRows() {
  return Array.from(popover()?.querySelectorAll<HTMLElement>(".ft-option") ?? []).map((row) => ({
    label: row.querySelector(".ft-option-label")?.textContent ?? "",
    count: row.querySelector(".ft-option-count")?.textContent ?? "",
    checked: row.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked ?? false,
  }))
}

function setChecked(value: string, checked: boolean) {
  const input = Array.from(popover()?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]') ?? []).find(
    (candidate) => candidate.dataset.value === value,
  )

  expect(input).toBeTruthy()
  input!.checked = checked
  input!.dispatchEvent(new Event("change", { bubbles: true }))
}

function visibleRows() {
  return Array.from(document.querySelectorAll<HTMLTableRowElement>("tbody tr")).filter(
    (row) => !row.hasAttribute("data-ft-hidden"),
  )
}

function statusText() {
  return document.querySelector<HTMLElement>(".ft-status-text")?.textContent ?? null
}

let controller: FilterableTablesController | null = null

afterEach(() => {
  controller?.dispose()
  controller = null
  document.body.innerHTML = ""
})

describe("filterable tables", () => {
  it("adds a trigger to every header cell and lists distinct values with counts", () => {
    controller = setup(tableMarkup())

    expect(controller.count()).toBe(1)
    expect(triggers()).toHaveLength(3)

    triggers()[0].click()

    expect(popover()?.querySelector(".ft-popover-title")?.textContent).toBe("筛选“环境”")
    expect(optionRows()).toEqual([
      { label: "测试", count: "2", checked: true },
      { label: "正式", count: "2", checked: true },
    ])
  })

  it("filters rows and combines columns with AND", () => {
    controller = setup(tableMarkup())

    triggers()[0].click()
    setChecked("正式", false)

    expect(visibleRows()).toHaveLength(2)
    expect(statusText()).toBe("显示 2 / 4 行")
    expect(triggers()[0].getAttribute("data-active")).toBe("true")

    triggers()[1].click()
    triggerButton("全不选").click()
    setChecked("启用", true)

    expect(visibleRows()).toHaveLength(1)
    expect(visibleRows()[0].textContent).toContain("测试")
    expect(visibleRows()[0].textContent).toContain("启用")
    expect(statusText()).toBe("显示 1 / 4 行")
  })

  it("supports select none, select all and reset", () => {
    controller = setup(tableMarkup())

    triggers()[0].click()
    triggerButton("全不选").click()

    expect(visibleRows()).toHaveLength(0)
    expect(statusText()).toBe("没有符合筛选条件的行 · 显示 0 / 4 行")

    triggerButton("全选").click()

    expect(visibleRows()).toHaveLength(4)
    expect(statusText()).toBeNull()

    triggerButton("全不选").click()
    triggerButton("重置").click()

    expect(visibleRows()).toHaveLength(4)
    expect(statusText()).toBeNull()
  })

  it("closes on Escape and returns focus to the header button", () => {
    controller = setup(tableMarkup())

    triggers()[0].click()
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))

    expect(popover()).toBeNull()
    expect(document.activeElement).toBe(triggers()[0])
  })

  it("labels empty values and searches long option lists", () => {
    controller = setup(
      tableMarkup(
        [
          ["", "A"],
          ["Alpha", "B"],
          ["Alpine", "C"],
          ["Beta", "D"],
          ["Bravo", "E"],
          ["Charlie", "F"],
          ["Delta", "G"],
          ["Echo", "H"],
          ["Foxtrot", "I"],
          ["Golf", "J"],
        ],
        ["名称", "编号"],
      ),
    )

    triggers()[0].click()

    expect(optionRows()[0]).toEqual({ label: "（空）", count: "1", checked: true })

    const search = popover()?.querySelector<HTMLInputElement>(".ft-search")
    expect(search).toBeTruthy()
    search!.value = "alp"
    search!.dispatchEvent(new Event("input", { bubbles: true }))

    expect(optionRows().map((option) => option.label)).toEqual(["Alpha", "Alpine"])
  })

  it("restores filters after the table DOM is replaced", () => {
    controller = setup(tableMarkup())

    triggers()[0].click()
    setChecked("正式", false)
    triggers()[0].click()

    const wrapper = document.querySelector<HTMLElement>('[data-component="markdown-table"]')
    expect(wrapper).toBeTruthy()

    const clone = wrapper!.cloneNode(true) as HTMLElement
    clone.querySelectorAll("[data-ft-ui]").forEach((element) => element.remove())
    clone.querySelectorAll("[data-ft-header]").forEach((element) => element.removeAttribute("data-ft-header"))
    clone.querySelectorAll("[data-ft-hidden]").forEach((element) => element.removeAttribute("data-ft-hidden"))
    clone.querySelectorAll("[data-ft-last-visible]").forEach((element) => element.removeAttribute("data-ft-last-visible"))
    wrapper!.replaceWith(clone)

    controller.scan()

    expect(triggers()).toHaveLength(3)
    expect(visibleRows()).toHaveLength(2)
    expect(triggers()[0].getAttribute("data-active")).toBe("true")
    expect(statusText()).toBe("显示 2 / 4 行")
  })
})

function triggerButton(label: string): HTMLButtonElement {
  const button = Array.from(popover()?.querySelectorAll<HTMLButtonElement>("button") ?? []).find(
    (candidate) => candidate.textContent === label,
  )

  expect(button).toBeTruthy()
  return button!
}
