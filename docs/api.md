# API Design

## Socket.IO Events

| Event | Direction | Payload |
| --- | --- | --- |
| `terminal:create` | client to server | `{ cols, rows }` |
| `terminal:created` | server to client | `{ session }` |
| `terminal:reconnect` | client to server | `{ sessionId }` |
| `terminal:input` | client to server | `{ sessionId, data }` |
| `terminal:output` | server to client | `{ sessionId, data }` |
| `terminal:resize` | client to server | `{ sessionId, cols, rows }` |
| `terminal:close` | client to server | `{ sessionId }` |
| `terminal:closed` | server to client | `{ sessionId, exitCode? }` |

## REST Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Server health check |
| `GET` | `/api/sessions` | Active session and container stats |
| `GET` | `/api/files?sessionId=&path=` | List a directory in `/workspace` |
| `GET` | `/api/file?sessionId=&path=` | Read a text file |
| `POST` | `/api/file` | Save a text file |
| `POST` | `/api/directory` | Create a directory |
| `DELETE` | `/api/file?sessionId=&path=` | Delete a file or directory |
| `POST` | `/api/upload` | Upload a file to the active container |
| `GET` | `/api/download?sessionId=&path=` | Download a file from the active container |

All file paths are normalized and restricted to the container workspace root.
