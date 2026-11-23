import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { SiteSettings } from "@/models/SiteSettings";
import { STREAM_SERVERS, StreamServerOption } from "@/services/streaming.service";

async function pingServer(baseUrl: string, timeoutMs = 3500) {
  const startTime = Date.now();
  try {
    const res = await fetch(baseUrl, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const latency = Date.now() - startTime;
    return {
      online: res.status < 500,
      latency: `${latency}ms`,
      statusCode: res.status,
    };
  } catch (e: any) {
    return {
      online: false,
      latency: `${Date.now() - startTime}ms`,
      error: e.message || "Timeout",
    };
  }
}

function getAllServers(customServers: any[] = []): StreamServerOption[] {
  const customFormatted: StreamServerOption[] = customServers.map((s) => ({
    id: s.id,
    name: s.name,
    baseUrl: s.baseUrl,
    quality: s.quality || "1080p",
    description: s.description || "Custom stream source",
    moviePattern: s.moviePattern || `${s.baseUrl.replace(/\/+$/, "")}/embed/movie/{id}`,
    tvPattern:
      s.tvPattern || `${s.baseUrl.replace(/\/+$/, "")}/embed/tv/{id}/{season}/{episode}`,
    isCustom: true,
  }));

  // Ensure no duplicate IDs
  const customIds = new Set(customFormatted.map((c) => c.id));
  const builtIn = STREAM_SERVERS.filter((b) => !customIds.has(b.id));

  return [...builtIn, ...customFormatted];
}

export async function GET() {
  try {
    await connectToDatabase();
    let settings = await SiteSettings.findOne().lean();
    if (!settings) {
      settings = await SiteSettings.create({
        siteName: "StreamFlix",
        streaming: {
          defaultServerId: "vidlink",
          disabledServerIds: [],
          customServers: [],
        },
      });
    }

    const defaultServerId = settings.streaming?.defaultServerId || "vidlink";
    const disabledIds = settings.streaming?.disabledServerIds || [];
    const customServers = settings.streaming?.customServers || [];

    const allServers = getAllServers(customServers);

    const serversWithStatus = allServers.map((server) => ({
      ...server,
      isDefault: server.id === defaultServerId,
      isEnabled: !disabledIds.includes(server.id),
      sampleEmbed: server.moviePattern
        ? server.moviePattern.replace(/{id}|{tmdb}/gi, "1300968")
        : `${server.baseUrl.replace(/\/+$/, "")}/embed/movie/1300968`,
    }));

    return NextResponse.json({
      success: true,
      data: {
        defaultServerId,
        disabledServerIds: disabledIds,
        servers: serversWithStatus,
        customServers,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { action, serverId, autoDeactivate } = body;

    let settings = await SiteSettings.findOne();
    if (!settings) {
      settings = new SiteSettings();
    }

    if (!settings.streaming) {
      settings.streaming = {
        defaultServerId: "vidlink",
        disabledServerIds: [],
        customServers: [],
        updatedAt: new Date(),
      };
    }
    if (!settings.streaming.customServers) {
      settings.streaming.customServers = [];
    }

    // 1. ADD NEW STREAM SERVER
    if (action === "add_server") {
      const { name, baseUrl, quality, description, moviePattern, tvPattern } = body;

      if (!name || !baseUrl) {
        return NextResponse.json(
          { success: false, message: "Server Name and Base URL are required." },
          { status: 400 }
        );
      }

      // Generate clean ID
      const baseSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      const generatedId = baseSlug || `server-${Date.now()}`;

      // Check if ID exists
      const allExisting = getAllServers(settings.streaming.customServers);
      if (allExisting.some((s) => s.id === generatedId)) {
        return NextResponse.json(
          { success: false, message: `Server with name or ID '${generatedId}' already exists.` },
          { status: 400 }
        );
      }

      const cleanBase = baseUrl.trim().replace(/\/+$/, "");
      const newCustomServer = {
        id: generatedId,
        name: name.trim(),
        baseUrl: cleanBase,
        quality: quality || "1080p",
        description: description?.trim() || "Custom added stream mirror",
        moviePattern:
          moviePattern?.trim() || `${cleanBase}/embed/movie/{id}`,
        tvPattern:
          tvPattern?.trim() || `${cleanBase}/embed/tv/{id}/{season}/{episode}`,
        createdAt: new Date(),
      };

      settings.streaming.customServers.push(newCustomServer as any);
      settings.streaming.updatedAt = new Date();
      await settings.save();

      // Test newly added server
      const ping = await pingServer(cleanBase, 3000);

      return NextResponse.json({
        success: true,
        message: `Stream server '${name}' added successfully!`,
        server: newCustomServer,
        ping,
      });
    }

    // 2. DELETE CUSTOM STREAM SERVER
    if (action === "delete_server" && serverId) {
      const customList = settings.streaming.customServers || [];
      const filtered = customList.filter((s: any) => s.id !== serverId);

      if (filtered.length === customList.length) {
        return NextResponse.json(
          { success: false, message: "Custom server not found or is a built-in server." },
          { status: 404 }
        );
      }

      settings.streaming.customServers = filtered as any;

      // Clean up disabled list
      if (settings.streaming.disabledServerIds) {
        settings.streaming.disabledServerIds = settings.streaming.disabledServerIds.filter(
          (id: string) => id !== serverId
        );
      }

      // If deleted server was default, reset default
      if (settings.streaming.defaultServerId === serverId) {
        settings.streaming.defaultServerId = "vidlink";
      }

      settings.streaming.updatedAt = new Date();
      await settings.save();

      return NextResponse.json({
        success: true,
        message: `Custom stream server '${serverId}' removed successfully.`,
      });
    }

    // 3. EDIT CUSTOM STREAM SERVER
    if (action === "edit_server" && serverId) {
      const { name, baseUrl, quality, description, moviePattern, tvPattern } = body;
      const target = (settings.streaming.customServers || []).find(
        (s: any) => s.id === serverId
      );

      if (!target) {
        return NextResponse.json(
          { success: false, message: "Custom server not found." },
          { status: 404 }
        );
      }

      if (name) target.name = name.trim();
      if (baseUrl) target.baseUrl = baseUrl.trim().replace(/\/+$/, "");
      if (quality) target.quality = quality;
      if (description !== undefined) target.description = description.trim();
      if (moviePattern) target.moviePattern = moviePattern.trim();
      if (tvPattern) target.tvPattern = tvPattern.trim();

      settings.streaming.updatedAt = new Date();
      await settings.save();

      return NextResponse.json({
        success: true,
        message: `Server '${target.name}' updated successfully.`,
        server: target,
      });
    }

    // 4. Set Default Server
    if (action === "set_default" && serverId) {
      settings.streaming.defaultServerId = serverId;
      settings.streaming.updatedAt = new Date();
      await settings.save();
      return NextResponse.json({
        success: true,
        message: `Default server changed to ${serverId}`,
      });
    }

    // 5. Toggle Server Enabled / Disabled
    if (action === "toggle_server" && serverId) {
      const disabled = settings.streaming.disabledServerIds || [];
      const index = disabled.indexOf(serverId);
      if (index > -1) {
        disabled.splice(index, 1);
      } else {
        disabled.push(serverId);
      }
      settings.streaming.disabledServerIds = disabled;
      settings.streaming.updatedAt = new Date();
      await settings.save();
      return NextResponse.json({ success: true, disabledServerIds: disabled });
    }

    // 6. Ping Single Server
    if (action === "test_server" && serverId) {
      const allServers = getAllServers(settings.streaming.customServers);
      const server = allServers.find((s) => s.id === serverId);
      if (!server) {
        return NextResponse.json({ success: false, message: "Server not found" }, { status: 404 });
      }

      const ping = await pingServer(server.baseUrl);
      let autoDeactivated = false;

      if (!ping.online && autoDeactivate) {
        const disabled = settings.streaming.disabledServerIds || [];
        if (!disabled.includes(serverId)) {
          disabled.push(serverId);
          settings.streaming.disabledServerIds = disabled;
          settings.streaming.updatedAt = new Date();
          await settings.save();
          autoDeactivated = true;
        }
      }

      return NextResponse.json({
        success: true,
        latency: ping.latency,
        online: ping.online,
        autoDeactivated,
        disabledServerIds: settings.streaming.disabledServerIds,
      });
    }

    // 7. Scan All Servers (Built-in + Custom) & Auto-Deactivate Failing Servers
    if (action === "test_all" || action === "scan") {
      const shouldDeactivate = autoDeactivate !== false;
      const disabled = settings.streaming.disabledServerIds || [];
      const allServers = getAllServers(settings.streaming.customServers);
      const results: Record<string, { latency: string; online: boolean; autoDeactivated: boolean }> = {};
      let newlyDeactivatedCount = 0;

      for (const server of allServers) {
        const ping = await pingServer(server.baseUrl, 3500);
        let autoDeactivatedThis = false;

        if (!ping.online && shouldDeactivate) {
          if (!disabled.includes(server.id)) {
            disabled.push(server.id);
            newlyDeactivatedCount++;
            autoDeactivatedThis = true;
          }
        }

        results[server.id] = {
          latency: ping.latency,
          online: ping.online,
          autoDeactivated: autoDeactivatedThis,
        };
      }

      settings.streaming.disabledServerIds = disabled;
      settings.streaming.updatedAt = new Date();
      await settings.save();

      return NextResponse.json({
        success: true,
        results,
        disabledServerIds: disabled,
        newlyDeactivatedCount,
        message: `Scanned all ${allServers.length} servers: ${newlyDeactivatedCount} offline servers auto-deactivated.`,
      });
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
