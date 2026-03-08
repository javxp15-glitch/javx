(function () {
  const cfg = window.javxRtSyncAdmin || {};
  const ajaxUrl = cfg.ajaxUrl;
  const nonce = cfg.nonce;

  const els = {
    testBtn: document.getElementById("javx-rt-test-connection"),
    incrementalBtn: document.getElementById("javx-rt-run-incremental"),
    startBtn: document.getElementById("javx-rt-start-full-import"),
    cancelBtn: document.getElementById("javx-rt-cancel-full-import"),
    closeModalBtn: document.getElementById("javx-rt-close-modal"),
    modal: document.getElementById("javx-rt-progress-modal"),
    liveMessage: document.getElementById("javx-rt-live-message"),
    inlineBar: document.querySelector("#javx-rt-inline-progress .javx-rt-progress-bar"),
    inlinePercent: document.getElementById("javx-rt-progress-percent"),
    inlineCount: document.getElementById("javx-rt-progress-count"),
    logOutput: document.getElementById("javx-rt-log-output"),
    modalMessage: document.getElementById("javx-rt-modal-message"),
    modalBar: document.getElementById("javx-rt-modal-progress-bar"),
    modalPercent: document.getElementById("javx-rt-modal-progress-percent"),
    modalCount: document.getElementById("javx-rt-modal-progress-count"),
    modalLogOutput: document.getElementById("javx-rt-modal-log-output"),
    createdCount: document.getElementById("javx-rt-created-count"),
    updatedCount: document.getElementById("javx-rt-updated-count"),
    skippedCount: document.getElementById("javx-rt-skipped-count"),
    failedCount: document.getElementById("javx-rt-failed-count"),
    lastError: document.getElementById("javx-rt-last-error"),
  };

  if (!ajaxUrl || !nonce) {
    return;
  }

  let fullImportActive = false;

  function api(action, payload = {}) {
    const body = new FormData();
    body.append("action", action);
    body.append("nonce", nonce);

    Object.entries(payload).forEach(([key, value]) => {
      body.append(key, value);
    });

    return fetch(ajaxUrl, {
      method: "POST",
      body,
      credentials: "same-origin",
    }).then(async (response) => {
      const data = await response.json();
      if (!data.success) {
        const message = data?.data?.message || cfg.strings?.error || "Error";
        throw { message, data: data?.data || {} };
      }
      return data.data;
    });
  }

  function setBusy(button, busy) {
    if (!button) return;
    button.disabled = busy;
    if (busy) {
      button.dataset.originalText = button.textContent;
      button.textContent = cfg.strings?.working || "Working...";
    } else if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
    }
  }

  function setInlineProgress(percent, processed, total) {
    if (els.inlineBar) {
      els.inlineBar.style.width = `${percent}%`;
    }
    if (els.inlinePercent) {
      els.inlinePercent.textContent = `${percent}%`;
    }
    if (els.inlineCount) {
      els.inlineCount.textContent = `${processed} / ${total}`;
    }
  }

  function setModalProgress(percent, processed, total) {
    if (els.modalBar) {
      els.modalBar.style.width = `${percent}%`;
    }
    if (els.modalPercent) {
      els.modalPercent.textContent = `${percent}%`;
    }
    if (els.modalCount) {
      els.modalCount.textContent = `${processed} / ${total}`;
    }
  }

  function setLog(outputEl, logs) {
    if (!outputEl) return;
    outputEl.textContent = Array.isArray(logs) ? logs.join("\n") : "";
  }

  function updateSession(session, message) {
    const percent = Number(session?.progress_percent || 0);
    const processed = Number(session?.processed || 0);
    const total = Number(session?.total || 0);

    setInlineProgress(percent, processed, total);
    setModalProgress(percent, processed, total);
    setLog(els.logOutput, session?.logs || []);
    setLog(els.modalLogOutput, session?.logs || []);

    if (els.createdCount) els.createdCount.textContent = Number(session?.created || 0);
    if (els.updatedCount) els.updatedCount.textContent = Number(session?.updated || 0);
    if (els.skippedCount) els.skippedCount.textContent = Number(session?.skipped || 0);
    if (els.failedCount) els.failedCount.textContent = Number(session?.failed || 0);

    const text = message || (session?.completed ? cfg.strings?.complete || "Complete." : "Running full import...");
    if (els.liveMessage) els.liveMessage.textContent = text;
    if (els.modalMessage) els.modalMessage.textContent = text;
    if (els.lastError) els.lastError.textContent = session?.last_error || "None";
  }

  function openModal() {
    if (!els.modal) return;
    els.modal.classList.add("is-open");
    els.modal.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    if (!els.modal) return;
    els.modal.classList.remove("is-open");
    els.modal.setAttribute("aria-hidden", "true");
  }

  async function runFullImportLoop() {
    fullImportActive = true;

    while (fullImportActive) {
      try {
        const session = await api("javx_rt_run_full_import_batch");
        updateSession(session);

        if (!session.running) {
          fullImportActive = false;
          if (session.completed) {
            updateSession(session, cfg.strings?.complete || "Import complete.");
          }
          break;
        }
      } catch (error) {
        fullImportActive = false;
        updateSession(error.data?.session || {}, error.message || cfg.strings?.error || "Error");
        break;
      }
    }

    setBusy(els.startBtn, false);
  }

  if (els.testBtn) {
    els.testBtn.addEventListener("click", async () => {
      setBusy(els.testBtn, true);
      try {
        const data = await api("javx_rt_test_connection");
        const message = data?.authenticated_as
          ? `Connected as ${data.authenticated_as}`
          : "Connection OK";
        if (els.liveMessage) els.liveMessage.textContent = message;
      } catch (error) {
        if (els.liveMessage) els.liveMessage.textContent = error.message || cfg.strings?.error || "Error";
      } finally {
        setBusy(els.testBtn, false);
      }
    });
  }

  if (els.incrementalBtn) {
    els.incrementalBtn.addEventListener("click", async () => {
      setBusy(els.incrementalBtn, true);
      try {
        const summary = await api("javx_rt_run_incremental_sync");
        const total = Number(summary?.processed || 0);
        setInlineProgress(100, total, total);
        if (els.liveMessage) {
          els.liveMessage.textContent = `Incremental sync finished. Created ${summary.created || 0}, updated ${summary.updated || 0}, skipped ${summary.skipped || 0}, failed ${summary.failed || 0}.`;
        }
      } catch (error) {
        if (els.liveMessage) els.liveMessage.textContent = error.message || cfg.strings?.error || "Error";
      } finally {
        setBusy(els.incrementalBtn, false);
      }
    });
  }

  if (els.startBtn) {
    els.startBtn.addEventListener("click", async () => {
      setBusy(els.startBtn, true);
      try {
        const session = await api("javx_rt_start_full_import");
        openModal();
        updateSession(session, "Starting full import...");
        await runFullImportLoop();
      } catch (error) {
        if (els.liveMessage) els.liveMessage.textContent = error.message || cfg.strings?.error || "Error";
        setBusy(els.startBtn, false);
      }
    });
  }

  if (els.cancelBtn) {
    els.cancelBtn.addEventListener("click", async () => {
      fullImportActive = false;
      try {
        const session = await api("javx_rt_cancel_full_import");
        updateSession(session, "Import canceled.");
      } catch (error) {
        if (els.liveMessage) els.liveMessage.textContent = error.message || cfg.strings?.error || "Error";
      } finally {
        setBusy(els.startBtn, false);
      }
    });
  }

  if (els.closeModalBtn) {
    els.closeModalBtn.addEventListener("click", closeModal);
  }
})();
