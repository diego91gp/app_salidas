let scanLocked = false;
let scanLockTimer = null;

function lockScan(ms = 600) {
  scanLocked = true;
  window.clearTimeout(scanLockTimer);
  console.log(`[lockScan] bloqueado ${ms}ms`);
  scanLockTimer = window.setTimeout(() => {
    scanLocked = false;
    console.log(`[lockScan] desbloqueado tras ${ms}ms`);
  }, ms);
}
