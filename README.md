
# 🚀 Mint Share

**Mint Share** is a VS Code extension that makes sharing code and files with your developer friends effortless. Whether you're collaborating on a project or just want to show off a snippet, Mint gives you secure, real-time sharing powered by Supabase and Firebase.

---

## ✨ Features

- 📤 Share **code snippets** or **files** directly from VS Code
- 🧑‍🤝‍🧑 Share with friends or post to your public/developer feed
- 🔐 Secure login using your Mint account (credentials stored safely)
- 📡 Real-time notifications when friends send you code
- 📱 Generate QR codes for mobile access (e.g. `mintv2://snippet?id=...`)
- 🕒 Snippet expiration options: 1 hour, 24 hours, 7 days, or permanent
- 🔒 Visibility control: Public / Private / Friends-only

---

## 🛠️ Getting Started

### 1. Install the Extension

Search for `Mint Share` in the [VS Code Marketplace](https://marketplace.visualstudio.com/) or install via `.vsix`.

```bash
vsce install mint-share-0.0.1.vsix
```

### 2. Login to Mint

First-time users will be prompted to enter their Mint email and password. Your credentials are securely stored using VS Code's secret storage.

---

## 🧪 Usage

### 📌 Share Code Snippet

1. Select some code in the editor
2. Right-click → **"Mint Share: Share Code with Friend"**
3. Choose between:
   - **Friend**: Share privately
   - **Feed**: Post publicly with expiration & visibility settings

### 📎 Share a File

Right-click any file in the Explorer → **"Mint-Share: Share a file in explorer"**

Or use the command palette:

```
Cmd/Ctrl + Shift + P → Mint-Share: Share a File
```

### 🔔 Receive Code

If a friend sends you a code snippet, you’ll get a **notification directly in VS Code** (no extension reload needed).

---

## 🧼 Logout

```bash
Cmd/Ctrl + Shift + P → Mint-share: Logout
```

This clears your credentials from local storage and signs you out securely.

---

## 💡 Example Snippet Sharing

Your friend scans the QR code or opens the Mint app using the deep link:

```
mintv2://snippet?id=abc123
```

---

## 🔒 Security

- Your email and password are stored using VS Code’s [Secret Storage API](https://code.visualstudio.com/api/references/vscode-api#SecretStorage)
- Firebase Auth and Supabase APIs are used for secure authentication and data handling
- Files are uploaded via signed URLs and access is managed with user-based rules

---

## 🧑‍💻 Developer Info

This extension is written in TypeScript using:
- Firebase SDK
- Supabase SDK
- Esbuild for bundling
- VS Code Extension API

---

## 📌 Known Limitations

- You must be logged in to Mint to use any sharing features
- Real-time notifications require a stable internet connection
- QR code sharing requires a valid mobile app handler installed for `mintv2://`

---

## 📮 Feedback & Issues

Have suggestions, feature requests, or found a bug?

👉 [Open an issue](https://github.com/anumulamadhava2005/vscode_extension/issues)

---

## 📃 License

MIT © [mint1729](https://github.com/anumulamadhava2005)

> Made with 💚 for developers who love to share

D0mkERScQ1fN04Y0gdE1mwbJd08874vLaT4Dbt3FOzD8jFanLL9kJQQJ99BGACAAAAAAAAAAAAASAZDO2oLD
