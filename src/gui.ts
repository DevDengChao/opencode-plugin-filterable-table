import { Command, Plugin, Style } from "@opencode/plugin/gui"
import { labelsFor } from "./labels"
import { installFilterableTables } from "./table-filter"
import styles from "./styles.css?inline"

export default Plugin.define({
  setup(ctx) {
    console.info(`[filterable-table] GUI setup in OpenCode ${ctx.app.version}`)
    ctx.add(Style, styles)

    const controller = installFilterableTables({
      labels: () => labelsFor(ctx.locale.locale()),
      debug: ctx.options.debug === true,
    })

    const command = ctx.add(Command, () => {
      const labels = labelsFor(ctx.locale.locale())

      return {
        id: "reset-filters",
        title: labels.resetAllCommand,
        group: labels.group,
        run: () => controller.resetAll(),
      }
    })

    return () => {
      command()
      controller.dispose()
    }
  },
})
