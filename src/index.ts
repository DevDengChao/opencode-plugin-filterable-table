import { Plugin } from "@opencode/plugin"

export default Plugin.define({
  id: "opencode-plugin-filterable-table",
  setup(ctx) {
    console.info(`[filterable-table] server part loaded in OpenCode ${ctx.app.version}`)
  },
})
