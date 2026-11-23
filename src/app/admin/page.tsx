"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Activity,
  Server,
  Send,
  LayoutDashboard,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Play,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Database,
  Smartphone,
  Laptop,
  Users,
  Filter,
  MousePointerClick,
  Eye,
  EyeOff,
  Film,
  Tv,
  Globe,
  Clock,
  LogOut,
  Link2,
  Check,
  Edit3,
  X,
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  User,
  Pin,
  PinOff,
  Share2,
  Upload,
  Palette,
} from "lucide-react";
import {
  TelegramBrandIcon,
  BlueskyBrandIcon,
  RedditBrandIcon,
  FacebookBrandIcon,
  TumblrBrandIcon,
} from "@/components/admin/social-brand-icons";
import { getImageUrl } from "@/config/tmdb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OverviewData {
  counts: {
    movies: number;
    tvShows: number;
    activities: number;
    unpostedMovies: number;
    postedMovies: number;
  };
  settings: {
    siteName: string;
    defaultStreamServer: string;
    telegramEnabled: boolean;
    telegramChatId: string;
  };
  eventBreakdown: Array<{ type: string; count: number }>;
  recentActivities: Array<{
    id: string;
    eventType: string;
    path: string;
    searchTerm: string | null;
    device: string;
    browser: string;
    createdAt: string;
  }>;
}

interface ActivityItem {
  _id: string;
  sessionId: string;
  userType?: "anonymous" | "authenticated";
  eventType: string;
  path?: string;
  searchTerm?: string;
  contentType?: string;
  contentId?: string;
  device?: string;
  browser?: string;
  createdAt: string;
}

interface TelemetryStats {
  totalEvents: number;
  authenticatedCount: number;
  anonymousCount: number;
  topEventType: { type: string; count: number } | null;
  eventDistribution: Array<{ type: string; count: number }>;
}

interface StreamServer {
  id: string;
  name: string;
  baseUrl: string;
  type?: string;
  quality: string;
  description: string;
  isDefault: boolean;
  isEnabled: boolean;
  sampleEmbed: string;
  isCustom?: boolean;
  moviePattern?: string;
  tvPattern?: string;
}

interface MediaItem {
  id: string;
  title: string;
  tmdbId?: number | null;
  posterPath: string;
  streamUrl?: string | null;
  isAvailable: boolean;
  releaseDate?: string | null;
  telegramPostedAt?: string | null;
}

function getEmbedUrl(serverId: string, tmdbId: string): string {
  switch (serverId) {
    case "zxcstream": return `https://zxcstream.xyz/player/movie/${tmdbId}?autoplay=1`;
    case "moviepire": return `https://video.moviepire.co/embed/movie/${tmdbId}?autoplay=1`;
    case "vidlink": return `https://vidlink.pro/movie/${tmdbId}?autoplay=true`;
    case "multiembed": return `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`;
    case "autoembed": return `https://player.autoembed.cc/embed/movie/${tmdbId}`;
    case "vidsrcme.ru": return `https://vidsrcme.ru/embed/movie/${tmdbId}`;
    default: return `https://zxcstream.xyz/player/movie/${tmdbId}?autoplay=1`;
  }
}

