"use client";
import NProgress from "nprogress";

let activeNavigations = 0;
let started = false;

NProgress.configure({
  showSpinner: false,
  minimum: 0.1,
  trickleSpeed: 150,
});

export function startRouteProgress() {
  activeNavigations++;

  if (!started) {
    started = true;
    NProgress.start();
  }
}

export function doneRouteProgress() {
  if (activeNavigations > 0) activeNavigations--;

  if (activeNavigations === 0 && started) {
    started = false;
    NProgress.done();
  }
}
