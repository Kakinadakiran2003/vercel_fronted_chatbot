// Shared configuration for all custom API hooks
// Uses the current page host so remote access works when the frontend is loaded
// from another machine via an IP address.
const pageHost = window.location.hostname;
//export const API_BASE_URL = `${window.location.protocol}//${pageHost}:8000`;
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
// Standard headers for JSON requests
export const jsonHeaders = {
  "Content-Type": "application/json",
};
