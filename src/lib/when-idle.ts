// Runs `task` once the page has finished loading and the browser has nothing better to do, so
// monitoring and analytics never compete with what the visitor came to see.
export function whenIdle(task: () => void, timeoutMs = 4000): void {
  if (typeof window === "undefined") return;
  const run = () => {
    if ("requestIdleCallback" in window) window.requestIdleCallback(task, { timeout: timeoutMs });
    else setTimeout(task, 1500);
  };
  if (document.readyState === "complete") run();
  else window.addEventListener("load", run, { once: true });
}
