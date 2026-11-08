const fs = require("fs");
const path = require("path");

const configPath = ".vercel/output/config.json";
if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  delete config.crons;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log("[build] Removed Vercel cron from build output.");
}

const fnConfigPath = ".vercel/output/functions/__server.func/.vc-config.json";
if (fs.existsSync(fnConfigPath)) {
  const fnConfig = JSON.parse(fs.readFileSync(fnConfigPath, "utf8"));
  fnConfig.maxDuration = 60;
  fs.writeFileSync(fnConfigPath, JSON.stringify(fnConfig, null, 2));
  console.log("[build] Set maxDuration: 60 in .vc-config.json for server function.");
}
