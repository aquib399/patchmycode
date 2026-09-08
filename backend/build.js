import { performance } from "perf_hooks";
import { spawn } from "child_process";

const pipeline = [
  {
    step: "Injecting .env variables...",
    command: "tsx src/configs/env.ts",
    successMessage: "Injected .env"
  },
  {
    step: "Compiling typescript...",
    command: "tsc",
    successMessage: "Typescript Compiled"
  },
  {
    step: "Running import alias...",
    command: "tsc-alias",
    successMessage: "Import alias resolved"
  }
];

const runCommand = (command, args) => {
  return new Promise((resolve, reject) => {
    let dots = "";
    const interval = setInterval(() => {
      dots = dots.length >= 3 ? "" : dots + ".";
      process.stdout.write(`\rRunning ${command}${dots.padEnd(3)}`);
    }, 350);

    const fullCommand = command;
    const child = spawn(fullCommand, { stdio: "inherit", shell: true });

    child.on("close", (code) => {
      clearInterval(interval);
      process.stdout.write("\r\x1b[K");
      if (code === 0) resolve();
      else reject(new Error(`${command} failed`));
    });
  });
};

async function build() {
  const globalStart = performance.now();
  try {
    for (const task of pipeline) {
      console.log(task.step);
      const start = performance.now();

      await runCommand(task.command, task.args);

      const duration = ((performance.now() - start) / 1000).toFixed(2);
      console.log(`${task.successMessage}: ${duration}s\n`);
    }

    const totalDuration = ((performance.now() - globalStart) / 1000).toFixed(2);
    console.log(`Build Completed!⭐⭐⭐ | Total Time: ${totalDuration}s`);
    process.exit(0);
  } catch (err) {
    process.exit(1);
  }
}

build();
