const fs = require("fs");
const p = ".vercel/output/config.json";
const c = JSON.parse(fs.readFileSync(p, "utf8"));
delete c.crons;
fs.writeFileSync(p, JSON.stringify(c, null, 2));
console.log("[build] Removed Vercel cron from build output.");