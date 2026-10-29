import "../src/styles.css"
import "./demo.css"
import { labelsFor } from "../src/labels"
import { installFilterableTables } from "../src/table-filter"

const body = document.querySelector<HTMLTableSectionElement>("#many-values tbody")

if (body) {
  for (let index = 1; index <= 35; index++) {
    const row = document.createElement("tr")
    const serial = document.createElement("td")
    const value = document.createElement("td")
    const note = document.createElement("td")
    serial.textContent = String(index).padStart(2, "0")
    value.textContent =
      index % 9 === 0
        ? ""
        : `Group ${String.fromCharCode(65 + (index % 4))} - value ${String(index).padStart(2, "0")} with a longer label`
    note.textContent = index % 6 === 0 ? "需要关注" : index % 3 === 0 ? "普通" : ""
    row.append(serial, value, note)
    body.append(row)
  }
}

const controller = installFilterableTables({
  labels: () => labelsFor("zh-CN"),
  debug: true,
})

document.querySelector("#theme")?.addEventListener("click", () => {
  const root = document.documentElement
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark"
})

document.querySelector("#reset")?.addEventListener("click", () => controller.resetAll())

let next = 36

document.querySelector("#add-row")?.addEventListener("click", () => {
  const target = document.querySelector<HTMLTableSectionElement>("#many-values tbody")
  if (!target) return

  const row = document.createElement("tr")
  const serial = document.createElement("td")
  const value = document.createElement("td")
  const note = document.createElement("td")
  serial.textContent = String(next).padStart(2, "0")
  value.textContent = `New value ${next}`
  note.textContent = "后追加"
  next++
  row.append(serial, value, note)
  target.append(row)
})

document.querySelector("#remove-row")?.addEventListener("click", () => {
  const target = document.querySelector<HTMLTableSectionElement>("#many-values tbody")
  target?.lastElementChild?.remove()
})

if (import.meta.hot) {
  import.meta.hot.dispose(() => controller.dispose())
}
