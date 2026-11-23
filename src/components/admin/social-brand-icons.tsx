"use client";

import React from "react";

interface IconProps {
  size?: number;
  className?: string;
  active?: boolean;
}

/**
 * Authentic Telegram Brand Icon
 */
export const TelegramBrandIcon: React.FC<IconProps> = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ flexShrink: 0, display: "inline-block" }}
  >
    <circle cx="12" cy="12" r="12" fill="#24A1DE" />
    <path
      d="M5.4 12.05l11.75-4.53c.54-.2.94.13.77.89l-2 9.42c-.15.67-.54.83-1.1.52l-3.05-2.25-1.47 1.42c-.16.16-.3.3-.62.3l.22-3.11 5.67-5.12c.25-.22-.05-.34-.39-.12L8.14 14.1l-3.02-.94c-.66-.2-.67-.65.14-.97l.14-.14z"
      fill="#ffffff"
    />
  </svg>
);

/**
 * Authentic Bluesky Butterfly Brand Icon
 */
export const BlueskyBrandIcon: React.FC<IconProps> = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 568 501"
    fill="none"
    className={className}
    style={{ flexShrink: 0, display: "inline-block" }}
  >
    <path
      d="M123.121 33.664C188.241 82.5529 258.281 181.68 284 234.873C309.719 181.68 379.759 82.5529 444.879 33.664C491.866 -1.61207 568 -28.864 568 57.9464C568 75.2974 558.125 198.814 552.348 219.789C532.185 292.984 445.698 312.983 371.189 300.323C499.785 322.378 528.423 397.773 464.919 462.651C344.417 585.766 295.688 387.892 284 340.59C272.312 387.892 223.583 585.766 103.081 462.651C39.5771 397.773 68.2147 322.378 196.811 300.323C122.302 312.983 35.8152 292.984 15.6518 219.789C9.87463 198.814 0 75.2974 0 57.9464C0 -28.864 76.1339 -1.61207 123.121 33.664Z"
      fill="#1185FE"
    />
  </svg>
);

/**
 * Authentic Reddit Brand Icon
 */
export const RedditBrandIcon: React.FC<IconProps> = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ flexShrink: 0, display: "inline-block" }}
  >
    <circle cx="12" cy="12" r="12" fill="#FF4500" />
    <path
      d="M19.5 12a1.5 1.5 0 0 0-2.5-1.1c-.9-.6-2.1-1-3.5-1.1l.6-2.8 2 .4a1.2 1.2 0 1 0 .2-.8l-2.4-.5a.4.4 0 0 0-.5.3l-.8 3.6c-1.4.1-2.6.5-3.5 1.1A1.5 1.5 0 1 0 7 13.4c0 .3 0 .5.1.7 0 2.2 2.2 4 4.9 4s4.9-1.8 4.9-4c0-.2 0-.4-.1-.7a1.5 1.5 0 0 0 2.6-1.4zM9 13.5a1 1 0 1 1 2 0 1 1 0 0 1-2 0zm5.8 2.8c-.8.8-2.8.8-3.6 0a.3.3 0 0 1 .4-.4c.6.6 2.2.6 2.8 0a.3.3 0 0 1 .4.4zm.2-1.8a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"
      fill="#ffffff"
    />
  </svg>
);

/**
 * Authentic Facebook Brand Icon
 */
export const FacebookBrandIcon: React.FC<IconProps> = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ flexShrink: 0, display: "inline-block" }}
  >
    <circle cx="12" cy="12" r="12" fill="#1877F2" />
    <path
      d="M13.5 21.8v-7.6h2.5l.4-3h-2.9V9.3c0-.9.2-1.5 1.5-1.5h1.6V5.1c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1v2.1H8v3h2.2v7.6h3.3z"
      fill="#ffffff"
    />
  </svg>
);

/**
 * Authentic Tumblr Brand Icon
 */
export const TumblrBrandIcon: React.FC<IconProps> = ({ size = 16, active = false, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    style={{ flexShrink: 0, display: "inline-block" }}
  >
    <rect width="24" height="24" rx="4" fill="#36465D" />
    <path
      d="M14.563 21c-4.2 0-5.8-2.1-5.8-5.7v-5.1H6.7V7.5c2.4-.8 3.7-2.9 3.9-5.7h3.6v5.1h3.7v3.8h-3.7v4.7c0 1.8.7 2.3 2.2 2.3h1.5V21h-2.8z"
      fill="#ffffff"
    />
  </svg>
);
