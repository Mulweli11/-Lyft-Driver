const { spawn } = require("node:child_process");

const port = Number(process.env.PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("Render must provide a valid PORT environment variable");
  process.exit(1);
}

const expoCli = require.resolve("expo/bin/cli");
const server = spawn(
  process.execPath,
  [expoCli, "serve", "--port", String(port)],
  { env: process.env, stdio: "inherit" },
);

server.on("error", (error) => {
  console.error("Could not start the Expo production server:", error);
  process.exitCode = 1;
});

server.on("exit", (code, signal) => {
  if (signal) {
    console.error(`Expo production server exited due to ${signal}`);
  }
  process.exitCode = code ?? 1;
});
