import { randomUUID } from "node:crypto";
import { serverConfig } from "../config.js";
import { DockerClient, DockerCommandError } from "./dockerClient.js";

export interface ContainerStats {
  id: string;
  name: string;
  cpuPercent: string;
  memoryUsage: string;
  memoryPercent: string;
  networkIo: string;
  blockIo: string;
  pids: string;
}

export class DockerManager {
  private readonly client = new DockerClient(serverConfig.dockerCommand);

  getDockerCommand(): string {
    return serverConfig.dockerCommand;
  }

  private dockerFailureMessage(error: DockerCommandError): string {
    const stderr = error.stderr.trim();

    if (error.code === "ENOENT") {
      return error.message;
    }

    if (/docker daemon|docker api|cannot connect|is the docker daemon running/i.test(stderr)) {
      return `Docker is installed at ${serverConfig.dockerCommand}, but the Docker daemon is not running or its socket is unavailable. Start Docker Desktop, then try again.`;
    }

    if (/no such image|not found|no such object/i.test(stderr)) {
      return `Docker image ${serverConfig.dockerImage} is not available. Run npm run docker:build before creating sessions.`;
    }

    return stderr || error.message;
  }

  async ensureImageExists(): Promise<void> {
    try {
      await this.client.exec(["image", "inspect", serverConfig.dockerImage]);
    } catch (error) {
      if (error instanceof DockerCommandError) {
        throw new Error(this.dockerFailureMessage(error));
      }

      throw error;
    }
  }

  async createContainer(sessionId: string, hostWorkspaceDir?: string): Promise<string> {
    await this.ensureImageExists();
    const name = `nebulashell-${sessionId.slice(0, 8)}-${randomUUID().slice(0, 8)}`;
    const args: string[] = [
      "run",
      "--detach",
      "--name",
      name,
      "--hostname",
      "nebulashell",
      "--label",
      "app=nebulashell",
      "--label",
      `session=${sessionId}`,
      "--memory",
      serverConfig.containerMemory,
      "--cpus",
      serverConfig.containerCpu,
      "--pids-limit",
      serverConfig.containerPidsLimit,
      "--security-opt",
      "no-new-privileges",
      "--cap-drop",
      "ALL",
      "--workdir",
      serverConfig.workspaceDir
    ];

    if (hostWorkspaceDir) {
      args.push("--volume", `${hostWorkspaceDir}:${serverConfig.workspaceDir}`);
    }

    args.push(serverConfig.dockerImage, "sleep", "infinity");
    const { stdout } = await this.client.exec(args);

    return stdout.trim();
  }

  async stopContainer(containerId: string): Promise<void> {
    await this.client.exec(["rm", "--force", "--volumes", containerId]).catch(() => undefined);
  }

  async getStats(containerId: string): Promise<ContainerStats | null> {
    try {
      const { stdout } = await this.client.exec(["stats", containerId, "--no-stream", "--format", "{{json .}}"]).catch(() => ({ stdout: "", stderr: "" }));

      if (!stdout.trim()) {
        return null;
      }

      const raw = JSON.parse(stdout) as Record<string, string>;
      return {
        id: raw.ID ?? containerId,
        name: raw.Name ?? containerId,
        cpuPercent: raw.CPUPerc ?? "0%",
        memoryUsage: raw.MemUsage ?? "0B / 0B",
        memoryPercent: raw.MemPerc ?? "0%",
        networkIo: raw.NetIO ?? "0B / 0B",
        blockIo: raw.BlockIO ?? "0B / 0B",
        pids: raw.PIDs ?? "0"
      };
    } catch {
      return null;
    }
  }
}

export const dockerManager = new DockerManager();