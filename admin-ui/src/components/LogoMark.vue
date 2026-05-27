<template>
  <svg
    class="logo-mark"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="tulyu-sky" x1="6" y1="8" x2="42" y2="40" gradientUnits="userSpaceOnUse">
        <stop stop-color="#38BDF8" />
        <stop offset="0.55" stop-color="#A78BFA" />
        <stop offset="1" stop-color="#FB7185" />
      </linearGradient>
      <linearGradient id="tulyu-path" x1="8" y1="38" x2="40" y2="10" gradientUnits="userSpaceOnUse">
        <stop stop-color="#FBBF24" />
        <stop offset="1" stop-color="#F472B6" />
      </linearGradient>
      <linearGradient id="tulyu-peak" x1="24" y1="12" x2="24" y2="40" gradientUnits="userSpaceOnUse">
        <stop stop-color="#1E3A5F" stop-opacity="0.35" />
        <stop offset="1" stop-color="#1E3A5F" stop-opacity="0.85" />
      </linearGradient>
    </defs>

    <!-- 远山 · 淡墨 -->
    <path
      d="M4 34 C10 28 14 26 20 22 C26 18 30 20 36 16 C40 14 42 15 44 17"
      stroke="url(#tulyu-peak)"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      opacity="0.45"
    />
    <!-- 近山 · 主笔 -->
    <path
      d="M6 36 L16 20 L24 30 L32 14 L42 36"
      stroke="url(#tulyu-sky)"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <!-- 行路 · 蜿蜒小径 -->
    <path
      d="M10 38 C14 34 18 30 22 26 C26 22 30 18 34 14 C36 12 38 10 40 8"
      stroke="url(#tulyu-path)"
      stroke-width="2"
      stroke-linecap="round"
      fill="none"
    />
    <!-- 晨光 -->
    <circle cx="38" cy="11" r="3.5" fill="#FDE68A" opacity="0.9" />
    <circle cx="38" cy="11" r="5.5" stroke="#FDE68A" stroke-width="1" opacity="0.35" />
    <!-- AI · 星尘（非机械十字） -->
    <circle cx="40" cy="8" r="1.1" fill="#E0E7FF" />
    <circle cx="43.5" cy="12" r="0.8" fill="#C7D2FE" opacity="0.9" />
    <circle cx="36.5" cy="13" r="0.7" fill="#FBCFE8" opacity="0.85" />
  </svg>
</template>

<style scoped>
.logo-mark {
  display: block;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
}
</style>
