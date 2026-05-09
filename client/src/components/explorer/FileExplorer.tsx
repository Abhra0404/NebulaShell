import Editor from "@monaco-editor/react";
import { Download, File, Folder, FolderPlus, RefreshCw, Save, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createDirectory, deletePath, downloadUrl, listFiles, readFile, saveFile, uploadFile } from "../../services/api";
import type { FileEntry, TerminalSession } from "../../types";
import { languageFromPath } from "../../utils/language";

interface FileExplorerProps {
  session: TerminalSession | null;
}

function parentPath(path: string): string {
  if (path === "/workspace") {
    return "/workspace";
  }

  return path.split("/").slice(0, -1).join("/") || "/workspace";
}

export function FileExplorer({ session }: FileExplorerProps) {
  const [currentPath, setCurrentPath] = useState("/workspace");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement | null>(null);

  const sortedEntries = useMemo(
    () => [...entries].sort((left, right) => (left.type === right.type ? left.name.localeCompare(right.name) : left.type === "directory" ? -1 : 1)),
    [entries]
  );

  const refresh = useCallback(async () => {
    if (!session) {
      setEntries([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setEntries(await listFiles(session.id, currentPath));
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Unable to list files.");
    } finally {
      setLoading(false);
    }
  }, [currentPath, session]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setCurrentPath("/workspace");
    setSelectedPath(null);
    setContent("");
    setDirty(false);
  }, [session?.id]);

  const openEntry = async (entry: FileEntry) => {
    if (!session) {
      return;
    }

    if (entry.type === "directory") {
      setCurrentPath(entry.path);
      return;
    }

    setSelectedPath(entry.path);
    setError(null);

    try {
      setContent(await readFile(session.id, entry.path));
      setDirty(false);
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : "Unable to read file.");
    }
  };

  const handleSave = async () => {
    if (!session || !selectedPath) {
      return;
    }

    await saveFile(session.id, selectedPath, content);
    setDirty(false);
    await refresh();
  };

  const handleCreateFile = async () => {
    if (!session) {
      return;
    }

    const name = window.prompt("File name", "notes.txt");

    if (!name?.trim()) {
      return;
    }

    const path = `${currentPath}/${name}`.replace(/\/+/g, "/");
    await saveFile(session.id, path, "");
    await refresh();
    setSelectedPath(path);
    setContent("");
    setDirty(false);
  };

  const handleCreateFolder = async () => {
    if (!session) {
      return;
    }

    const name = window.prompt("Folder name", "project");

    if (!name?.trim()) {
      return;
    }

    await createDirectory(session.id, `${currentPath}/${name}`.replace(/\/+/g, "/"));
    await refresh();
  };

  const handleDelete = async () => {
    if (!session || !selectedPath) {
      return;
    }

    if (!window.confirm(`Delete ${selectedPath}?`)) {
      return;
    }

    await deletePath(session.id, selectedPath);
    setSelectedPath(null);
    setContent("");
    setDirty(false);
    await refresh();
  };

  const handleUpload = async (file: File | undefined) => {
    if (!session || !file) {
      return;
    }

    await uploadFile(session.id, `${currentPath}/${file.name}`.replace(/\/+/g, "/"), file);
    await refresh();
    uploadRef.current!.value = "";
  };

  return (
    <aside className="grid min-h-0 grid-rows-[42px_190px_minmax(0,1fr)] border-l border-ink-700 bg-ink-900">
      <div className="flex items-center justify-between border-b border-ink-700 px-3">
        <div className="min-w-0">
          <span className="block text-xs font-semibold uppercase text-ink-300">Files</span>
          <span className="block truncate text-[11px] text-ink-500">{session ? currentPath : "no session"}</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="icon-button" type="button" title="Refresh" disabled={!session || loading} onClick={() => void refresh()}>
            <RefreshCw size={14} aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" title="New file" disabled={!session} onClick={() => void handleCreateFile()}>
            <File size={14} aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" title="New folder" disabled={!session} onClick={() => void handleCreateFolder()}>
            <FolderPlus size={14} aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" title="Upload" disabled={!session} onClick={() => uploadRef.current?.click()}>
            <Upload size={14} aria-hidden="true" />
          </button>
          <input ref={uploadRef} className="hidden" type="file" onChange={(event) => void handleUpload(event.target.files?.[0])} />
        </div>
      </div>

      <div className="min-h-0 overflow-auto border-b border-ink-700 py-1">
        {currentPath !== "/workspace" ? (
          <button className="file-row" type="button" onClick={() => setCurrentPath(parentPath(currentPath))}>
            <Folder size={15} aria-hidden="true" />
            <span>..</span>
          </button>
        ) : null}
        {sortedEntries.map((entry) => (
          <button
            key={entry.path}
            className={`file-row ${selectedPath === entry.path ? "selected" : ""}`}
            type="button"
            onClick={() => void openEntry(entry)}
          >
            {entry.type === "directory" ? <Folder size={15} aria-hidden="true" /> : <File size={15} aria-hidden="true" />}
            <span className="truncate">{entry.name}</span>
          </button>
        ))}
        {error ? <p className="px-3 py-2 text-xs text-accent-red">{error}</p> : null}
      </div>

      <section className="grid min-h-0 grid-rows-[36px_minmax(0,1fr)]">
        <div className="flex min-w-0 items-center justify-between border-b border-ink-700 px-3">
          <span className="truncate text-xs text-ink-300">{selectedPath ?? "Select a file"}</span>
          <div className="flex items-center gap-1">
            {session && selectedPath ? (
              <a className="icon-button" title="Download" href={downloadUrl(session.id, selectedPath)}>
                <Download size={14} aria-hidden="true" />
              </a>
            ) : null}
            <button className="icon-button" type="button" title="Delete" disabled={!selectedPath} onClick={() => void handleDelete()}>
              <Trash2 size={14} aria-hidden="true" />
            </button>
            <button className="toolbar-button compact" type="button" disabled={!dirty || !selectedPath} onClick={() => void handleSave()}>
              <Save size={14} aria-hidden="true" />
              Save
            </button>
          </div>
        </div>
        {selectedPath ? (
          <Editor
            path={selectedPath}
            value={content}
            language={languageFromPath(selectedPath)}
            theme="vs-dark"
            onChange={(value) => {
              setContent(value ?? "");
              setDirty(true);
            }}
            options={{
              automaticLayout: true,
              fontSize: 12,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: "on"
            }}
          />
        ) : (
          <div className="grid place-items-center px-4 text-center text-sm text-ink-500">Open a file from the active container workspace.</div>
        )}
      </section>
    </aside>
  );
}