export default function AdminPage() {
  const router = useRouter();

  // Auth Guard State
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [adminUser, setAdminUser] = useState<{ username: string; role: string; email?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "media" | "activity" | "streaming" | "social" | "autopost" | "seo">("overview");

  // Collapsible Sidebar Rail (matching Media project)
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const isSidebarExpanded = isSidebarPinned || isSidebarHovered;

  // Social Channels State (Telegram, Bluesky, Reddit, Facebook Page, Tumblr)
  type SocialPlatform = "telegram" | "bluesky" | "reddit" | "facebook" | "tumblr";
  const [activeSocialPlatform, setActiveSocialPlatform] = useState<SocialPlatform>("telegram");

  // Telegram
  const [tgBotToken, setTgBotToken] = useState("");
  const [tgChatId, setTgChatId] = useState("");
  const [tgGroupLink, setTgGroupLink] = useState("");
  const [tgEnabled, setTgEnabled] = useState(true);
  const [showTgToken, setShowTgToken] = useState(false);

  // Bluesky
  const [bskyIdentifier, setBskyIdentifier] = useState("");
  const [bskyPassword, setBskyPassword] = useState("");
  const [bskyServiceUrl, setBskyServiceUrl] = useState("https://bsky.social");
  const [bskyEnabled, setBskyEnabled] = useState(false);
  const [showBskyPassword, setShowBskyPassword] = useState(false);

  // Reddit
  const [redditClientId, setRedditClientId] = useState("");
  const [redditClientSecret, setRedditClientSecret] = useState("");
  const [redditUsername, setRedditUsername] = useState("");
  const [redditPassword, setRedditPassword] = useState("");
  const [redditSubreddit, setRedditSubreddit] = useState("");
  const [redditEnabled, setRedditEnabled] = useState(false);
  const [showRedditSecret, setShowRedditSecret] = useState(false);

  // Facebook
  const [fbPageToken, setFbPageToken] = useState("");
  const [fbPageId, setFbPageId] = useState("");
  const [fbEnabled, setFbEnabled] = useState(false);
  const [showFbToken, setShowFbToken] = useState(false);

  // Tumblr
  const [tumblrKey, setTumblrKey] = useState("");
  const [tumblrSecret, setTumblrSecret] = useState("");
  const [tumblrToken, setTumblrToken] = useState("");
  const [tumblrTokenSecret, setTumblrTokenSecret] = useState("");
  const [tumblrBlog, setTumblrBlog] = useState("");
  const [tumblrEnabled, setTumblrEnabled] = useState(false);
  const [showTumblrSecret, setShowTumblrSecret] = useState(false);

  // General Social States
  const [socialSiteUrl, setSocialSiteUrl] = useState("http://localhost:3000");
  const [socialStats, setSocialStats] = useState({ unpostedMovies: 0, postedMovies: 0, totalMovies: 0 });
  const [savingSocial, setSavingSocial] = useState(false);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [broadcastingNext, setBroadcastingNext] = useState(false);
  const [broadcastResults, setBroadcastResults] = useState<Record<string, { success: boolean; message: string }> | null>(null);

  // Notification Banner
  const [actionNotice, setActionNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Overview State
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);

  // Media Tab State
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaSearch, setMediaSearch] = useState("");
  const [mediaStatus, setMediaStatus] = useState<"all" | "available" | "unavailable">("all");
  const [mediaPage, setMediaPage] = useState(1);
  const [mediaTotalPages, setMediaTotalPages] = useState(1);
  const [mediaTotalCount, setMediaTotalCount] = useState(0);
  const [editingMedia, setEditingMedia] = useState<{ id: string; title: string; streamUrl: string } | null>(null);
  const [updatingMediaId, setUpdatingMediaId] = useState<string | null>(null);

  // User Activity State
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotalPages, setActivityTotalPages] = useState(1);
  const [activityTotalCount, setActivityTotalCount] = useState(0);
  const [activityTimeframe, setActivityTimeframe] = useState("all");
  const [activityEventType, setActivityEventType] = useState("all");
  const [activityUserType, setActivityUserType] = useState("all");
  const [activitySearch, setActivitySearch] = useState("");
  const [activityTelemetry, setActivityTelemetry] = useState<TelemetryStats | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Streaming State
  const [servers, setServers] = useState<StreamServer[]>([]);
  const [defaultServerId, setDefaultServerId] = useState("zxcstream");
  const [testingServerId, setTestingServerId] = useState<string | null>(null);
  const [scanningAll, setScanningAll] = useState(false);
  const [autoDeactivateBroken, setAutoDeactivateBroken] = useState(true);
  const [serverLatencies, setServerLatencies] = useState<Record<string, { latency: string; online: boolean }>>({});
  const [testTmdbId, setTestTmdbId] = useState("1300968");
  const [previewEmbedUrl, setPreviewEmbedUrl] = useState("https://zxcstream.xyz/player/movie/1300968?autoplay=1");

  // Add Stream Server Modal State
  const [showAddServerModal, setShowAddServerModal] = useState(false);
  const [newServerName, setNewServerName] = useState("");
  const [newServerBaseUrl, setNewServerBaseUrl] = useState("");
  const [newServerQuality, setNewServerQuality] = useState("1080p");
  const [newServerDescription, setNewServerDescription] = useState("");
  const [newServerMoviePattern, setNewServerMoviePattern] = useState("");
  const [newServerTvPattern, setNewServerTvPattern] = useState("");
  const [addingServer, setAddingServer] = useState(false);
  const [deletingServerId, setDeletingServerId] = useState<string | null>(null);

  // Telegram Auto-Post State
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [siteUrl, setSiteUrl] = useState("http://localhost:3000");
  const [showToken, setShowToken] = useState(false);
  const [autoPostEnabled, setAutoPostEnabled] = useState(true);
  const [telegramStats, setTelegramStats] = useState({ unpostedMovies: 0, postedMovies: 0, totalMovies: 0 });
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingBot, setTestingBot] = useState(false);
  const [postingNext, setPostingNext] = useState(false);

  // SEO & Search Console State
  const [seoSettings, setSeoSettings] = useState({
    siteTitle: "",
    siteDescription: "",
    siteKeywords: "",
    siteUrl: "",
    googleVerification: "",
    bingVerification: "",
    ogImage: "",
    twitterHandle: "",
    logoText: "STREAMFLIX",
    logoImageUrl: "",
    logoSubtitle: "Ultra HD & 4K Streaming Platform",
    logoColor: "#E50914",
  });
  const [seoStats, setSeoStats] = useState<{
    totalAvailableMovies: number;
    sitemapUrl: string;
    robotsUrl: string;
    estimatedSitemapUrls: number;
    lastUpdated: string;
  } | null>(null);
  const [savingSeo, setSavingSeo] = useState(false);
  const [probeUrl, setProbeUrl] = useState("");
  const [probingUrl, setProbingUrl] = useState(false);
  const [probeResult, setProbeResult] = useState<any>(null);
  const [pingingEngines, setPingingEngines] = useState(false);

  const showNotification = useCallback((type: "success" | "error", message: string) => {
    setActionNotice({ type, message });
    setTimeout(() => setActionNotice(null), 4000);
  }, []);

  // Auth Verification
  useEffect(() => {
    async function verifyAuth() {
      try {
        const res = await fetch("/api/admin/auth", { cache: "no-store" });
        const data = await res.json();
        if (!data.authenticated) {
          window.location.href = "/admin/login";
          return;
        }
        if (data.user) {
          setAdminUser(data.user);
        }
        setCheckingAuth(false);
      } catch {
        window.location.href = "/admin/login";
      }
    }
    verifyAuth();
  }, []);

  const handleSignOut = async () => {
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
    } catch {
      // Ignore
    }
    window.location.href = "/admin/login";
  };

  // 1. Fetch Overview
  const fetchOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const res = await fetch("/api/admin/overview");
      const json = await res.json();
      if (json.success) {
        setOverview(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  // 2. Fetch Media
  const fetchMedia = useCallback(async () => {
    setMediaLoading(true);
    try {
      const query = new URLSearchParams({
        page: mediaPage.toString(),
        limit: "18",
        status: mediaStatus,
      });
      if (mediaSearch.trim()) {
        query.set("search", mediaSearch.trim());
      }
      const res = await fetch(`/api/admin/media?${query.toString()}`);
      const json = await res.json();
      if (json.success) {
        setMediaItems(json.items || json.data?.items || []);
        if (json.pagination) {
          setMediaTotalPages(json.pagination.totalPages || 1);
          setMediaTotalCount(json.pagination.total || 0);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMediaLoading(false);
    }
  }, [mediaPage, mediaStatus, mediaSearch]);

  // 3. Fetch Activities
  const fetchActivities = useCallback(async () => {
    setLoadingActivity(true);
    try {
      const query = new URLSearchParams({
        page: activityPage.toString(),
        limit: "25",
        eventType: activityEventType,
        userType: activityUserType,
        timeframe: activityTimeframe,
        search: activitySearch,
      });
      const res = await fetch(`/api/admin/activity?${query.toString()}`);
      const json = await res.json();
      if (json.success) {
        setActivities(json.data);
        setActivityTotalPages(json.pagination.totalPages || 1);
        setActivityTotalCount(json.pagination.total || 0);
        if (json.telemetry) {
          setActivityTelemetry(json.telemetry);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingActivity(false);
    }
  }, [activityPage, activityEventType, activityUserType, activityTimeframe, activitySearch]);

  // 4. Fetch Streaming Servers
  const fetchStreaming = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/streaming");
      const json = await res.json();
      if (json.success) {
        setServers(json.data.servers || []);
        setDefaultServerId(json.data.defaultServerId || "moviepire");
        setPreviewEmbedUrl(getEmbedUrl(json.data.defaultServerId || "moviepire", testTmdbId));
      }
    } catch (e) {
      console.error(e);
    }
  }, [testTmdbId]);

  // 5. Fetch Social Outlets & Channels
  const fetchSocial = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/autopost");
      const json = await res.json();
      if (json.success && json.data) {
        const { telegram, bluesky, reddit, facebook, tumblr, stats } = json.data;
        if (telegram) {
          setTgBotToken(telegram.botToken || "8558209379:AAE8qiLXd9vu-DCp-sMP1j22kob5-0q_0lw");
          setTgChatId(telegram.chatId || "-1003606758795");
          setTgGroupLink(telegram.groupLink || "");
          setTgEnabled(telegram.enabled ?? true);
          if (telegram.siteUrl) setSocialSiteUrl(telegram.siteUrl);
        }
        if (bluesky) {
          setBskyIdentifier(bluesky.identifier || "");
          setBskyPassword(bluesky.appPassword || "");
          setBskyServiceUrl(bluesky.serviceUrl || "https://bsky.social");
          setBskyEnabled(Boolean(bluesky.enabled));
        }
        if (reddit) {
          setRedditClientId(reddit.clientId || "");
          setRedditClientSecret(reddit.clientSecret || "");
          setRedditUsername(reddit.username || "");
          setRedditPassword(reddit.password || "");
          setRedditSubreddit(reddit.subreddit || "");
          setRedditEnabled(Boolean(reddit.enabled));
        }
        if (facebook) {
          setFbPageToken(facebook.pageAccessToken || "");
          setFbPageId(facebook.pageId || "");
          setFbEnabled(Boolean(facebook.enabled));
        }
        if (tumblr) {
          setTumblrKey(tumblr.consumerKey || "");
          setTumblrSecret(tumblr.consumerSecret || "");
          setTumblrToken(tumblr.token || "");
          setTumblrTokenSecret(tumblr.tokenSecret || "");
          setTumblrBlog(tumblr.blogIdentifier || "");
          setTumblrEnabled(Boolean(tumblr.enabled));
        }
        if (stats) {
          setSocialStats(stats);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchTelegram = fetchSocial;

  // 6. Fetch SEO & Search Console Settings
  const fetchSeo = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/seo");
      const json = await res.json();
      if (json.success && json.data) {
        setSeoSettings({
          siteTitle: json.data.seo.siteTitle || "",
          siteDescription: json.data.seo.siteDescription || "",
          siteKeywords: json.data.seo.siteKeywords || "",
          siteUrl: json.data.seo.siteUrl || "",
          googleVerification: json.data.seo.googleVerification || "",
          bingVerification: json.data.seo.bingVerification || "",
          ogImage: json.data.seo.ogImage || "",
          twitterHandle: json.data.seo.twitterHandle || "",
          logoText: json.data.logo?.text || "STREAMFLIX",
          logoImageUrl: json.data.logo?.imageUrl || "",
          logoSubtitle: json.data.logo?.subtitle || "Ultra HD & 4K Streaming Platform",
          logoColor: json.data.logo?.color || "#E50914",
        });
        setSeoStats(json.data.stats);
        setProbeUrl((prev) => (prev.trim() ? prev : json.data.stats?.sitemapUrl || "http://localhost:3000/sitemap.xml"));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (!checkingAuth) {
      fetchOverview();
      fetchMedia();
      fetchActivities();
      fetchStreaming();
      fetchSocial();
      fetchSeo();
    }
  }, [checkingAuth, fetchOverview, fetchMedia, fetchActivities, fetchStreaming, fetchSocial, fetchSeo]);

  // Media Actions
  const handleToggleMediaAvailability = async (id: string, currentStatus: boolean) => {
    setUpdatingMediaId(id);
    try {
      const res = await fetch("/api/admin/media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isAvailable: !currentStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setMediaItems((prev) =>
          prev.map((m) => (m.id === id ? { ...m, isAvailable: !currentStatus } : m))
        );
        showNotification("success", `Movie availability updated`);
      } else {
        showNotification("error", data.message || "Failed to update availability");
      }
    } catch {
      showNotification("error", "Error updating availability");
    } finally {
      setUpdatingMediaId(null);
    }
  };

  const handleSaveStreamUrl = async () => {
    if (!editingMedia) return;
    setUpdatingMediaId(editingMedia.id);
    try {
      const res = await fetch("/api/admin/media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingMedia.id, streamUrl: editingMedia.streamUrl }),
      });
      const data = await res.json();
      if (data.success) {
        setMediaItems((prev) =>
          prev.map((m) => (m.id === editingMedia.id ? { ...m, streamUrl: editingMedia.streamUrl } : m))
        );
        setEditingMedia(null);
        showNotification("success", `Stream URL saved`);
      } else {
        showNotification("error", data.message || "Failed to save stream URL");
      }
    } catch {
      showNotification("error", "Error saving stream URL");
    } finally {
      setUpdatingMediaId(null);
    }
  };

  // Streaming Actions
  const handleSetDefaultServer = async (serverId: string) => {
    try {
      const res = await fetch("/api/admin/streaming", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_default", serverId }),
      });
      const data = await res.json();
      if (data.success) {
        setDefaultServerId(serverId);
        showNotification("success", `Default set to ${serverId}`);
        fetchStreaming();
      }
    } catch {
      showNotification("error", "Failed to set default server");
    }
  };

  const handleTestServer = async (serverId: string) => {
    setTestingServerId(serverId);
    try {
      const res = await fetch("/api/admin/streaming", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test_server", serverId, autoDeactivate: autoDeactivateBroken }),
      });
      const data = await res.json();
      setServerLatencies((prev) => ({
        ...prev,
        [serverId]: { latency: data.latency, online: data.online },
      }));
      if (data.autoDeactivated) {
        showNotification("error", `Server '${serverId}' offline and auto-deactivated`);
        fetchStreaming();
      }
    } catch {
      setServerLatencies((prev) => ({
        ...prev,
        [serverId]: { latency: "Timeout", online: false },
      }));
    } finally {
      setTestingServerId(null);
    }
  };

  const handleScanAllServers = async () => {
    setScanningAll(true);
    try {
      const res = await fetch("/api/admin/streaming", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_all",
          autoDeactivate: autoDeactivateBroken,
        }),
      });
      const data = await res.json();
      if (data.success && data.results) {
        setServerLatencies(data.results);
        showNotification("success", `Scanned servers: ${data.newlyDeactivatedCount || 0} offline deactivated`);
        fetchStreaming();
      }
    } catch {
      showNotification("error", "Failed to scan streaming servers");
    } finally {
      setScanningAll(false);
    }
  };

  const handleToggleServer = async (serverId: string) => {
    try {
      const res = await fetch("/api/admin/streaming", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_server", serverId }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification("success", `Server status updated`);
        fetchStreaming();
      }
    } catch {
      showNotification("error", "Failed to toggle server");
    }
  };

  const handleAddServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServerName.trim() || !newServerBaseUrl.trim()) {
      showNotification("error", "Server name and base URL are required.");
      return;
    }

    setAddingServer(true);
    try {
      const res = await fetch("/api/admin/streaming", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_server",
          name: newServerName.trim(),
          baseUrl: newServerBaseUrl.trim(),
          quality: newServerQuality,
          description: newServerDescription.trim(),
          moviePattern: newServerMoviePattern.trim(),
          tvPattern: newServerTvPattern.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        showNotification("success", data.message || "New stream server added!");
        setShowAddServerModal(false);
        setNewServerName("");
        setNewServerBaseUrl("");
        setNewServerDescription("");
        setNewServerMoviePattern("");
        setNewServerTvPattern("");
        fetchStreaming();
      } else {
        showNotification("error", data.message || "Failed to add stream server");
      }
    } catch {
      showNotification("error", "Network error adding stream server");
    } finally {
      setAddingServer(false);
    }
  };

  const handleDeleteServer = async (serverId: string) => {
    if (!confirm(`Are you sure you want to delete server '${serverId}'?`)) return;
    setDeletingServerId(serverId);
    try {
      const res = await fetch("/api/admin/streaming", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_server",
          serverId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification("success", data.message || "Server deleted");
        fetchStreaming();
      } else {
        showNotification("error", data.message || "Failed to delete server");
      }
    } catch {
      showNotification("error", "Network error deleting server");
    } finally {
      setDeletingServerId(null);
    }
  };

  // Social Actions
  const handleSaveSocialSettings = async () => {
    setSavingSocial(true);
    try {
      const res = await fetch("/api/admin/autopost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_social_settings",
          telegram: {
            botToken: tgBotToken,
            chatId: tgChatId,
            groupLink: tgGroupLink,
            siteUrl: socialSiteUrl,
            enabled: tgEnabled,
          },
          bluesky: {
            identifier: bskyIdentifier,
            appPassword: bskyPassword,
            serviceUrl: bskyServiceUrl,
            enabled: bskyEnabled,
          },
          reddit: {
            clientId: redditClientId,
            clientSecret: redditClientSecret,
            username: redditUsername,
            password: redditPassword,
            subreddit: redditSubreddit,
            enabled: redditEnabled,
          },
          facebook: {
            pageAccessToken: fbPageToken,
            pageId: fbPageId,
            enabled: fbEnabled,
          },
          tumblr: {
            consumerKey: tumblrKey,
            consumerSecret: tumblrSecret,
            token: tumblrToken,
            tokenSecret: tumblrTokenSecret,
            blogIdentifier: tumblrBlog,
            enabled: tumblrEnabled,
          },
          siteUrl: socialSiteUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification("success", data.message || "Social settings saved");
        fetchSocial();
      } else {
        showNotification("error", data.message || "Failed to save settings");
      }
    } catch {
      showNotification("error", "Network error saving settings");
    } finally {
      setSavingSocial(false);
    }
  };

  const handleTestChannel = async (channel: SocialPlatform) => {
    setTestingChannel(channel);
    try {
      const payload: any = { action: "test_channel", channel };
      if (channel === "telegram") {
        payload.botToken = tgBotToken;
        payload.chatId = tgChatId;
      } else if (channel === "bluesky") {
        payload.identifier = bskyIdentifier;
        payload.appPassword = bskyPassword;
        payload.serviceUrl = bskyServiceUrl;
      } else if (channel === "reddit") {
        payload.clientId = redditClientId;
        payload.clientSecret = redditClientSecret;
        payload.username = redditUsername;
        payload.password = redditPassword;
      } else if (channel === "facebook") {
        payload.pageAccessToken = fbPageToken;
        payload.pageId = fbPageId;
      } else if (channel === "tumblr") {
        payload.consumerKey = tumblrKey;
        payload.blogIdentifier = tumblrBlog;
      }

      const res = await fetch("/api/admin/autopost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showNotification("success", data.message || `${channel} connection verified!`);
      } else {
        showNotification("error", data.message || `${channel} verification failed`);
      }
    } catch (e: any) {
      showNotification("error", e.message || "Network error testing channel");
    } finally {
      setTestingChannel(null);
    }
  };

  const handleBroadcastNext = async () => {
    setBroadcastingNext(true);
    setBroadcastResults(null);
    try {
      const res = await fetch("/api/admin/autopost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "broadcast_next" }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification("success", data.message || "Broadcast completed");
        if (data.results) setBroadcastResults(data.results);
        fetchSocial();
        fetchOverview();
      } else {
        showNotification("error", data.message || "Failed to broadcast");
      }
    } catch (e: any) {
      showNotification("error", e.message || "Network error");
    } finally {
      setBroadcastingNext(false);
    }
  };

  const handleSaveTelegram = handleSaveSocialSettings;
  const handleTestTelegramBot = () => handleTestChannel("telegram");
  const handlePostNextMovie = handleBroadcastNext;

  // SEO & Search Console Handlers
  const handleSaveSeo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingSeo(true);
    try {
      const res = await fetch("/api/admin/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_settings",
          ...seoSettings,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification("success", "SEO and Search Engine settings saved!");
        fetchSeo();
      } else {
        showNotification("error", data.message || "Failed to save SEO settings");
      }
    } catch {
      showNotification("error", "Network error saving SEO settings");
    } finally {
      setSavingSeo(false);
    }
  };

  const handleRunProbe = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!probeUrl.trim()) return;
    setProbingUrl(true);
    setProbeResult(null);
    try {
      const res = await fetch("/api/admin/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "probe",
          url: probeUrl.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setProbeResult(data.data);
        if (data.data.ok) {
          showNotification("success", `Googlebot inspection OK (HTTP ${data.data.status})`);
        } else {
          showNotification("error", `Googlebot probe error (HTTP ${data.data.status})`);
        }
      } else {
        showNotification("error", data.message || "Probe failed");
      }
    } catch {
      showNotification("error", "Network error running Googlebot probe");
    } finally {
      setProbingUrl(false);
    }
  };

  const handlePingSearchEngines = async () => {
    setPingingEngines(true);
    try {
      const res = await fetch("/api/admin/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ping_engines" }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification("success", "Sitemaps submitted to Google and Bing!");
      } else {
        showNotification("error", data.message || "Failed to ping search engines");
      }
    } catch {
      showNotification("error", "Network error pinging search engines");
    } finally {
      setPingingEngines(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-neutral-100 flex flex-col font-sans selection:bg-[#E50914] selection:text-white">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-[#141414]/95 backdrop-blur border-b border-white/10 px-4 md:px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition px-2 py-1 bg-neutral-900 border border-white/10"
            title="Return to user streaming interface"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Streamflix</span>
          </Link>

          <div className="h-4 w-px bg-white/10" />

          <div className="flex items-center gap-2">
            <span className="text-[#E50914] font-black text-base tracking-tight uppercase">STREAMFLIX</span>
            <span className="text-[10px] bg-red-950/80 text-red-400 border border-red-500/30 px-1.5 py-0.5 font-bold uppercase tracking-wider">
              ADMIN
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-neutral-400 bg-neutral-900 border border-white/10 px-2 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <Database className="w-3 h-3 text-emerald-400" />
            <span className="font-mono">Atlas</span>
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-white/10 px-2.5 py-1 transition cursor-pointer"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <User className="w-3.5 h-3.5 text-neutral-400" />
            <LogOut className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </header>

      {/* Floating Action Notice */}
      {actionNotice && (
        <div
          className={`fixed top-14 right-4 z-50 px-3.5 py-2 border shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-1 ${
            actionNotice.type === "success"
              ? "bg-emerald-950/95 border-emerald-500/40 text-emerald-200"
              : "bg-red-950/95 border-red-500/40 text-red-200"
          }`}
        >
          {actionNotice.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span className="text-xs font-medium">{actionNotice.message}</span>
        </div>
      )}

      {/* Main Body */}
      <div className="flex-1 flex flex-col md:flex-row max-w-[1700px] w-full mx-auto p-3 md:p-5 gap-4">
        {/* Collapsible Navigation Sidebar Rail (Media UI Style) */}
        <aside
          className={`w-full md:flex-none flex flex-col bg-[#141414] border border-white/10 transition-all duration-200 select-none ${
            isSidebarExpanded ? "md:w-56" : "md:w-16"
          }`}
          onMouseEnter={() => setIsSidebarHovered(true)}
          onMouseLeave={() => setIsSidebarHovered(false)}
        >
          {/* Rail Header with Pin toggle button */}
          <div className="hidden md:flex items-center justify-between h-9 px-2.5 border-b border-white/10 shrink-0">
            <span
              className={`text-[10px] font-mono uppercase font-bold text-neutral-400 tracking-wider transition-opacity duration-200 ${
                isSidebarExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
              }`}
            >
              Navigation
            </span>
            <button
              onClick={() => setIsSidebarPinned(!isSidebarPinned)}
              className="p-1 hover:bg-neutral-800 text-neutral-400 hover:text-white transition cursor-pointer"
              title={isSidebarPinned ? "Unpin Sidebar (Auto-collapse)" : "Pin Sidebar Open"}
            >
              {isSidebarPinned ? <PinOff className="w-3.5 h-3.5 text-red-500" /> : <Pin className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-1.5 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible flex-1">
            {/* Overview */}
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center p-2 text-xs font-semibold transition cursor-pointer border ${
                activeTab === "overview"
                  ? "bg-[#222222] text-white border-white/20 shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900 border-transparent"
              } ${isSidebarExpanded ? "gap-2.5 w-full text-left" : "md:justify-center w-full"}`}
              title="Dashboard Overview"
            >
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <LayoutDashboard className="w-4 h-4 text-red-500" />
              </div>
              <div
                className={`flex items-center justify-between flex-1 min-w-0 transition-all duration-150 ${
                  isSidebarExpanded ? "opacity-100 max-w-full" : "opacity-0 max-w-0 overflow-hidden hidden md:hidden"
                }`}
              >
                <span className="truncate">Overview</span>
              </div>
            </button>

            {/* Media */}
            <button
              onClick={() => setActiveTab("media")}
              className={`flex items-center p-2 text-xs font-semibold transition cursor-pointer border ${
                activeTab === "media"
                  ? "bg-[#222222] text-white border-white/20 shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900 border-transparent"
              } ${isSidebarExpanded ? "gap-2.5 w-full text-left" : "md:justify-center w-full"}`}
              title="Media Catalog"
            >
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <Film className="w-4 h-4 text-red-400" />
              </div>
              <div
                className={`flex items-center justify-between flex-1 min-w-0 transition-all duration-150 ${
                  isSidebarExpanded ? "opacity-100 max-w-full" : "opacity-0 max-w-0 overflow-hidden hidden md:hidden"
                }`}
              >
                <span className="truncate">Media</span>
                <span className="text-[10px] font-mono bg-neutral-900 border border-white/10 text-neutral-400 px-1 py-0.2">
                  Catalog
                </span>
              </div>
            </button>

            {/* Social Hub */}
            <button
              onClick={() => setActiveTab("social")}
              className={`flex items-center p-2 text-xs font-semibold transition cursor-pointer border ${
                activeTab === "social" || activeTab === "autopost"
                  ? "bg-[#222222] text-white border-white/20 shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900 border-transparent"
              } ${isSidebarExpanded ? "gap-2.5 w-full text-left" : "md:justify-center w-full"}`}
              title="Social Media Broadcast Hub (Telegram, Bluesky, Reddit, Facebook, Tumblr)"
            >
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <Share2 className="w-4 h-4 text-cyan-400" />
              </div>
              <div
                className={`flex items-center justify-between flex-1 min-w-0 transition-all duration-150 ${
                  isSidebarExpanded ? "opacity-100 max-w-full" : "opacity-0 max-w-0 overflow-hidden hidden md:hidden"
                }`}
              >
                <span className="truncate">Social</span>
                <span className="text-[10px] bg-cyan-950 text-cyan-300 px-1 py-0.2 border border-cyan-500/20 font-mono">
                  5 Outlets
                </span>
              </div>
            </button>

            {/* Streaming */}
            <button
              onClick={() => setActiveTab("streaming")}
              className={`flex items-center p-2 text-xs font-semibold transition cursor-pointer border ${
                activeTab === "streaming"
                  ? "bg-[#222222] text-white border-white/20 shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900 border-transparent"
              } ${isSidebarExpanded ? "gap-2.5 w-full text-left" : "md:justify-center w-full"}`}
              title="Stream Server URLs"
            >
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <Server className="w-4 h-4 text-blue-400" />
              </div>
              <div
                className={`flex items-center justify-between flex-1 min-w-0 transition-all duration-150 ${
                  isSidebarExpanded ? "opacity-100 max-w-full" : "opacity-0 max-w-0 overflow-hidden hidden md:hidden"
                }`}
              >
                <span className="truncate">Streaming</span>
                <span className="text-[10px] font-mono bg-neutral-900 border border-white/10 text-emerald-400 px-1 py-0.2">
                  URLs
                </span>
              </div>
            </button>

            {/* Activity */}
            <button
              onClick={() => setActiveTab("activity")}
              className={`flex items-center p-2 text-xs font-semibold transition cursor-pointer border ${
                activeTab === "activity"
                  ? "bg-[#222222] text-white border-white/20 shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900 border-transparent"
              } ${isSidebarExpanded ? "gap-2.5 w-full text-left" : "md:justify-center w-full"}`}
              title="User Activity & Telemetry"
            >
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <div
                className={`flex items-center justify-between flex-1 min-w-0 transition-all duration-150 ${
                  isSidebarExpanded ? "opacity-100 max-w-full" : "opacity-0 max-w-0 overflow-hidden hidden md:hidden"
                }`}
              >
                <span className="truncate">Activity</span>
                <span className="text-[10px] font-mono bg-neutral-900 border border-white/10 text-neutral-400 px-1 py-0.2">
                  {activityTotalCount ? `${(activityTotalCount / 1000).toFixed(0)}k` : "Logs"}
                </span>
              </div>
            </button>

            {/* SEO & Search Console */}
            <button
              onClick={() => setActiveTab("seo")}
              className={`flex items-center p-2 text-xs font-semibold transition cursor-pointer border ${
                activeTab === "seo"
                  ? "bg-[#222222] text-white border-white/20 shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900 border-transparent"
              } ${isSidebarExpanded ? "gap-2.5 w-full text-left" : "md:justify-center w-full"}`}
              title="SEO, Dynamic Sitemaps & Search Console Probe"
            >
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4 text-amber-400" />
              </div>
              <div
                className={`flex items-center justify-between flex-1 min-w-0 transition-all duration-150 ${
                  isSidebarExpanded ? "opacity-100 max-w-full" : "opacity-0 max-w-0 overflow-hidden hidden md:hidden"
                }`}
              >
                <span className="truncate">SEO</span>
                <span className="text-[10px] font-mono bg-amber-950/80 text-amber-300 border border-amber-500/30 px-1 py-0.2">
                  Console
                </span>
              </div>
            </button>
          </nav>

          {/* Quick Engine Status Pill */}
          <div className="p-2 border-t border-white/10 hidden md:block">
            <div className={`bg-[#0e0e0e] border border-white/10 p-2 font-mono text-[10px] space-y-1 ${isSidebarExpanded ? "" : "text-center"}`}>
              {isSidebarExpanded ? (
                <>
                  <div className="text-neutral-500 uppercase tracking-wider text-[9px]">Server Engine</div>
                  <div className="text-white font-bold truncate uppercase">{defaultServerId}</div>
                  <div className="text-emerald-400 flex items-center gap-1 text-[9px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
                  </div>
                </>
              ) : (
                <div title={`Engine: ${defaultServerId} (Online)`} className="flex justify-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Right Content Area */}
        <main className="flex-1 min-w-0">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-white">System Overview</h1>
                  <span className="text-[11px] font-mono text-neutral-500">Live</span>
                </div>
                <button
                  onClick={fetchOverview}
                  disabled={loadingOverview}
                  className="flex items-center gap-1.5 text-xs bg-[#141414] hover:bg-neutral-800 border border-white/10 px-2.5 py-1 text-neutral-200 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingOverview ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* 4 KPI Dense Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div className="p-3 bg-[#141414] border border-white/10">
                  <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                    <span>Movies</span>
                    <Film className="w-3.5 h-3.5 text-red-500" />
                  </div>
                  <div className="text-xl font-bold font-mono text-white mt-1">
                    {overview?.counts.movies?.toLocaleString() || "59,460"}
                  </div>
                  <div className="text-[10px] text-neutral-500 font-mono">Catalog</div>
                </div>

                <div className="p-3 bg-[#141414] border border-white/10">
                  <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                    <span>Series</span>
                    <Tv className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="text-xl font-bold font-mono text-white mt-1">
                    {overview?.counts.tvShows?.toLocaleString() || "3,475"}
                  </div>
                  <div className="text-[10px] text-neutral-500 font-mono">Catalog</div>
                </div>

                <div className="p-3 bg-[#141414] border border-white/10">
                  <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                    <span>Activities</span>
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="text-xl font-bold font-mono text-white mt-1">
                    {overview?.counts.activities?.toLocaleString() || "392,031"}
                  </div>
                  <div className="text-[10px] text-neutral-500 font-mono">Audited events</div>
                </div>

                <div className="p-3 bg-[#141414] border border-white/10">
                  <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                    <span>Streaming Engine</span>
                    <Server className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div className="text-base font-bold font-mono text-white mt-1 truncate uppercase">
                    {overview?.settings.defaultStreamServer || "moviepire"}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <Check className="w-2.5 h-2.5" /> Ready
                  </div>
                </div>
              </div>

              {/* Event Distribution Chips */}
              <div className="p-3 bg-[#141414] border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-neutral-300">Activity Breakdown</span>
                  <span className="text-[10px] text-neutral-500 font-mono">Counts</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {overview?.eventBreakdown?.map((item) => (
                    <div
                      key={item.type}
                      className="px-2 py-1 bg-neutral-900 border border-white/10 text-[11px] font-mono flex items-center gap-1.5"
                    >
                      <span className="text-neutral-400">{item.type}</span>
                      <span className="text-white font-bold">{item.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Log Preview + Telegram Quick Trigger */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="lg:col-span-2 p-3 bg-[#141414] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-300">Recent Signals</span>
                    <button
                      onClick={() => setActiveTab("activity")}
                      className="text-[11px] text-red-400 hover:text-red-300 transition"
                    >
                      View all →
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-neutral-300">
                      <thead className="bg-neutral-900 text-neutral-400 border-b border-white/10 uppercase text-[10px] font-mono">
                        <tr>
                          <th className="py-2 px-2.5">Event</th>
                          <th className="py-2 px-2.5">Path / Query</th>
                          <th className="py-2 px-2.5">Device</th>
                          <th className="py-2 px-2.5 text-right">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                        {overview?.recentActivities?.map((act) => (
                          <tr key={act.id} className="hover:bg-neutral-900/50">
                            <td className="py-2 px-2.5">
                              <span
                                className={`px-1.5 py-0.5 text-[9px] uppercase font-bold ${
                                  act.eventType === "movie_play"
                                    ? "bg-emerald-950 text-emerald-300 border border-emerald-500/30"
                                    : act.eventType === "search"
                                    ? "bg-purple-950 text-purple-300 border border-purple-500/30"
                                    : "bg-blue-950 text-blue-300 border border-blue-500/30"
                                }`}
                              >
                                {act.eventType}
                              </span>
                            </td>
                            <td className="py-2 px-2.5 truncate max-w-[200px] text-neutral-200">
                              {act.searchTerm ? `🔍 ${act.searchTerm}` : act.path}
                            </td>
                            <td className="py-2 px-2.5 text-neutral-400">{act.device || "Desktop"}</td>
                            <td className="py-2 px-2.5 text-right text-neutral-500">
                              {new Date(act.createdAt).toLocaleTimeString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Compact Auto-Post Card */}
                <div className="p-3 bg-[#141414] border border-white/10 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-neutral-300">
                      <span className="flex items-center gap-1.5 text-cyan-400">
                        <Send className="w-3.5 h-3.5" /> Telegram Bot
                      </span>
                      <span className="text-[10px] font-mono text-neutral-500">Channel</span>
                    </div>

                    <div className="p-2.5 bg-neutral-900 border border-white/10 space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between text-neutral-400">
                        <span>Queued:</span>
                        <span className="text-white font-bold">{overview?.counts.unpostedMovies?.toLocaleString() || "59,425"}</span>
                      </div>
                      <div className="flex justify-between text-neutral-400">
                        <span>Published:</span>
                        <span className="text-emerald-400 font-bold">{overview?.counts.postedMovies?.toLocaleString() || "35"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <button
                      onClick={handlePostNextMovie}
                      disabled={postingNext}
                      className="w-full py-2 bg-[#E50914] hover:bg-[#b80710] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {postingNext ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                      <span>Post Next Movie</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("autopost")}
                      className="w-full py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs border border-white/10 transition text-center"
                    >
                      Configure Bot
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MEDIA (CONSISTENT WITH FRONT-END MEDIA LAYOUT) */}
          {activeTab === "media" && (
            <div className="space-y-3.5">
              {/* Header & Filter Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141414] border border-white/10 p-3">
                <div className="flex items-center gap-3">
                  <div>
                    <h1 className="text-base font-bold text-white">Media Catalog</h1>
                    <p className="text-[11px] text-neutral-500 font-mono">
                      {mediaTotalCount.toLocaleString()} indexed titles
                    </p>
                  </div>
                  <div className="h-5 w-px bg-white/10" />
                  {/* Status Filter Pills */}
                  <div className="flex items-center gap-1">
                    {(["all", "available", "unavailable"] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => {
                          setMediaStatus(st);
                          setMediaPage(1);
                        }}
                        className={`px-2.5 py-1 text-xs capitalize transition cursor-pointer border ${
                          mediaStatus === st
                            ? "bg-neutral-800 text-white border-white/20"
                            : "bg-neutral-900 text-neutral-400 border-white/5 hover:text-white"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search title, tmdb..."
                      value={mediaSearch}
                      onChange={(e) => {
                        setMediaSearch(e.target.value);
                        setMediaPage(1);
                      }}
                      className="w-48 sm:w-60 bg-[#0e0e0e] border border-white/10 pl-8 pr-2.5 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#E50914]"
                    />
                  </div>
                  <button
                    onClick={fetchMedia}
                    disabled={mediaLoading}
                    className="p-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-white/10 transition cursor-pointer"
                    title="Refresh Media"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${mediaLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Media Cards Grid - Netflix / Front-End Style */}
              <div className="min-h-[400px]">
                {mediaLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
                  </div>
                ) : mediaItems.length === 0 ? (
                  <div className="p-12 text-center text-xs text-neutral-500 bg-[#141414] border border-white/10">
                    No media items found matching criteria.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {mediaItems.map((item) => {
                      const posterUrl = getImageUrl(item.posterPath, "poster");
                      const releaseYear = (item.releaseDate || "").slice(0, 4) || "—";
                      const isUpdating = updatingMediaId === item.id;

                      return (
                        <div
                          key={item.id}
                          className="group relative flex flex-col bg-[#141414] border border-white/10 hover:border-white/30 transition shadow-sm"
                        >
                          {/* Poster Thumbnail */}
                          <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-950">
                            <Image
                              src={posterUrl}
                              alt={item.title}
                              fill
                              sizes="(max-width: 768px) 150px, 200px"
                              className="object-cover transition-transform duration-200 group-hover:scale-105"
                            />

                            {/* Release Year Chip (Top-Right) */}
                            <div className="absolute top-1.5 right-1.5 z-10">
                              <span className="text-[10px] font-mono font-semibold text-neutral-200 bg-black/80 backdrop-blur-sm px-1.5 py-0.5 border border-white/15">
                                {releaseYear}
                              </span>
                            </div>

                            {/* Stream URL Status Icon (Top-Left) */}
                            <div className="absolute top-1.5 left-1.5 z-10">
                              <button
                                onClick={() =>
                                  setEditingMedia({
                                    id: item.id,
                                    title: item.title,
                                    streamUrl: item.streamUrl || "",
                                  })
                                }
                                className={`p-1 backdrop-blur-sm border transition cursor-pointer ${
                                  item.streamUrl
                                    ? "bg-blue-950/80 border-blue-500/40 text-blue-300 hover:bg-blue-900"
                                    : "bg-black/80 border-white/15 text-neutral-500 hover:text-neutral-300"
                                }`}
                                title={item.streamUrl ? `Custom URL: ${item.streamUrl}` : "Set Custom Stream URL"}
                              >
                                <Link2 className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Bottom Gradient overlay */}
                            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                          </div>

                          {/* Card Content & Compact Controls */}
                          <div className="p-2 space-y-1.5 flex flex-col justify-between flex-1">
                            <div>
                              <h3
                                className="text-xs font-semibold text-white truncate"
                                title={item.title}
                              >
                                {item.title}
                              </h3>
                              <div className="text-[10px] font-mono text-neutral-500 truncate">
                                TMDB: {item.tmdbId ?? "—"}
                              </div>
                            </div>

                            {/* Availability Toggle Pill */}
                            <div className="pt-1 flex items-center justify-between border-t border-white/5">
                              <button
                                onClick={() => handleToggleMediaAvailability(item.id, item.isAvailable)}
                                disabled={isUpdating}
                                className={`w-full py-1 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1 border ${
                                  item.isAvailable
                                    ? "bg-emerald-950/60 text-emerald-400 border-emerald-500/30 hover:bg-emerald-950"
                                    : "bg-neutral-900 text-neutral-500 border-white/10 hover:text-neutral-300"
                                }`}
                              >
                                {isUpdating ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                ) : (
                                  <>
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        item.isAvailable ? "bg-emerald-400" : "bg-neutral-500"
                                      }`}
                                    />
                                    <span>{item.isAvailable ? "Available" : "Disabled"}</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Media Pagination */}
              <div className="flex items-center justify-between bg-[#141414] border border-white/10 p-2.5 text-xs text-neutral-400 font-mono">
                <div>
                  Page <span className="font-bold text-white">{mediaPage}</span> of{" "}
                  <span className="font-bold text-white">{mediaTotalPages}</span> ({mediaTotalCount.toLocaleString()} total)
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setMediaPage((p) => Math.max(1, p - 1))}
                    disabled={mediaPage <= 1 || mediaLoading}
                    className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-white disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setMediaPage((p) => Math.min(mediaTotalPages, p + 1))}
                    disabled={mediaPage >= mediaTotalPages || mediaLoading}
                    className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-white disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Edit Stream URL Modal */}
              {editingMedia && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="w-full max-w-md bg-[#141414] border border-white/15 p-5 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Custom Stream URL</h3>
                        <p className="text-[11px] text-neutral-400 truncate max-w-xs">{editingMedia.title}</p>
                      </div>
                      <button
                        onClick={() => setEditingMedia(null)}
                        className="text-neutral-500 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] text-neutral-400 mb-1 font-mono">
                        Direct HLS / MP4 / Embed URL:
                      </label>
                      <input
                        type="text"
                        value={editingMedia.streamUrl}
                        onChange={(e) =>
                          setEditingMedia({ ...editingMedia, streamUrl: e.target.value })
                        }
                        placeholder="https://server.domain/video.m3u8"
                        className="w-full bg-[#0e0e0e] border border-white/10 px-3 py-2 text-xs text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-[#E50914]"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                      <button
                        onClick={() => setEditingMedia(null)}
                        className="px-3 py-1.5 bg-neutral-900 text-neutral-400 hover:text-white text-xs border border-white/10"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveStreamUrl}
                        disabled={updatingMediaId === editingMedia.id}
                        className="px-4 py-1.5 bg-[#E50914] hover:bg-[#b80710] text-white text-xs font-semibold flex items-center gap-1.5"
                      >
                        {updatingMediaId === editingMedia.id && <Loader2 className="w-3 h-3 animate-spin" />}
                        <span>Save URL</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: USER ACTIVITY */}
          {activeTab === "activity" && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-base font-bold text-white">Activity Telemetry</h1>
                  <p className="text-[11px] font-mono text-neutral-500">
                    {activityTotalCount.toLocaleString()} events in MongoDB
                  </p>
                </div>

                <button
                  onClick={fetchActivities}
                  disabled={loadingActivity}
                  className="flex items-center gap-1.5 text-xs bg-[#141414] hover:bg-neutral-800 border border-white/10 px-2.5 py-1 text-neutral-200 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingActivity ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* 4 Telemetry Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <div className="p-3 bg-[#141414] border border-white/10">
                  <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                    <span>Events</span>
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="text-xl font-bold font-mono text-white mt-1">
                    {(activityTelemetry?.totalEvents ?? activityTotalCount).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-neutral-500 font-mono">Filtered window</div>
                </div>

                <div className="p-3 bg-[#141414] border border-white/10">
                  <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                    <span>Authenticated</span>
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                    {(activityTelemetry?.authenticatedCount ?? 0).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-neutral-500 font-mono">Registered</div>
                </div>

                <div className="p-3 bg-[#141414] border border-white/10">
                  <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                    <span>Guests</span>
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="text-xl font-bold font-mono text-cyan-300 mt-1">
                    {(activityTelemetry?.anonymousCount ?? activityTotalCount).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-neutral-500 font-mono">Anonymous</div>
                </div>

                <div className="p-3 bg-[#141414] border border-white/10">
                  <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                    <span>Top Signal</span>
                    <MousePointerClick className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="text-sm font-bold font-mono text-white truncate mt-1">
                    {activityTelemetry?.topEventType?.type
                      ? activityTelemetry.topEventType.type.replace(/_/g, " ")
                      : "page view"}
                  </div>
                  <div className="text-[10px] text-neutral-500 font-mono">
                    {activityTelemetry?.topEventType?.count
                      ? `${activityTelemetry.topEventType.count.toLocaleString()} hits`
                      : "—"}
                  </div>
                </div>
              </div>

              {/* Filters Row */}
              <div className="bg-[#141414] border border-white/10 p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  <div>
                    <Label className="mb-1.5">Timeframe</Label>
                    <Select
                      value={activityTimeframe}
                      onValueChange={(val) => {
                        setActivityTimeframe(val);
                        setActivityPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="1h">Last Hour</SelectItem>
                        <SelectItem value="24h">Last 24 Hours</SelectItem>
                        <SelectItem value="7d">Last 7 Days</SelectItem>
                        <SelectItem value="30d">Last 30 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="mb-1.5">Category</Label>
                    <Select
                      value={activityEventType}
                      onValueChange={(val) => {
                        setActivityEventType(val);
                        setActivityPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Events" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Events</SelectItem>
                        <SelectItem value="page_view">page_view</SelectItem>
                        <SelectItem value="movie_play">movie_play</SelectItem>
                        <SelectItem value="tv_play">tv_play</SelectItem>
                        <SelectItem value="search">search</SelectItem>
                        <SelectItem value="interaction">interaction</SelectItem>
                        <SelectItem value="watchlist_add">watchlist_add</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="mb-1.5">Audience</Label>
                    <Select
                      value={activityUserType}
                      onValueChange={(val) => {
                        setActivityUserType(val);
                        setActivityPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="All Viewers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Viewers</SelectItem>
                        <SelectItem value="authenticated">Authenticated</SelectItem>
                        <SelectItem value="anonymous">Anonymous</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="mb-1.5">Search Path</Label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5 pointer-events-none" />
                      <Input
                        type="text"
                        placeholder="Path, query, IP..."
                        value={activitySearch}
                        onChange={(e) => {
                          setActivitySearch(e.target.value);
                          setActivityPage(1);
                        }}
                        className="pl-8"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Split */}
              {activityTelemetry && (
                <div className="p-2.5 bg-[#141414] border border-white/10 space-y-1.5 font-mono text-[10px]">
                  <div className="flex justify-between text-neutral-400">
                    <span>Audience Split</span>
                    <span>
                      {activityTelemetry.authenticatedCount.toLocaleString()} Auth /{" "}
                      {activityTelemetry.anonymousCount.toLocaleString()} Guest
                    </span>
                  </div>
                  <div className="w-full bg-neutral-900 h-1.5 flex overflow-hidden border border-white/5">
                    <div
                      className="bg-emerald-500"
                      style={{
                        width: `${
                          activityTelemetry.totalEvents > 0
                            ? (activityTelemetry.authenticatedCount / activityTelemetry.totalEvents) * 100
                            : 0
                        }%`,
                      }}
                    />
                    <div
                      className="bg-cyan-500"
                      style={{
                        width: `${
                          activityTelemetry.totalEvents > 0
                            ? (activityTelemetry.anonymousCount / activityTelemetry.totalEvents) * 100
                            : 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Logs Table */}
              <div className="bg-[#141414] border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-neutral-300">
                    <thead className="bg-neutral-900 text-neutral-400 border-b border-white/10 uppercase text-[10px] font-mono">
                      <tr>
                        <th className="py-2.5 px-3">Timestamp</th>
                        <th className="py-2.5 px-3">Event</th>
                        <th className="py-2.5 px-3">User</th>
                        <th className="py-2.5 px-3">Path / Query</th>
                        <th className="py-2.5 px-3">Device</th>
                        <th className="py-2.5 px-3">Browser</th>
                        <th className="py-2.5 px-3">Session</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-[11px]">
                      {activities.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-neutral-500">
                            {loadingActivity ? "Loading activities..." : "No activity records found."}
                          </td>
                        </tr>
                      ) : (
                        activities.map((act) => (
                          <tr key={act._id} className="hover:bg-neutral-900/40">
                            <td className="py-2 px-3 text-neutral-400 whitespace-nowrap">
                              {new Date(act.createdAt).toLocaleString()}
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`px-1.5 py-0.5 text-[9px] uppercase font-bold ${
                                  act.eventType === "movie_play"
                                    ? "bg-emerald-950 text-emerald-300 border border-emerald-500/30"
                                    : act.eventType === "search"
                                    ? "bg-purple-950 text-purple-300 border border-purple-500/30"
                                    : "bg-blue-950 text-blue-300 border border-blue-500/30"
                                }`}
                              >
                                {act.eventType}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              {act.userType === "authenticated" ? (
                                <span className="px-1 py-0.2 text-[9px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                                  AUTH
                                </span>
                              ) : (
                                <span className="px-1 py-0.2 text-[9px] font-bold uppercase bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                                  GUEST
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-white truncate max-w-[200px]">
                              {act.searchTerm ? `🔍 ${act.searchTerm}` : act.path || "/"}
                            </td>
                            <td className="py-2 px-3 text-neutral-400">
                              <span className="flex items-center gap-1">
                                {act.device?.toLowerCase().includes("mobile") ? (
                                  <Smartphone className="w-3 h-3 text-neutral-500" />
                                ) : (
                                  <Laptop className="w-3 h-3 text-neutral-500" />
                                )}
                                {act.device || "Desktop"}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-neutral-400">{act.browser || "Chrome"}</td>
                            <td className="py-2 px-3 text-neutral-500 truncate max-w-[100px]" title={act.sessionId}>
                              {act.sessionId?.slice(0, 10)}...
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="p-2.5 bg-neutral-900 border-t border-white/10 flex items-center justify-between text-xs text-neutral-400 font-mono">
                  <div>
                    Page <span className="font-bold text-white">{activityPage}</span> of{" "}
                    <span className="font-bold text-white">{activityTotalPages}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                      disabled={activityPage <= 1 || loadingActivity}
                      className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-white disabled:opacity-30 border border-white/5 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setActivityPage((p) => Math.min(activityTotalPages, p + 1))}
                      disabled={activityPage >= activityTotalPages || loadingActivity}
                      className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-white disabled:opacity-30 border border-white/5 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: STREAMING URLS */}
          {activeTab === "streaming" && (
            <div className="space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#141414] border border-white/10 p-3">
                <div>
                  <h1 className="text-base font-bold text-white">Stream Servers</h1>
                  <p className="text-[11px] font-mono text-neutral-500">
                    Playback engines & mirrors
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowAddServerModal(true)}
                    className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1 transition cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Stream</span>
                  </button>

                  <label className="flex items-center gap-1.5 text-xs text-neutral-300 bg-neutral-900 border border-white/10 px-2.5 py-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoDeactivateBroken}
                      onChange={(e) => setAutoDeactivateBroken(e.target.checked)}
                      className="accent-[#E50914]"
                    />
                    <span>Auto-deactivate offline</span>
                  </label>

                  <button
                    onClick={handleScanAllServers}
                    disabled={scanningAll}
                    className="flex items-center gap-1.5 text-xs bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 px-3 py-1 text-cyan-200 font-semibold transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${scanningAll ? "animate-spin text-cyan-400" : ""}`} />
                    <span>{scanningAll ? "Scanning..." : "Scan All"}</span>
                  </button>

                  <button
                    onClick={fetchStreaming}
                    className="p-1 bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-neutral-200 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Servers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {servers.map((srv) => {
                  const latencyInfo = serverLatencies[srv.id];
                  const isCurrentDefault = srv.id === defaultServerId;

                  return (
                    <div
                      key={srv.id}
                      className={`p-3.5 bg-[#141414] border transition flex flex-col justify-between ${
                        !srv.isEnabled
                          ? "border-red-950/60 opacity-60 bg-red-950/10"
                          : isCurrentDefault
                          ? "border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                          : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-bold text-xs text-white flex items-center gap-1.5">
                              {srv.name}
                              {srv.isCustom && (
                                <span className="bg-purple-950 text-purple-300 text-[9px] px-1 py-0.2 border border-purple-500/30 font-mono">
                                  CUSTOM
                                </span>
                              )}
                              {isCurrentDefault && (
                                <span className="bg-emerald-950 text-emerald-400 text-[9px] px-1 py-0.2 border border-emerald-500/30 font-mono">
                                  DEFAULT
                                </span>
                              )}
                              {!srv.isEnabled && (
                                <span className="bg-red-950 text-red-400 text-[9px] px-1 py-0.2 border border-red-500/30 font-mono">
                                  OFFLINE
                                </span>
                              )}
                            </h3>
                            <span className="text-[10px] text-neutral-500 font-mono">{srv.baseUrl}</span>
                          </div>

                          <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 bg-neutral-900 border border-white/10 text-neutral-300">
                            {srv.quality}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-neutral-500">Latency:</span>
                          {latencyInfo ? (
                            <span
                              className={`font-bold ${
                                latencyInfo.online ? "text-emerald-400" : "text-red-400"
                              }`}
                            >
                              {latencyInfo.online ? `⚡ ${latencyInfo.latency}` : "Offline"}
                            </span>
                          ) : (
                            <span className="text-neutral-600">—</span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-3 mt-3 border-t border-white/5 flex items-center gap-1.5">
                        <button
                          onClick={() => handleTestServer(srv.id)}
                          disabled={testingServerId === srv.id}
                          className="py-1 px-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs border border-white/10 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          {testingServerId === srv.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <span className="text-amber-400 font-bold">⚡</span>
                          )}
                          <span>Ping</span>
                        </button>

                        <button
                          onClick={() => handleToggleServer(srv.id)}
                          className={`py-1 px-2.5 text-xs border transition cursor-pointer ${
                            srv.isEnabled
                              ? "bg-neutral-900 text-neutral-400 hover:text-red-400 border-white/10"
                              : "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                          }`}
                        >
                          {srv.isEnabled ? "Disable" : "Enable"}
                        </button>

                        {!isCurrentDefault && srv.isEnabled && (
                          <button
                            onClick={() => handleSetDefaultServer(srv.id)}
                            className="flex-1 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition cursor-pointer text-center"
                          >
                            Set Default
                          </button>
                        )}

                        {srv.isCustom && (
                          <button
                            onClick={() => handleDeleteServer(srv.id)}
                            disabled={deletingServerId === srv.id}
                            className="py-1 px-2 bg-neutral-900 hover:bg-red-950 text-neutral-400 hover:text-red-300 text-xs border border-white/10 transition cursor-pointer disabled:opacity-50"
                            title="Delete custom stream server"
                          >
                            {deletingServerId === srv.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Embed Preview Sandbox */}
              <div className="p-3 bg-[#141414] border border-white/10 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">Embed Sandbox</span>
                    <span className="text-[10px] font-mono text-emerald-400 uppercase bg-emerald-950/80 px-1 py-0.2 border border-emerald-500/30">
                      {defaultServerId}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-neutral-400 font-mono">TMDB:</span>
                    <input
                      type="text"
                      value={testTmdbId}
                      onChange={(e) => setTestTmdbId(e.target.value)}
                      className="w-20 bg-neutral-900 border border-white/10 px-2 py-0.5 text-xs text-white font-mono"
                    />
                    <button
                      onClick={() => setPreviewEmbedUrl(getEmbedUrl(defaultServerId, testTmdbId))}
                      className="px-2.5 py-0.5 bg-[#E50914] hover:bg-[#b80710] text-white text-xs font-semibold transition"
                    >
                      Load
                    </button>
                  </div>
                </div>

                <div className="relative aspect-video w-full bg-black border border-white/10 overflow-hidden">
                  <iframe
                    src={previewEmbedUrl}
                    className="w-full h-full border-0"
                    allowFullScreen
                    allow="autoplay; fullscreen *; picture-in-picture *; encrypted-media *; accelerometer *; gyroscope *"
                    referrerPolicy="origin"
                  />
                </div>
              </div>

              {/* Add Stream Server Modal */}
              {showAddServerModal && (
                <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-[#141414] border border-white/15 w-full max-w-lg shadow-2xl p-5 space-y-4 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div>
                        <h2 className="text-sm font-bold text-white flex items-center gap-2">
                          <Plus className="w-4 h-4 text-emerald-400" />
                          <span>Add New Stream Server</span>
                        </h2>
                        <p className="text-[11px] text-neutral-400 font-mono mt-0.5">
                          Add a custom playback engine or embed mirror to MongoDB
                        </p>
                      </div>
                      <button
                        onClick={() => setShowAddServerModal(false)}
                        className="text-neutral-400 hover:text-white p-1 transition cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleAddServer} className="space-y-3 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="mb-1 text-[10px]">Server Name *</Label>
                          <Input
                            type="text"
                            placeholder="e.g. VidSrc VIP"
                            value={newServerName}
                            onChange={(e) => setNewServerName(e.target.value)}
                            required
                          />
                        </div>

                        <div>
                          <Label className="mb-1 text-[10px]">Quality</Label>
                          <Select
                            value={newServerQuality}
                            onValueChange={(val) => setNewServerQuality(val)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="1080p" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1080p">1080p</SelectItem>
                              <SelectItem value="1080p / 4K">1080p / 4K</SelectItem>
                              <SelectItem value="720p">720p</SelectItem>
                              <SelectItem value="HD">HD</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label className="mb-1 text-[10px]">Base URL (Domain / Host) *</Label>
                        <Input
                          type="url"
                          placeholder="e.g. https://embed.su"
                          value={newServerBaseUrl}
                          onChange={(e) => setNewServerBaseUrl(e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-[10px]">Movie Embed URL Pattern</Label>
                          <span className="text-[10px] text-neutral-500 font-mono">Use {"{id}"} for TMDB ID</span>
                        </div>
                        <Input
                          type="text"
                          placeholder="e.g. https://embed.su/embed/movie/{id}"
                          value={newServerMoviePattern}
                          onChange={(e) => setNewServerMoviePattern(e.target.value)}
                        />
                        <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">
                          Leave empty to auto-generate: {"{baseUrl}/embed/movie/{id}"}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-[10px]">TV Show Embed URL Pattern</Label>
                          <span className="text-[10px] text-neutral-500 font-mono">Use {"{id}"}, {"{season}"}, {"{episode}"}</span>
                        </div>
                        <Input
                          type="text"
                          placeholder="e.g. https://embed.su/embed/tv/{id}/{season}/{episode}"
                          value={newServerTvPattern}
                          onChange={(e) => setNewServerTvPattern(e.target.value)}
                        />
                      </div>

                      <div>
                        <Label className="mb-1 text-[10px]">Description (Optional)</Label>
                        <Input
                          type="text"
                          placeholder="e.g. Fast multi-source embed with instant autoplay"
                          value={newServerDescription}
                          onChange={(e) => setNewServerDescription(e.target.value)}
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => setShowAddServerModal(false)}
                          className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs border border-white/10 transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={addingServer}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {addingServer ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Plus className="w-3.5 h-3.5" />
                          )}
                          <span>{addingServer ? "Adding Server..." : "Save Stream Server"}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SOCIAL MEDIA BROADCAST HUB */}
          {(activeTab === "social" || activeTab === "autopost") && (
            <div className="space-y-3.5">
              {/* Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#141414] border border-white/10 p-3">
                <div>
                  <h1 className="text-base font-bold text-white flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-cyan-400" />
                    <span>Social Media Broadcast Hub</span>
                  </h1>
                  <p className="text-[11px] font-mono text-neutral-500">
                    Multi-channel auto-publishing across Telegram, Bluesky, Reddit, Facebook & Tumblr
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBroadcastNext}
                    disabled={broadcastingNext}
                    className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    {broadcastingNext ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    <span>Broadcast Next Title</span>
                  </button>
                  <button
                    onClick={fetchSocial}
                    className="flex items-center gap-1.5 text-xs bg-neutral-900 hover:bg-neutral-800 border border-white/10 px-2.5 py-1.5 text-neutral-200 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Status KPI Strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <div className="p-3 bg-[#141414] border border-white/10 space-y-1">
                  <span className="text-neutral-400 text-[11px]">Catalog</span>
                  <div className="text-xl font-bold font-mono text-white">
                    {socialStats.totalMovies?.toLocaleString() || "59,460"}
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">In MongoDB</span>
                </div>

                <div className="p-3 bg-[#141414] border border-white/10 space-y-1">
                  <span className="text-neutral-400 text-[11px]">Unposted</span>
                  <div className="text-xl font-bold font-mono text-amber-400">
                    {socialStats.unpostedMovies?.toLocaleString() || "59,425"}
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">Queued</span>
                </div>

                <div className="p-3 bg-[#141414] border border-white/10 space-y-1">
                  <span className="text-neutral-400 text-[11px]">Posted</span>
                  <div className="text-xl font-bold font-mono text-emerald-400">
                    {socialStats.postedMovies?.toLocaleString() || "35"}
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">Broadcasted</span>
                </div>

                <div className="p-3 bg-[#141414] border border-white/10 space-y-1">
                  <span className="text-neutral-400 text-[11px]">Active Channels</span>
                  <div className="text-xl font-bold font-mono text-cyan-400">
                    {[tgEnabled, bskyEnabled, redditEnabled, fbEnabled, tumblrEnabled].filter(Boolean).length} / 5
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">Connected</span>
                </div>
              </div>

              {/* Multi-Broadcast Last Results */}
              {broadcastResults && Object.keys(broadcastResults).length > 0 && (
                <div className="p-3 bg-[#141414] border border-white/10 space-y-2">
                  <span className="text-xs font-semibold text-neutral-300">Last Broadcast Summary:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
                    {Object.entries(broadcastResults).map(([channel, r]) => (
                      <div
                        key={channel}
                        className={`p-2 border text-xs font-mono flex items-center justify-between ${
                          r.success
                            ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                            : "bg-red-950/30 border-red-500/30 text-red-300"
                        }`}
                      >
                        <span className="capitalize font-bold">{channel}</span>
                        <span>{r.success ? "✓ Sent" : "✗ Failed"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Platform Switcher Tabs */}
              <div className="flex border-b border-white/10 overflow-x-auto bg-[#111] scrollbar-none">
                {[
                  { id: "telegram", label: "Telegram", enabled: tgEnabled, icon: TelegramBrandIcon },
                  { id: "bluesky", label: "Bluesky", enabled: bskyEnabled, icon: BlueskyBrandIcon },
                  { id: "reddit", label: "Reddit", enabled: redditEnabled, icon: RedditBrandIcon },
                  { id: "facebook", label: "Facebook Page", enabled: fbEnabled, icon: FacebookBrandIcon },
                  { id: "tumblr", label: "Tumblr", enabled: tumblrEnabled, icon: TumblrBrandIcon },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSocialPlatform === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSocialPlatform(item.id as any)}
                      className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition border-b-2 whitespace-nowrap cursor-pointer ${
                        isActive
                          ? "border-[#E50914] text-white bg-white/5"
                          : "border-transparent text-neutral-400 hover:text-white hover:bg-white/[0.02]"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.enabled ? "bg-emerald-500" : "bg-neutral-600"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Platform Configurations */}
              <div className="p-4 bg-[#141414] border border-white/10 space-y-4">
                {/* 1. Telegram */}
                {activeSocialPlatform === "telegram" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <TelegramBrandIcon className="w-5 h-5" />
                        <div>
                          <h3 className="text-xs font-bold text-white">Telegram Channel Broadcast</h3>
                          <p className="text-[10px] text-neutral-500 font-mono">Broadcast posters & links via Telegram Bot API</p>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tgEnabled}
                          onChange={(e) => setTgEnabled(e.target.checked)}
                          className="accent-[#E50914]"
                        />
                        <span className="text-xs text-neutral-300">Enabled</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-mono text-neutral-400 mb-1">Bot Token</label>
                        <div className="relative">
                          <input
                            type={showTgToken ? "text" : "password"}
                            value={tgBotToken}
                            onChange={(e) => setTgBotToken(e.target.value)}
                            placeholder="8558209379:AAE8..."
                            className="w-full bg-[#0e0e0e] border border-white/10 px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowTgToken(!showTgToken)}
                            className="absolute right-2.5 top-2 text-neutral-500 hover:text-neutral-300 cursor-pointer"
                          >
                            {showTgToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-mono text-neutral-400 mb-1">Target Chat / Channel ID</label>
                        <input
                          type="text"
                          value={tgChatId}
                          onChange={(e) => setTgChatId(e.target.value)}
                          placeholder="-1003606758795"
                          className="w-full bg-[#0e0e0e] border border-white/10 px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[10px] uppercase font-mono text-neutral-400 mb-1">Channel / Group Invite Link</label>
                        <input
                          type="text"
                          value={tgGroupLink}
                          onChange={(e) => setTgGroupLink(e.target.value)}
                          placeholder="https://t.me/yourchannel"
                          className="w-full bg-[#0e0e0e] border border-white/10 px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleTestChannel("telegram")}
                        disabled={testingChannel === "telegram"}
                        className="px-3 py-1.5 bg-blue-950/60 hover:bg-blue-900 border border-blue-500/30 text-blue-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {testingChannel === "telegram" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        <span>Test Telegram Connection</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. Bluesky */}
                {activeSocialPlatform === "bluesky" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <BlueskyBrandIcon className="w-5 h-5" />
                        <div>
                          <h3 className="text-xs font-bold text-white">Bluesky AT Protocol Broadcast</h3>
                          <p className="text-[10px] text-neutral-500 font-mono">Post status updates & card links via AT Protocol API</p>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={bskyEnabled}
                          onChange={(e) => setBskyEnabled(e.target.checked)}
                          className="accent-[#E50914]"
                        />
                        <span className="text-xs text-neutral-300">Enabled</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-mono text-neutral-400 mb-1">Handle / Username</label>
                        <input
                          type="text"
                          value={bskyIdentifier}
                          onChange={(e) => setBskyIdentifier(e.target.value)}
                          placeholder="yourhandle.bsky.social"
                          className="w-full bg-[#0e0e0e] border border-white/10 px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-mono text-neutral-400 mb-1">App Password</label>
                        <div className="relative">
                          <input
                            type={showBskyPassword ? "text" : "password"}
                            value={bskyPassword}
                            onChange={(e) => setBskyPassword(e.target.value)}
                            placeholder="xxxx-xxxx-xxxx-xxxx"
                            className="w-full bg-[#0e0e0e] border border-white/10 px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowBskyPassword(!showBskyPassword)}
                            className="absolute right-2.5 top-2 text-neutral-500 hover:text-neutral-300 cursor-pointer"
                          >
                            {showBskyPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[10px] uppercase font-mono text-neutral-400 mb-1">Service URL</label>
                        <input
                          type="text"
                          value={bskyServiceUrl}
                          onChange={(e) => setBskyServiceUrl(e.target.value)}
                          placeholder="https://bsky.social"
                          className="w-full bg-[#0e0e0e] border border-white/10 px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleTestChannel("bluesky")}
                        disabled={testingChannel === "bluesky"}
                        className="px-3 py-1.5 bg-sky-950/60 hover:bg-sky-900 border border-sky-500/30 text-sky-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {testingChannel === "bluesky" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        <span>Test Bluesky Auth</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. Reddit */}
                {activeSocialPlatform === "reddit" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <RedditBrandIcon className="w-5 h-5" />
                        <div>
                          <h3 className="text-xs font-bold text-white">Reddit Community Broadcast</h3>
                          <p className="text-[10px] text-neutral-500 font-mono">Submit link or text posts to subreddits via OAuth2 API</p>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={redditEnabled}
                          onChange={(e) => setRedditEnabled(e.target.checked)}
                          className="accent-[#E50914]"
                        />
                        <span className="text-xs text-neutral-300">Enabled</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-mono text-neutral-400 mb-1">Client ID</label>
                        <input
                          type="text"
                          value={redditClientId}
                          onChange={(e) => setRedditClientId(e.target.value)}
                          placeholder="Reddit Script App Client ID"
                          className="w-full bg-[#0e0e0e] border border-white/10 px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-mono text-neutral-400 mb-1">Client Secret</label>
                        <div className="relative">
                          <input
                            type={showRedditSecret ? "text" : "password"}
                            value={redditClientSecret}
                            onChange={(e) => setRedditClientSecret(e.target.value)}
                            placeholder="Reddit Script Secret"
                            className="w-full bg-[#0e0e0e] border border-white/10 px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRedditSecret(!showRedditSecret)}
                            className="absolute right-2.5 top-2 text-neutral-500 hover:text-neutral-300 cursor-pointer"
                          >
                            {showRedditSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-mono text-neutral-400 mb-1">Username</label>
                        <input
                          type="text"
                          value={redditUsername}
                          onChange={(e) => setRedditUsername(e.target.value)}
                          placeholder="Reddit Account Username"
                          className="w-full bg-[#0e0e0e] border border-white/10 px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-mono text-neutral-400 mb-1">Password</label>
                        <input
                          type="password"
                          value={redditPassword}
                          onChange={(e) => setRedditPassword(e.target.value)}
                          placeholder="Account Password"
                          className="w-full bg-[#0e0e0e] border border-white/10 px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[10px] uppercase font-mono text-neutral-400 mb-1">Subreddit (without r/)</label>
                        <input
                          type="text"
                          value={redditSubreddit}
                          onChange={(e) => setRedditSubreddit(e.target.value)}
                          placeholder="e.g. movies or your_subreddit"
                          className="w-full bg-[#0e0e0e] border border-white/10 px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleTestChannel("reddit")}
                        disabled={testingChannel === "reddit"}
                        className="px-3 py-1.5 bg-orange-950/60 hover:bg-orange-900 border border-orange-500/30 text-orange-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {testingChannel === "reddit" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        <span>Test Reddit OAuth</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. Facebook */}
                {activeSocialPlatform === "facebook" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <FacebookBrandIcon className="w-5 h-5" />
                        <div>
                          <h3 className="text-xs font-bold text-white">Facebook Page Broadcast</h3>
                          <p className="text-[10px] text-neutral-500 font-mono">Publish feed updates via Facebook Graph API</p>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={fbEnabled}
                          onChange={(e) => setFbEnabled(e.target.checked)}
                          className="accent-[#E50914]"
                        />
                        <span className="text-xs text-neutral-300">Enabled</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-mono text-neutral-400 mb-1">Page ID</label>
                        <input
                          type="text"
                          value={fbPageId}
                          onChange={(e) => setFbPageId(e.target.value)}
                          placeholder="Facebook Page Numeric ID"
                          className="w-full bg-[#0e0e0e] border border-white/10 px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-mono text-neutral-400 mb-1">Page Access Token</label>
                        <div className="relative">
                          <input
                            type={showFbToken ? "text" : "password"}
                            value={fbPageToken}
                            onChange={(e) => setFbPageToken(e.target.value)}
                            placeholder="EAAC..."
                            className="w-full bg-[#0e0e0e] border border-white/10 px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowFbToken(!showFbToken)}
                            className="absolute right-2.5 top-2 text-neutral-500 hover:text-neutral-300 cursor-pointer"
                          >
                            {showFbToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleTestChannel("facebook")}
                        disabled={testingChannel === "facebook"}
                        className="px-3 py-1.5 bg-blue-950/60 hover:bg-blue-900 border border-blue-500/30 text-blue-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {testingChannel === "facebook" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        <span>Test Facebook Graph API</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 5. Tumblr */}
                {activeSocialPlatform === "tumblr" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <TumblrBrandIcon className="w-5 h-5" />
                        <div>
                          <h3 className="text-xs font-bold text-white">Tumblr Blog Broadcast</h3>
                          <p className="text-[10px] text-neutral-500 font-mono">Create photo / link blog posts via Tumblr API v2</p>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tumblrEnabled}
                          onChange={(e) => setTumblrEnabled(e.target.checked)}
                          className="accent-[#E50914]"
                        />
                        <span className="text-xs text-neutral-300">Enabled</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-mono text-neutral-400 mb-1">Blog Identifier / Name</label>
                        <input
                          type="text"
                          value={tumblrBlog}
                          onChange={(e) => setTumblrBlog(e.target.value)}
                          placeholder="e.g. mymoviestream.tumblr.com"
                          className="w-full bg-[#0e0e0e] border border-white/10 px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-mono text-neutral-400 mb-1">Consumer Key (API Key)</label>
                        <input
                          type="text"
                          value={tumblrKey}
                          onChange={(e) => setTumblrKey(e.target.value)}
                          placeholder="OAuth Consumer Key"
                          className="w-full bg-[#0e0e0e] border border-white/10 px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-mono text-neutral-400 mb-1">Consumer Secret</label>
                        <input
                          type="password"
                          value={tumblrSecret}
                          onChange={(e) => setTumblrSecret(e.target.value)}
                          placeholder="OAuth Consumer Secret"
                          className="w-full bg-[#0e0e0e] border border-white/10 px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-mono text-neutral-400 mb-1">OAuth Token</label>
                        <input
                          type="text"
                          value={tumblrToken}
                          onChange={(e) => setTumblrToken(e.target.value)}
                          placeholder="User OAuth Token"
                          className="w-full bg-[#0e0e0e] border border-white/10 px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[10px] uppercase font-mono text-neutral-400 mb-1">Token Secret</label>
                        <div className="relative">
                          <input
                            type={showTumblrSecret ? "text" : "password"}
                            value={tumblrTokenSecret}
                            onChange={(e) => setTumblrTokenSecret(e.target.value)}
                            placeholder="OAuth Token Secret"
                            className="w-full bg-[#0e0e0e] border border-white/10 px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowTumblrSecret(!showTumblrSecret)}
                            className="absolute right-2.5 top-2 text-neutral-500 hover:text-neutral-300 cursor-pointer"
                          >
                            {showTumblrSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleTestChannel("tumblr")}
                        disabled={testingChannel === "tumblr"}
                        className="px-3 py-1.5 bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {testingChannel === "tumblr" ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        <span>Test Tumblr Connection</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Common Settings: Public Site URL */}
                <div className="pt-3 border-t border-white/10">
                  <label className="block text-[10px] uppercase font-mono text-neutral-400 mb-1">
                    Public Stream Site URL (Used in post links & embeds)
                  </label>
                  <input
                    type="text"
                    value={socialSiteUrl}
                    onChange={(e) => setSocialSiteUrl(e.target.value)}
                    placeholder="https://yourstreamingsite.com"
                    className="w-full bg-[#0e0e0e] border border-white/10 px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                  />
                </div>

                {/* Save All Social Settings */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                  <button
                    onClick={handleSaveSocialSettings}
                    disabled={savingSocial}
                    className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-white/20 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingSocial && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{savingSocial ? "Saving Settings..." : "Save All Social Channel Settings"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SEO & SEARCH CONSOLE */}
          {activeTab === "seo" && (
            <div className="space-y-3.5">
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#141414] border border-white/10 p-3">
                <div>
                  <h1 className="text-base font-bold text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-amber-400" />
                    <span>SEO & Search Console</span>
                  </h1>
                  <p className="text-[11px] font-mono text-neutral-500">
                    Sitemaps, Googlebot Probe, Indexation & Rich Snippets
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href="/sitemap.xml"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs bg-neutral-900 hover:bg-neutral-800 border border-white/10 px-2.5 py-1 text-neutral-300 font-mono transition"
                    title="Open live XML sitemap"
                  >
                    <span>/sitemap.xml</span>
                    <ExternalLink className="w-3 h-3 text-neutral-500" />
                  </a>

                  <a
                    href="/robots.txt"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs bg-neutral-900 hover:bg-neutral-800 border border-white/10 px-2.5 py-1 text-neutral-300 font-mono transition"
                    title="Open live robots.txt"
                  >
                    <span>/robots.txt</span>
                    <ExternalLink className="w-3 h-3 text-neutral-500" />
                  </a>

                  <button
                    onClick={handlePingSearchEngines}
                    disabled={pingingEngines}
                    className="flex items-center gap-1.5 text-xs bg-amber-950 hover:bg-amber-900 border border-amber-500/40 px-3 py-1 text-amber-200 font-semibold transition cursor-pointer disabled:opacity-50"
                  >
                    {pingingEngines ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    <span>Ping Search Engines</span>
                  </button>

                  <button
                    onClick={fetchSeo}
                    className="p-1 bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-neutral-200 transition cursor-pointer"
                    title="Refresh SEO stats"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 4 KPI Telemetry Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div className="p-3 bg-[#141414] border border-white/10 space-y-1">
                  <span className="text-[10px] uppercase font-mono text-neutral-500 block">Catalog Indexed</span>
                  <div className="text-xl font-black text-white font-mono">
                    {seoStats?.totalAvailableMovies ? `${seoStats.totalAvailableMovies.toLocaleString()}+` : "59,460+"}
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">Available Movies in DB</span>
                </div>

                <div className="p-3 bg-[#141414] border border-white/10 space-y-1">
                  <span className="text-[10px] uppercase font-mono text-neutral-500 block">Dynamic Sitemap</span>
                  <div className="text-xl font-black text-cyan-400 font-mono">
                    {seoStats?.estimatedSitemapUrls ? `${seoStats.estimatedSitemapUrls.toLocaleString()}` : "2,004"}
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono">High-priority XML URLs</span>
                </div>

                <div className="p-3 bg-[#141414] border border-white/10 space-y-1">
                  <span className="text-[10px] uppercase font-mono text-neutral-500 block">Robots Directives</span>
                  <div className="text-xl font-black text-emerald-400 font-mono">
                    ALLOW
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono">Admin & APIs Protected</span>
                </div>

                <div className="p-3 bg-[#141414] border border-white/10 space-y-1">
                  <span className="text-[10px] uppercase font-mono text-neutral-500 block">Structured Data</span>
                  <div className="text-xl font-black text-purple-400 font-mono">
                    JSON-LD
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono">WebSite & SearchAction</span>
                </div>
              </div>

              {/* Main Content: 2-Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                {/* Left Column: Live Googlebot Probe & Verification Form */}
                <div className="space-y-3.5">
                  {/* Googlebot Live URL Inspector */}
                  <div className="p-3.5 bg-[#141414] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-amber-400" />
                        <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                          Googlebot Live URL Inspector
                        </h2>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-500">Official User-Agent Probe</span>
                    </div>

                    <form onSubmit={handleRunProbe} className="space-y-2.5">
                      <div>
                        <Label className="mb-1 text-[10px]">Target URL or Route to Inspect</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            value={probeUrl}
                            onChange={(e) => setProbeUrl(e.target.value)}
                            placeholder="http://localhost:3000/sitemap.xml"
                            className="flex-1"
                          />
                          <button
                            type="submit"
                            disabled={probingUrl}
                            className="px-3.5 py-1.5 bg-[#E50914] hover:bg-[#b80710] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                          >
                            {probingUrl ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                            <span>{probingUrl ? "Inspecting..." : "Inspect"}</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-400 flex-wrap">
                        <span className="text-neutral-500">Quick Test:</span>
                        <button
                          type="button"
                          onClick={() => setProbeUrl("http://localhost:3000/sitemap.xml")}
                          className="px-1.5 py-0.5 bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-neutral-300"
                        >
                          /sitemap.xml
                        </button>
                        <button
                          type="button"
                          onClick={() => setProbeUrl("http://localhost:3000/robots.txt")}
                          className="px-1.5 py-0.5 bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-neutral-300"
                        >
                          /robots.txt
                        </button>
                        <button
                          type="button"
                          onClick={() => setProbeUrl("http://localhost:3000/")}
                          className="px-1.5 py-0.5 bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-neutral-300"
                        >
                          / (Homepage)
                        </button>
                      </div>
                    </form>

                    {/* Probe Results Display */}
                    {probeResult && (
                      <div className="p-3 bg-neutral-950 border border-white/10 space-y-2 text-xs font-mono animate-in fade-in duration-150">
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-400">Response Status:</span>
                          <span
                            className={`px-2 py-0.5 font-bold uppercase ${
                              probeResult.ok
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-500/30"
                                : "bg-red-950 text-red-300 border border-red-500/30"
                            }`}
                          >
                            HTTP {probeResult.status || "FAIL"} {probeResult.ok ? "OK" : "ERROR"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-neutral-400">
                          <span>Latency / Time:</span>
                          <span className="text-white font-bold">⚡ {probeResult.elapsedMs}ms</span>
                        </div>

                        {probeResult.contentType && (
                          <div className="flex items-center justify-between text-neutral-400">
                            <span>Content-Type:</span>
                            <span className="text-cyan-400 truncate max-w-[220px]">{probeResult.contentType}</span>
                          </div>
                        )}

                        <div className="pt-2 border-t border-white/5 flex flex-wrap gap-1.5">
                          {probeResult.isXml && (
                            <span className="px-1.5 py-0.5 bg-blue-950 text-blue-300 border border-blue-500/30 text-[10px]">
                              ✓ XML Validated
                            </span>
                          )}
                          {probeResult.isHtml && (
                            <span className="px-1.5 py-0.5 bg-purple-950 text-purple-300 border border-purple-500/30 text-[10px]">
                              ✓ HTML5 Validated
                            </span>
                          )}
                          {probeResult.hasMetaDescription && (
                            <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[10px]">
                              ✓ Meta Description
                            </span>
                          )}
                          {probeResult.hasOpenGraph && (
                            <span className="px-1.5 py-0.5 bg-amber-950 text-amber-300 border border-amber-500/30 text-[10px]">
                              ✓ OpenGraph Tags
                            </span>
                          )}
                          {probeResult.hasJsonLd && (
                            <span className="px-1.5 py-0.5 bg-pink-950 text-pink-300 border border-pink-500/30 text-[10px]">
                              ✓ JSON-LD Schema
                            </span>
                          )}
                        </div>

                        {probeResult.snippet && (
                          <div className="pt-2 border-t border-white/5">
                            <span className="text-[10px] text-neutral-500 block mb-1">Response Sample Preview:</span>
                            <pre className="p-2 bg-black text-[10px] text-neutral-300 overflow-x-auto max-h-24 font-mono leading-tight border border-white/5">
                              {probeResult.snippet}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Search Engine Verification & Metadata Form */}
                  <div className="p-3.5 bg-[#141414] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                          Search Engine Verification & Meta
                        </h2>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-500">Google & Bing</span>
                    </div>

                    <form onSubmit={handleSaveSeo} className="space-y-3 text-xs">
                      <div>
                        <Label className="mb-1 text-[10px]">Canonical Site URL (Production Domain)</Label>
                        <Input
                          type="url"
                          value={seoSettings.siteUrl}
                          onChange={(e) => setSeoSettings({ ...seoSettings, siteUrl: e.target.value })}
                          placeholder="https://moviestream.cc"
                        />
                        <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">
                          Used in sitemap.xml URLs, OpenGraph tags, and canonical links.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="mb-1 text-[10px]">Google Verification Token</Label>
                          <Input
                            type="text"
                            value={seoSettings.googleVerification}
                            onChange={(e) => setSeoSettings({ ...seoSettings, googleVerification: e.target.value })}
                            placeholder="e.g. google-site-verification token"
                          />
                        </div>

                        <div>
                          <Label className="mb-1 text-[10px]">Bing Webmaster Code</Label>
                          <Input
                            type="text"
                            value={seoSettings.bingVerification}
                            onChange={(e) => setSeoSettings({ ...seoSettings, bingVerification: e.target.value })}
                            placeholder="e.g. msvalidate.01 code"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="mb-1 text-[10px]">Default Meta Title</Label>
                        <Input
                          type="text"
                          value={seoSettings.siteTitle}
                          onChange={(e) => setSeoSettings({ ...seoSettings, siteTitle: e.target.value })}
                          placeholder="StreamFlix - Watch TV Shows & Movies Online Free"
                        />
                      </div>

                      <div>
                        <Label className="mb-1 text-[10px]">Default Meta Description</Label>
                        <textarea
                          rows={2}
                          value={seoSettings.siteDescription}
                          onChange={(e) => setSeoSettings({ ...seoSettings, siteDescription: e.target.value })}
                          placeholder="Watch the latest movies and TV series online in HD and 4K..."
                          className="w-full bg-neutral-900 border border-white/10 px-2.5 py-1.5 text-xs text-neutral-200 font-mono outline-none focus:ring-1 focus:ring-white/25 rounded-none"
                        />
                      </div>

                      <div>
                        <Label className="mb-1 text-[10px]">Meta Keywords (Comma-separated)</Label>
                        <Input
                          type="text"
                          value={seoSettings.siteKeywords}
                          onChange={(e) => setSeoSettings({ ...seoSettings, siteKeywords: e.target.value })}
                          placeholder="watch movies online, free streaming, hd movies, watch tv series"
                        />
                      </div>

                      {/* Brand Logo & Appearance Section */}
                      <div className="pt-3 border-t border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Palette className="w-3.5 h-3.5" />
                            Brand Logo & Appearance
                          </span>
                          <span className="text-[10px] text-neutral-500 font-mono">Updates Navbar & Social Cards</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label className="mb-1 text-[10px]">Brand / Logo Text</Label>
                            <Input
                              type="text"
                              value={seoSettings.logoText}
                              onChange={(e) => setSeoSettings({ ...seoSettings, logoText: e.target.value })}
                              placeholder="e.g. STREAMFLIX, NETFLIX, STREAMHD"
                            />
                            <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">
                              Displayed in header navbar and card preview if no image logo is set.
                            </p>
                          </div>

                          <div>
                            <Label className="mb-1 text-[10px]">Logo Primary Color</Label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={seoSettings.logoColor || "#E50914"}
                                onChange={(e) => setSeoSettings({ ...seoSettings, logoColor: e.target.value })}
                                className="w-8 h-8 rounded-none border border-white/20 bg-transparent cursor-pointer p-0.5"
                                title="Pick Logo Color"
                              />
                              <Input
                                type="text"
                                value={seoSettings.logoColor}
                                onChange={(e) => setSeoSettings({ ...seoSettings, logoColor: e.target.value })}
                                placeholder="#E50914"
                                className="font-mono text-xs uppercase"
                              />
                              <div className="flex items-center gap-1">
                                {["#E50914", "#F59E0B", "#06B6D4", "#FFFFFF"].map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => setSeoSettings({ ...seoSettings, logoColor: c })}
                                    style={{ backgroundColor: c }}
                                    className="w-5 h-5 border border-white/30 cursor-pointer hover:scale-110 transition"
                                    title={`Preset ${c}`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label className="mb-1 text-[10px]">Social Card Tagline / Subtitle</Label>
                          <Input
                            type="text"
                            value={seoSettings.logoSubtitle}
                            onChange={(e) => setSeoSettings({ ...seoSettings, logoSubtitle: e.target.value })}
                            placeholder="e.g. Ultra HD & 4K Streaming Platform"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-[10px]">Custom Logo Image URL (PNG, SVG, or WebP)</Label>
                            <label className="text-[10px] text-red-400 hover:text-red-300 cursor-pointer flex items-center gap-1 font-mono">
                              <Upload className="w-3 h-3" />
                              <span>Upload File</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (uploadEvent) => {
                                      const base64 = uploadEvent.target?.result as string;
                                      if (base64) {
                                        setSeoSettings((prev) => ({ ...prev, logoImageUrl: base64 }));
                                        showNotification("success", "Logo image loaded from file!");
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              value={seoSettings.logoImageUrl}
                              onChange={(e) => setSeoSettings({ ...seoSettings, logoImageUrl: e.target.value })}
                              placeholder="https://example.com/logo.png or data:image/..."
                            />
                            {seoSettings.logoImageUrl && (
                              <button
                                type="button"
                                onClick={() => setSeoSettings({ ...seoSettings, logoImageUrl: "" })}
                                className="px-2 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs border border-white/10 shrink-0 cursor-pointer"
                                title="Remove Image Logo"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">
                            Upload your PNG/SVG logo or paste any URL. If provided, replaces text logo across navbar and cards.
                          </p>
                        </div>

                        <div>
                          <Label className="mb-1 text-[10px]">Social Card Preview Background / OG Image URL (1200 x 630)</Label>
                          <Input
                            type="text"
                            value={seoSettings.ogImage}
                            onChange={(e) => setSeoSettings({ ...seoSettings, ogImage: e.target.value })}
                            placeholder="https://moviestream.cc/og-image.jpg"
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-white/10 flex items-center justify-end">
                        <button
                          type="submit"
                          disabled={savingSeo}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {savingSeo ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          <span>{savingSeo ? "Saving SEO..." : "Save SEO Configuration"}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* Right Column: Live SERP & Social Previews */}
                <div className="space-y-3.5">
                  {/* Google SERP Live Simulator */}
                  <div className="p-3.5 bg-[#141414] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-cyan-400" />
                        <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                          Google Search Result Preview
                        </h2>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-500">Live SERP Mockup</span>
                    </div>

                    <div className="p-4 bg-[#202124] border border-neutral-700 space-y-1.5 text-left font-sans">
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center font-black text-white text-xs">
                          N
                        </div>
                        <div className="min-w-0">
                          <span className="text-neutral-200 text-xs block leading-none font-medium">StreamFlix</span>
                          <span className="text-neutral-400 text-[11px] font-mono truncate block">
                            {seoSettings.siteUrl || "https://moviestream.cc"}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-[#8ab4f8] text-base hover:underline cursor-pointer font-medium leading-snug">
                        {seoSettings.siteTitle || "StreamFlix - Watch TV Shows & Movies Online Free in HD"}
                      </h3>

                      <p className="text-[#bdc1c6] text-xs leading-relaxed line-clamp-2">
                        {seoSettings.siteDescription ||
                          "Stream the latest movies and TV series online in HD and 4K without ads. Explore thousands of titles with ultra-fast servers."}
                      </p>

                      {/* Google Sitelinks */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-700/60 text-xs">
                        <div>
                          <span className="text-[#8ab4f8] hover:underline cursor-pointer block font-medium">Movies</span>
                          <span className="text-[#9aa0a6] text-[11px]">Browse popular and trending releases</span>
                        </div>
                        <div>
                          <span className="text-[#8ab4f8] hover:underline cursor-pointer block font-medium">TV Shows</span>
                          <span className="text-[#9aa0a6] text-[11px]">Stream complete seasons & episodes</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* OpenGraph & Social Share Preview */}
                  <div className="p-3.5 bg-[#141414] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-purple-400" />
                        <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                          Social Media Card Preview
                        </h2>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-500">Twitter / Telegram / Discord</span>
                    </div>

                    <div className="bg-[#181818] border border-white/10 overflow-hidden text-left shadow-2xl">
                      <div className="aspect-[1.91/1] w-full bg-gradient-to-tr from-neutral-900 via-red-950/40 to-neutral-900 flex flex-col items-center justify-center p-6 text-center border-b border-white/10 relative overflow-hidden">
                        {seoSettings.ogImage && (
                          <img
                            src={seoSettings.ogImage}
                            alt="Card Background"
                            className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none"
                          />
                        )}
                        {seoSettings.logoImageUrl ? (
                          <div className="mb-2 max-w-[280px] max-h-20 flex items-center justify-center z-10">
                            <img
                              src={seoSettings.logoImageUrl}
                              alt="Logo"
                              className="max-h-16 max-w-full object-contain filter drop-shadow-md"
                            />
                          </div>
                        ) : (
                          <span
                            style={{ color: seoSettings.logoColor || "#E50914" }}
                            className="font-black text-4xl tracking-tighter mb-1.5 uppercase select-none z-10 drop-shadow-lg"
                          >
                            {seoSettings.logoText || "STREAMFLIX"}
                          </span>
                        )}
                        <span className="text-xs text-neutral-300 font-medium z-10 drop-shadow">
                          {seoSettings.logoSubtitle || "Ultra HD & 4K Streaming Platform"}
                        </span>
                        <span className="absolute bottom-2 right-2 text-[9px] font-mono bg-black/80 px-1.5 py-0.5 text-neutral-400 border border-white/10 z-10">
                          1200 x 630
                        </span>
                      </div>

                      <div className="p-3 space-y-1">
                        <span className="text-[10px] uppercase font-mono text-neutral-500 block truncate">
                          {seoSettings.siteUrl ? new URL(seoSettings.siteUrl).hostname : "moviestream.cc"}
                        </span>
                        <h4 className="text-white font-bold text-xs truncate">
                          {seoSettings.siteTitle || "StreamFlix - Watch TV Shows & Movies Online Free in HD"}
                        </h4>
                        <p className="text-neutral-400 text-[11px] line-clamp-2">
                          {seoSettings.siteDescription ||
                            "Stream the latest movies and TV series online in HD and 4K without ads."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Official Webmaster Console Shortcuts */}
                  <div className="p-3 bg-[#141414] border border-white/10 space-y-2">
                    <span className="text-[10px] uppercase font-mono text-neutral-400 font-bold block">
                      Search Engine Webmaster Consoles
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                      <a
                        href="https://search.google.com/search-console"
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-white/10 flex items-center justify-between text-neutral-200 transition"
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="text-red-500 font-bold">G</span> Google Search Console
                        </span>
                        <ExternalLink className="w-3 h-3 text-neutral-500" />
                      </a>

                      <a
                        href="https://www.bing.com/webmasters"
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-white/10 flex items-center justify-between text-neutral-200 transition"
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="text-cyan-400 font-bold">B</span> Bing Webmaster Tools
                        </span>
                        <ExternalLink className="w-3 h-3 text-neutral-500" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
