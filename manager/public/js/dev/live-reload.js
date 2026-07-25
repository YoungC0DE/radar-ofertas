(function () {
  let lastBootId = null;
  let reloadScheduled = false;

  function scheduleReload() {
    if (reloadScheduled) return;
    reloadScheduled = true;
    window.setTimeout(() => window.location.reload(), 80);
  }

  const source = new EventSource('/manager/__dev/live');

  source.onmessage = (event) => {
    const bootId = event.data;
    if (lastBootId === null) {
      lastBootId = bootId;
      return;
    }
    if (bootId !== lastBootId) {
      scheduleReload();
    }
  };
})();
