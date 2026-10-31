/**
 * The only place the backend prefixes are written. Auth and the write go to the api (:8080);
 * every read goes to the worker (:8081), which owns the delivery records. The dev proxy in
 * proxy.conf.json maps both prefixes. See docs/adr/0001-in-memory-token-and-dev-proxy.md.
 */
export const API = '/api';
export const WORKER = '/worker/api';
