import { io } from "socket.io-client";
import { API_BASE_URL } from "./api";

export function createSocket() {
  const target = API_BASE_URL || window.location.origin;
  return io(target, {
    transports: ["websocket"],
    withCredentials: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000
  });
}
