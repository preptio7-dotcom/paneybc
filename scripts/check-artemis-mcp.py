"""Verify the configured Artemis MCP handshake and run its read-only diagnosis.

Run with Artemis's .venv/Scripts/python.exe. Does not run a test, contact model
providers, change devices, or load Preptio's environment variables.
"""
import asyncio
import json
import os
from pathlib import Path
import tomllib

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


async def main():
    config_path = Path(os.environ.get("CODEX_HOME", str(Path.home() / ".codex"))) / "config.toml"
    config = tomllib.loads(config_path.read_text(encoding="utf-8"))["mcp_servers"]["artemis"]
    server = StdioServerParameters(
        command=config["command"], args=config.get("args", []),
        cwd=config.get("cwd"), env=config.get("env", {}),
    )
    async with asyncio.timeout(180):
        async with stdio_client(server) as (read, write):
            async with ClientSession(read, write) as session:
                result = await session.initialize()
                tools = await session.list_tools()
                print(json.dumps({"server": result.serverInfo.name, "tools": [tool.name for tool in tools.tools]}, ensure_ascii=True), flush=True)
                diagnosis = await session.call_tool("mobile_diagnose", {})
                data = diagnosis.structuredContent
                if not data:
                    for content in diagnosis.content:
                        if content.type == "text":
                            try:
                                data = json.loads(content.text)
                                break
                            except json.JSONDecodeError:
                                continue
                if data:
                    # Only display high-level readiness, never raw credential metadata.
                    print(json.dumps({key: data[key] for key in ("verdict", "summary", "next_steps") if key in data}, ensure_ascii=True), flush=True)
                else:
                    print(json.dumps({"diagnosis_error": diagnosis.isError, "structured_result": False}), flush=True)


if __name__ == "__main__":
    asyncio.run(main())
