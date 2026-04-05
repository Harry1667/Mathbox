# 📝 Formula Architect - 工程公式計算機

![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwind-css)

> **專為工程師與學生設計的互動式公式管理與計算平台。**
> 
> 這是一個純前端、本地優先 (Local-First) 的「工程公式與定理速查儀表板與計算器」。解決理工科系學生死記公式、解決複雜方程與單位轉換的痛點。

---

## ✨ 核心亮點 (Core Features)

### 1. 🚀 高品質 LaTeX 公式渲染
- 使用 **KaTeX** 引擎，提供學術級的 LaTeX 數學公式呈現風格。
- 支援複雜的數學符號、分式、根號以及矩陣運算。

### 2. 🧮 符號運算與智能求解
- 整合 **mathjs** 與 **nerdamer** 運算引擎。
- **留空求解**：在公式中填入已知數值並保留一個目標變數為空，系統自動解出該變數的值。
- 支援符號代數求解，而不僅僅是數值代入。

### 3. 📦 自訂公式庫與備份
- **動態解析**：新增公式時自動偵測 LaTeX 中的變數，自動生成輸入框。
- **分類管理**：支援多層級資料夾與學科分類（如：微積分、電磁學、電子學）。
- **資料安全**：支援將公式庫匯出為 JSON 檔案備份，並隨時還原。

### 4. 🎨 極簡奢華的 UI/UX
- **深淺色模式**：基於 Tailwind CSS 4 的自適應介面，保護長時間開發的視力。
- **微動畫回饋**：使用 Framer Motion 打造平滑的卡片展開與切換效果。
- **全局搜尋**：即時過濾標題、描述或 LaTeX 代碼。

---

## 🛠️ 技術堆疊 (Tech Stack)

| 分類 | 技術 |
| :--- | :--- |
| **框架** | [React 19](https://react.dev/) + TypeScript |
| **建構工具** | [Vite 6](https://vitejs.dev/) |
| **樣式** | [Tailwind CSS 4](https://tailwindcss.com/) |
| **動畫** | [Framer Motion](https://www.framer.com/motion/) |
| **數學渲染** | [KaTeX](https://katex.org/) |
| **數學引擎** | [mathjs](https://mathjs.org/) + [nerdamer](https://nerdamer.com/) |
| **圖標** | [Lucide React](https://lucide.dev/) |

---

## 📂 項目結構 (Project Structure)

```text
Formula-Architect/
├── 01-dev/            # 開發文檔、需求書與運行指令
├── 02-web/            # 主要 Web 應用源碼
│   ├── src/           # React 組件與邏輯
│   ├── public/        # 靜態資源
│   └── index.html     # 入口文件
├── .gitignore         # Git 忽略配置
└── README.md          # 專案說明書 (您正在閱讀)
```

---

## 🚀 快速上手 (Getting Started)

### 前置要求
- [Node.js](https://nodejs.org/) (建議 v18 以上)
- npm 或 yarn

### 安裝與啟動

1. **進入 Web 目錄**
   ```bash
   cd 02-web
   ```

2. **安裝依賴**
   ```bash
   npm install
   ```

3. **啟動開發伺服器**
   ```bash
   npm run dev
   ```

4. **打開瀏覽器**
   瀏覽 `http://localhost:5173` 即可看到應用。

---

## 📸 介面截圖 (Screenshots)

*(請在此處添加您的應用截圖，例如：)*
- **儀表板視圖**
- **公式展開計算模式**
- **深色模式對比**

---

## 📝 授權協議 (License)

本項目採用 [MIT License](LICENSE) 授權。

---

## 📞 聯絡與支援

如果您有任何問題、建議或發現 Bug，歡迎提交 Issue。
讓我們一起把這個工程計算神器做得更好！ 🚀
