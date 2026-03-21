/**
 * @file wsEvents.js
 * @description Enumeration of all WebSocket event-type strings sent by the trading backend.
 * Centralising these prevents typo-driven bugs when subscribing to or routing WS messages.
 * @exports WS_EVENTS  Plain object of event name constants.
 * @note Keep in sync with the backend's message schema documentation.
 */

export const WS_EVENTS = {};
