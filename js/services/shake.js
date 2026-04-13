/**
 * Shake detection via DeviceMotion API.
 * Calls a callback when the device is shaken above a threshold.
 */

const THRESHOLD = 15;   // m/s² — delta between two consecutive readings
const COOLDOWN = 1000;  // ms — minimum time between two shake triggers

let listening = false;
let callback = null;
let lastX = null, lastY = null, lastZ = null;
let lastShakeTime = 0;

function handleMotion(e) {
  const acc = e.accelerationIncludingGravity;
  if (!acc || acc.x == null) return;

  if (lastX !== null) {
    const dx = acc.x - lastX;
    const dy = acc.y - lastY;
    const dz = acc.z - lastZ;
    const magnitude = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (magnitude > THRESHOLD) {
      const now = Date.now();
      if (now - lastShakeTime > COOLDOWN) {
        lastShakeTime = now;
        if (callback) callback();
      }
    }
  }

  lastX = acc.x;
  lastY = acc.y;
  lastZ = acc.z;
}

/**
 * Request permission for DeviceMotion (required on iOS 13+).
 * Must be called from a user gesture (click/tap handler).
 * Returns true if permission granted or not needed, false otherwise.
 */
export async function requestShakePermission() {
  if (typeof DeviceMotionEvent === 'undefined') return false;

  // iOS 13+ requires explicit permission
  if (typeof DeviceMotionEvent.requestPermission === 'function') {
    try {
      const result = await DeviceMotionEvent.requestPermission();
      return result === 'granted';
    } catch {
      return false;
    }
  }

  // Android / older iOS — no permission needed
  return true;
}

/**
 * Check if DeviceMotion is available on this device.
 */
export function isShakeAvailable() {
  return typeof DeviceMotionEvent !== 'undefined';
}

/**
 * Start listening for shake events.
 * @param {Function} cb — called on each detected shake
 */
export function startShakeDetection(cb) {
  if (listening) stopShakeDetection();
  callback = cb;
  lastX = lastY = lastZ = null;
  lastShakeTime = 0;
  listening = true;
  window.addEventListener('devicemotion', handleMotion);
}

/**
 * Stop listening for shake events.
 */
export function stopShakeDetection() {
  listening = false;
  callback = null;
  lastX = lastY = lastZ = null;
  window.removeEventListener('devicemotion', handleMotion);
}
