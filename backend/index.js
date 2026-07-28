import "dotenv/config";

import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const app = createApp({ config });

app.listen(config.port, "0.0.0.0", (error) => {
  if (error) throw error;
  console.log(`Matani backend listening on port ${config.port}`);
});

export default app;
